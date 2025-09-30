import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsOVE as setCors, handleOptionsOVE as handleOptions } from '../_utils/corsOVE';
import { qOVE as q } from '../_utils/dbOVE';
import { requireJwtOVE as requireJwt } from '../_utils/jwtOVE';

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
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(req, res);

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

    // JWT obligatoire
    const user = requireJwt(req.headers.authorization as string);

    // Query params
    const qParam = (req.query.q as string | undefined)?.trim() ?? '';
    const rawCat = (req.query.category as string | undefined)?.trim() ?? '';
    const cat = rawCat && rawCat.toLowerCase() !== 'all' ? rawCat : '';

    const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
    const size = Math.min(Math.max(parseInt(String(req.query.pageSize ?? '24'), 10) || 24, 1), 100);
    const offset = (page - 1) * size;

    const likeQ = `%${qParam}%`;

    let items: Product[];
    let countRows: { count: string }[];

    if (qParam && cat) {
      // q + category
      items = await q`
        SELECT id, sku, name, description, price_cents, category, image_url
        FROM public.products
        WHERE tenant_id = ${user.tenant_id}
          AND (name ILIKE ${likeQ} OR sku ILIKE ${likeQ} OR COALESCE(description,'') ILIKE ${likeQ})
          AND category ILIKE ${cat}
        ORDER BY name ASC
        LIMIT ${size} OFFSET ${offset}
      ` as Product[];

      countRows = await q`
        SELECT COUNT(*)::text AS count
        FROM public.products
        WHERE tenant_id = ${user.tenant_id}
          AND (name ILIKE ${likeQ} OR sku ILIKE ${likeQ} OR COALESCE(description,'') ILIKE ${likeQ})
          AND category ILIKE ${cat}
      ` as { count: string }[];
    } else if (qParam && !cat) {
      // q seul
      items = await q`
        SELECT id, sku, name, description, price_cents, category, image_url
        FROM public.products
        WHERE tenant_id = ${user.tenant_id}
          AND (name ILIKE ${likeQ} OR sku ILIKE ${likeQ} OR COALESCE(description,'') ILIKE ${likeQ})
        ORDER BY name ASC
        LIMIT ${size} OFFSET ${offset}
      ` as Product[];

      countRows = await q`
        SELECT COUNT(*)::text AS count
        FROM public.products
        WHERE tenant_id = ${user.tenant_id}
          AND (name ILIKE ${likeQ} OR sku ILIKE ${likeQ} OR COALESCE(description,'') ILIKE ${likeQ})
      ` as { count: string }[];
    } else if (!qParam && cat) {
      // category seule
      items = await q`
        SELECT id, sku, name, description, price_cents, category, image_url
        FROM public.products
        WHERE tenant_id = ${user.tenant_id}
          AND category ILIKE ${cat}
        ORDER BY name ASC
        LIMIT ${size} OFFSET ${offset}
      ` as Product[];

      countRows = await q`
        SELECT COUNT(*)::text AS count
        FROM public.products
        WHERE tenant_id = ${user.tenant_id}
          AND category ILIKE ${cat}
      ` as { count: string }[];
    } else {
      // ni q ni category
      items = await q`
        SELECT id, sku, name, description, price_cents, category, image_url
        FROM public.products
        WHERE tenant_id = ${user.tenant_id}
        ORDER BY name ASC
        LIMIT ${size} OFFSET ${offset}
      ` as Product[];

      countRows = await q`
        SELECT COUNT(*)::text AS count
        FROM public.products
        WHERE tenant_id = ${user.tenant_id}
      ` as { count: string }[];
    }

    const total = Number(countRows[0]?.count ?? 0);
    return res.status(200).json({ page, pageSize: size, total, items });
  } catch (e: any) {
    console.error('GET /api/products error:', e);
    const status = e?.message === 'unauthorized' ? 401 : 500;
    return res.status(status).json({ error: e?.message || 'server_error' });
  }
}
