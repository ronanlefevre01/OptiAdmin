import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../_utils/cors';
import { q } from '../_utils/db';
import { requireJwt } from '../_utils/jwt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(req, res);

  try {
    const user = requireJwt(req.headers.authorization);

    if (req.method === 'GET') {
      const { rows } = await q(
        `SELECT id, number, status, total_cents, created_at
           FROM orders
          WHERE tenant_id = $1 AND member_id = $2
          ORDER BY created_at DESC
          LIMIT 100`,
        [user.tenant_id, user.member_id]
      );
      return res.status(200).json({ page: 1, pageSize: rows.length, items: rows });
    }

    if (req.method === 'POST') {
      const { items = [], notes = '', shippingCents = 0 } = req.body || {};
      const total = Number(items.reduce((a: number, it: any) => a + (it.unitPriceCents || 0) * (it.qty || 0), 0)) + Number(shippingCents || 0);

      const { rows } = await q<{ id: string }>(
        `INSERT INTO orders (tenant_id, member_id, number, status, total_cents, notes)
         VALUES ($1,$2, concat('O',extract(epoch from now())::bigint), 'pending', $3, $4)
         RETURNING id`,
        [user.tenant_id, user.member_id, total, notes]
      );
      const orderId = rows[0].id;

      // (optionnel) insérer les items si tu as une table orders_items
      return res.status(201).json({ id: orderId });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e: any) {
    const status = e?.message === 'unauthorized' ? 401 : 500;
    return res.status(status).json({ error: e?.message || 'server_error' });
  }
}
