import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsOVE as setCors, handleOptionsOVE as handleOptions } from '../../_utils/corsOVE';
import { qOVE as q } from '../../_utils/dbOVE';
import { requireJwtOVE as requireJwt } from '../../_utils/jwtOVE';

type OrderRow = {
  id: string;
  number: string;
  status: string;
  total_cents: number;
  created_at: string;
};

type NewItem = {
  productId?: string;
  sku?: string;
  name?: string;
  qty?: number;
  unitPriceCents?: number;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(req, res);

  try {
    // JWT (util OVE)
    const user = requireJwt(req.headers.authorization as string);

    // ---------- GET /api/orders ----------
    if (req.method === 'GET') {
      const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
      const size = Math.min(Math.max(parseInt(String(req.query.pageSize ?? '50'), 10) || 50, 1), 100);
      const offset = (page - 1) * size;

      const items = await q`
        SELECT id, number, status, total_cents, created_at
        FROM public.orders
        WHERE tenant_id = ${user.tenant_id} AND member_id = ${user.member_id}
        ORDER BY created_at DESC
        LIMIT ${size} OFFSET ${offset}
      ` as OrderRow[];

      const countRows = await q`
        SELECT COUNT(*)::text AS count
        FROM public.orders
        WHERE tenant_id = ${user.tenant_id} AND member_id = ${user.member_id}
      ` as { count: string }[];

      const total = Number(countRows[0]?.count ?? 0);
      return res.status(200).json({ page, pageSize: size, total, items });
    }

    // ---------- POST /api/orders ----------
    if (req.method === 'POST') {
      const body = (req.body ?? {}) as {
        items?: NewItem[];
        notes?: string;
        shippingCents?: number;
      };

      const items = Array.isArray(body.items) ? body.items : [];
      const notes = String(body.notes ?? '').slice(0, 2000);
      const shippingCents = Number.isFinite(body.shippingCents)
        ? Math.max(0, Math.trunc(Number(body.shippingCents)))
        : 0;

      if (!items.length) return res.status(400).json({ error: 'items_required' });

      // calcule total
      let itemsTotal = 0;
      for (const it of items) {
        const qty = Math.max(0, Math.trunc(Number(it.qty ?? 0)));
        const price = Math.max(0, Math.trunc(Number(it.unitPriceCents ?? 0)));
        if (!qty || !price) continue;
        itemsTotal += qty * price;
      }
      const total = itemsTotal + shippingCents;

      const inserted = await q`
        INSERT INTO public.orders (tenant_id, member_id, number, status, total_cents, notes)
        VALUES (${user.tenant_id}, ${user.member_id},
                concat('O', extract(epoch from now())::bigint),
                'pending', ${total}, ${notes})
        RETURNING id
      ` as { id: string }[];

      const orderId = inserted[0].id;
      return res.status(201).json({ id: orderId });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e: any) {
    console.error('API /orders error:', e);
    const status = e?.message === 'unauthorized' ? 401 : 500;
    return res.status(status).json({ error: e?.message || 'server_error' });
  }
}
