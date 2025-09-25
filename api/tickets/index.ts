import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../_utils/cors';
import { q } from '../_utils/db';
import { requireJwt } from '../_utils/jwt';

type TicketRow = {
  id: string;
  subject: string;
  status: string;
  order_id: string | null;
  created_at: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Préflight CORS
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(req, res);

  try {
    // JWT requis
    const user = requireJwt(req.headers.authorization);

    // -------------------------
    // GET /api/tickets?status=open|closed|...
    // -------------------------
    if (req.method === 'GET') {
      const statusFilter = String(req.query.status ?? '').trim().toLowerCase();

      const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
      const size = Math.min(Math.max(parseInt(String(req.query.pageSize ?? '50'), 10) || 50, 1), 100);
      const offset = (page - 1) * size;

      const conds: string[] = ['tenant_id = $1', 'member_id = $2'];
      const vals: any[] = [user.tenant_id, user.member_id];
      let i = 3;

      if (statusFilter) {
        conds.push(`LOWER(status) = $${i}`);
        vals.push(statusFilter);
        i++;
      }

      const [items, countRows] = await Promise.all([
        q<TicketRow>(
          `SELECT id, subject, status, order_id, created_at
             FROM public.tickets
            WHERE ${conds.join(' AND ')}
            ORDER BY created_at DESC
            LIMIT $${i} OFFSET $${i + 1}`,
          [...vals, size, offset]
        ),
        q<{ count: string }>(
          `SELECT COUNT(*)::text AS count
             FROM public.tickets
            WHERE ${conds.join(' AND ')}`,
          vals
        ),
      ]);

      const total = Number(countRows[0]?.count ?? 0);

      return res.status(200).json({
        page,
        pageSize: size,
        total,
        items,
      });
    }

    // -------------------------
    // POST /api/tickets
    // body: { orderId?, subject, message }
    // -------------------------
    if (req.method === 'POST') {
      const { orderId, subject, message } = (req.body ?? {}) as {
        orderId?: string;
        subject?: string;
        message?: string;
      };

      const cleanSubject = String(subject ?? '').trim().slice(0, 200);
      const cleanMessage = String(message ?? '').trim().slice(0, 5000);

      if (!cleanSubject || !cleanMessage) {
        return res.status(400).json({ error: 'missing_fields' });
      }

      // Si un orderId est fourni, vérifier qu'il appartient au même tenant & membre
      if (orderId) {
        const exists = await q<{ id: string }>(
          `SELECT id
             FROM public.orders
            WHERE id = $1 AND tenant_id = $2 AND member_id = $3
            LIMIT 1`,
          [orderId, user.tenant_id, user.member_id]
        );
        if (!exists.length) {
          return res.status(404).json({ error: 'order_not_found' });
        }
      }

      // Créer le ticket
      const created = await q<{ id: string }>(
        `INSERT INTO public.tickets (tenant_id, member_id, order_id, subject, status)
         VALUES ($1, $2, $3, $4, 'open')
         RETURNING id`,
        [user.tenant_id, user.member_id, orderId || null, cleanSubject]
      );

      const ticketId = created[0]?.id;

      // (Optionnel) insérer le premier message si tu as une table tickets_messages
      // await q(
      //   `INSERT INTO public.tickets_messages (ticket_id, member_id, author_role, body)
      //     VALUES ($1, $2, 'client', $3)`,
      //   [ticketId, user.member_id, cleanMessage]
      // );

      return res.status(201).json({ id: ticketId });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e: any) {
    console.error('API /tickets error:', e);
    const status = e?.message === 'unauthorized' ? 401 : 500;
    return res.status(status).json({ error: e?.message || 'server_error' });
  }
}
