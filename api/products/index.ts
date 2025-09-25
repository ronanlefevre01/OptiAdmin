import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors as setCorsOVE, handleOptions as handleOptionsOVE } from '../_utils/corsOVE';
import { q } from '../_utils/dbOVE';
import { requireJwt } from '../_utils/jwtOVE';

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price_cents: number;
  category: string | null;
  image_url: string | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Préflight CORS
  if (req.method === 'OPTIONS') return handleOptionsOVE(req, res);
  setCorsOVE(req, res);

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    // JWT obligatoire
    const user = requireJwt(req.headers.authorization);

    // Query params
    const qParam = (req.query.q as string | undefined)?.trim() ?? '';
    const rawCat = (req.query.category as string | undefined)?.trim() ?? '';
    const cat = rawCat && rawCat.toLowerCase() !== 'all' ? rawCat : '';

    const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
    const size = Math.min(Math.max(parseInt(String(req.query.pageSize ?? '24'), 10) || 24, 1), 100);
    const offset = (page - 1) * size;

    // Conditions dynamiques
    const conds: string[] = ['tenant_id = $1'];
    const vals: any[] = [user.tenant_id];
    let i = 2;

    if (qParam) {
      conds.push(
        `(name ILIKE $${i} OR sku ILIKE $${i} OR COALESCE(description,'') ILIKE $${i})`
      );
      vals.push(`%${qParam}%`);
      i++;
    }
    if (cat) {
      conds.push(`category ILIKE $${i}`);
      vals.push(cat);
      i++;
    }

    // Requêtes (items + total) en parallèle
    const [items, countRows] = await Promise.all([
      q<Product>(
        `SELECT id, sku, name, description, price_cents, category, image_url
           FROM public.products
          WHERE ${conds.join(' AND ')}
          ORDER BY name ASC
          LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, size, offset]
      ),
      q<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM public.products
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
  } catch (e: any) {
    console.error('GET /api/products error:', e);
    const status = e?.message === 'unauthorized' ? 401 : 500;
    return res.status(status).json({ error: e?.message || 'server_error' });
  }
}
