import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../_utils/cors';
import { q } from '../_utils/db';
import { requireJwt } from '../_utils/jwt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(req, res);

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
    const user = requireJwt(req.headers.authorization);

    const qParam = String(req.query.q || '').trim();
    const cat = String(req.query.category || '').trim();
    const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
    const size = Math.min(Math.max(parseInt(String(req.query.pageSize || '24'), 10), 1), 100);
    const offset = (page - 1) * size;

    const conds: string[] = ['tenant_id = $1'];
    const vals: any[] = [user.tenant_id];
    let i = 2;

    if (qParam) {
      conds.push(`(name ILIKE $${i} OR sku ILIKE $${i} OR coalesce(description,'') ILIKE $${i})`);
      vals.push(`%${qParam}%`); i++;
    }
    if (cat) { conds.push(`category ILIKE $${i}`); vals.push(cat); i++; }

    vals.push(size, offset);
    const { rows } = await q(
      `SELECT id, sku, name, description, price_cents, category, image_url
         FROM products
        WHERE ${conds.join(' AND ')}
        ORDER BY name ASC
        LIMIT $${i} OFFSET $${i+1}`,
      vals
    );
    return res.status(200).json(rows);
  } catch (e: any) {
    const status = e?.message === 'unauthorized' ? 401 : 500;
    return res.status(status).json({ error: e?.message || 'server_error' });
  }
}
