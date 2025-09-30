// api/site-ove/tickets/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsOVE as setCors, handleOptionsOVE as handleOptions } from '../../_utils/corsOVE';
import { qOVE as q } from '../../_utils/dbOVE';
import { requireJwtFromReq } from '../../_utils/jwtOVE';

type TicketRow = {
  id: string;
  subject: string;
  status: string;
  order_id: string | null;
  created_at: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(req, res);

  try {
    // ✅ JWT depuis cookie OVE_SESSION ou Authorization: Bearer
    const user = requireJwtFromReq(req);

    // ---------- GET /api/site-ove/tickets?status=... ----------
    if (req.method === 'GET') {
      const statusFilter = String(req.query.status ?? '').trim().toLowerCase();

      const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
      const size = Math.min(Math.max(parseInt(String(req.query.pageSize ?? '50'), 10) || 50, 1), 100);
      const offset = (page - 1) * size;

      let items: TicketRow[];
      let countRows: { count: string }[];

      if (statusFilter) {
        items = (await q`
          SELECT id, subject, status, order_id, created_at
          FROM public.tickets
          WHERE tenant_id = ${user.tenant_id}
            AND member_id = ${user.member_id}
            AND LOWER(status) = ${statusFilter}
          ORDER BY created_at DESC
          LIMIT ${size} OFFSET ${offset}
        `) as TicketRow[];

        countRows = (await q`
          SELECT COUNT(*)::text AS count
          FROM public.tickets
          WHERE tenant_id = ${user.tenant_id}
            AND member_id = ${user.member_id}
            AND LOWER(status) = ${statusFilter}
        `) as { count: string }[];
      } else {
        items = (await q`
          SELECT id, subject, status, order_id, created_at
          FROM public.tickets
          WHERE tenant_id = ${user.tenant_id}
            AND member_id = ${user.member_id}
          ORDER BY created_at DESC
          LIMIT ${size} OFFSET ${offset}
        `) as TicketRow[];

        countRows = (await q`
          SELECT COUNT(*)::text AS count
          FROM public.tickets
          WHERE tenant_id = ${user.tenant_id}
            AND member_id = ${user.member_id}
        `) as { count: string }[];
      }

      const total = Number(countRows[0]?.count ?? 0);
      return res.status(200).json({ page, pageSize: size, total, items });
    }

    // ---------- POST /api/site-ove/tickets (body: { orderId?, subject, message }) ----------
    if (req.method === 'POST') {
      const { orderId, subject, message } = (req.body ?? {}) as {
        orderId?: string;
        subject?: string;
        message?: string;
      };

      const cleanSubject = String(subject ?? '').trim().slice(0, 200);
      const cleanMessage = String(message ?? '').trim().slice(0, 5000);
      if (!cleanSubject || !cleanMessage) return res.status(400).json({ error: 'missing_fields' });

      if (orderId) {
        const exists = (await q`
          SELECT id
          FROM public.orders
          WHERE id = ${orderId}
            AND tenant_id = ${user.tenant_id}
            AND member_id = ${user.member_id}
          LIMIT 1
        `) as { id: string }[];
        if (!exists.length) return res.status(404).json({ error: 'order_not_found' });
      }

      const created = (await q`
        INSERT INTO public.tickets (tenant_id, member_id, order_id, subject, status)
        VALUES (${user.tenant_id}, ${user.member_id}, ${orderId || null}, ${cleanSubject}, 'open')
        RETURNING id
      `) as { id: string }[];

      const ticketId = created[0]?.id;

      // // Optionnel, si tu as la table tickets_messages :
      // await q`
      //   INSERT INTO public.tickets_messages (ticket_id, member_id, author_role, body)
      //   VALUES (${ticketId}, ${user.member_id}, 'client', ${cleanMessage})
      // `;

      return res.status(201).json({ id: ticketId });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e: any) {
    console.error('API /site-ove/tickets error:', e);
    const status = e?.message === 'unauthorized' ? 401 : 500;
    return res.status(status).json({ error: e?.message || 'server_error' });
  }
}
