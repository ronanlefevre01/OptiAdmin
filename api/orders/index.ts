import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../_utils/cors';
import { q } from '../_utils/db';
import { requireJwt } from '../_utils/jwt';

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
  // Préflight CORS
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(req, res);

  try {
    // JWT requis
    const user = requireJwt(req.headers.authorization);

    // -------------------------
    // GET /api/orders
    // -------------------------
    if (req.method === 'GET') {
      const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
      const size = Math.min(
        Math.max(parseInt(String(req.query.pageSize ?? '50'), 10) || 50, 1),
        100
      );
      const offset = (page - 1) * size;

      const [itemsRes, countRes] = await Promise.all([
        q<OrderRow>(
          `SELECT id, number, status, total_cents, created_at
             FROM orders
            WHERE tenant_id = $1 AND member_id = $2
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4`,
          [user.tenant_id, user.member_id, size, offset]
        ),
        q<{ count: string }>(
          `SELECT COUNT(*)::text AS count
             FROM orders
            WHERE tenant_id = $1 AND member_id = $2`,
          [user.tenant_id, user.member_id]
        ),
      ]);

      const total = Number(countRes.rows?.[0]?.count ?? 0);

      return res.status(200).json({
        page,
        pageSize: size,
        total,
        items: itemsRes.rows,
      });
    }

    // -------------------------
    // POST /api/orders
    // body: { items: [{productId?, sku?, name?, qty, unitPriceCents}], notes?, shippingCents? }
    // -------------------------
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

      if (!items.length) {
        return res.status(400).json({ error: 'items_required' });
      }

      // petite validation des items + total
      let itemsTotal = 0;
      for (const it of items) {
        const qty = Math.max(0, Math.trunc(Number(it.qty ?? 0)));
        const price = Math.max(0, Math.trunc(Number(it.unitPriceCents ?? 0)));
        if (!qty || !price) continue;
        itemsTotal += qty * price;
      }
      const total = itemsTotal + shippingCents;

      // créer la commande
      const created = await q<{ id: string }>(
        `INSERT INTO orders (tenant_id, member_id, number, status, total_cents, notes)
         VALUES ($1, $2, concat('O', extract(epoch from now())::bigint), 'pending', $3, $4)
         RETURNING id`,
        [user.tenant_id, user.member_id, total, notes]
      );
      const orderId = created.rows[0].id;

      // (optionnel) si tu as une table orders_items, insère-les ici.
      // Exemple (à activer si la table existe avec ces colonnes) :
      //
      // const validItems = items
      //   .map(it => ({
      //     product_id: it.productId ?? null,
      //     sku: (it.sku ?? '').slice(0, 128),
      //     name: (it.name ?? '').slice(0, 256),
      //     qty: Math.max(0, Math.trunc(Number(it.qty ?? 0))),
      //     unit_price_cents: Math.max(0, Math.trunc(Number(it.unitPriceCents ?? 0))),
      //   }))
      //   .filter(it => it.qty > 0 && it.unit_price_cents > 0);
      //
      // if (validItems.length) {
      //   // selon ton driver Neon, tu peux insérer en boucle ou via UNNEST
      //   for (const it of validItems) {
      //     await q(
      //       `INSERT INTO orders_items (order_id, product_id, sku, name, qty, unit_price_cents)
      //         VALUES ($1, $2, $3, $4, $5, $6)`,
      //       [orderId, it.product_id, it.sku, it.name, it.qty, it.unit_price_cents]
      //     );
      //   }
      // }

      return res.status(201).json({ id: orderId });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e: any) {
    console.error('API /orders error:', e);
    const status = e?.message === 'unauthorized' ? 401 : 500;
    return res.status(status).json({ error: e?.message || 'server_error' });
  }
}
