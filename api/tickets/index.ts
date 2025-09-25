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
        `SELECT id, subject, status, order_id, created_at
           FROM tickets
          WHERE tenant_id = $1 AND member_id = $2
          ORDER BY created_at DESC
          LIMIT 100`,
        [user.tenant_id, user.member_id]
      );
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { orderId, subject, message } = req.body || {};
      if (!subject || !message) return res.status(400).json({ error: 'missing_fields' });

      const { rows } = await q<{ id: string }>(
        `INSERT INTO tickets (tenant_id, member_id, order_id, subject, status)
         VALUES ($1,$2,$3,$4,'open') RETURNING id`,
        [user.tenant_id, user.member_id, orderId || null, subject]
      );
      // (optionnel) insérer message initial dans tickets_messages
      return res.status(201).json({ id: rows[0].id });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e: any) {
    const status = e?.message === 'unauthorized' ? 401 : 500;
    return res.status(status).json({ error: e?.message || 'server_error' });
  }
}
