import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { q } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

function computeTotals(items: any[], shippingCents = 0) {
  const subtotal = items.reduce((acc, it) => acc + (it.unitPriceCents || 0) * (it.qty || 0), 0);
  return { subtotal, total: subtotal + (shippingCents || 0) };
}

async function nextOrderNumber(tenantId: string) {
  const { rows } = await q<{ n: number }>(
    `SELECT COUNT(*)::int AS n
       FROM orders
      WHERE tenant_id = $1
        AND date_part('year', created_at) = date_part('year', now())`,
    [tenantId]
  );
  const n = (rows?.[0]?.n || 0) + 1;
  const year = new Date().getFullYear();
  return `OVE-${year}-${String(n).padStart(6, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const page = Math.max(parseInt(req.nextUrl.searchParams.get('page') || '1'), 1);
    const pageSize = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('pageSize') || '20'), 1), 100);
    const offset = (page - 1) * pageSize;

    const { rows } = await q(
      `SELECT id, number, status, total_cents, created_at
         FROM orders
        WHERE tenant_id = $1 AND member_id = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4`,
      [user.tenant_id, user.member_id, pageSize, offset]
    );

    return NextResponse.json({ page, pageSize, items: rows });
  } catch (e: any) {
    const msg = e?.message || 'server_error';
    return NextResponse.json({ error: msg }, { status: msg === 'unauthorized' || msg === 'invalid_token' ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);

    const schema = z.object({
      items: z.array(z.object({
        productId: z.string().uuid().optional().nullable(),
        sku: z.string().optional(),
        name: z.string().min(1),
        qty: z.number().int().positive(),
        unitPriceCents: z.number().int().nonnegative(),
        options: z.record(z.any()).optional()
      })).min(1),
      notes: z.string().max(5000).optional(),
      shippingCents: z.number().int().nonnegative().optional()
    });

    const body = await req.json();
    const { items, notes, shippingCents = 0 } = schema.parse(body);
    const { subtotal, total } = computeTotals(items, shippingCents);
    const number = await nextOrderNumber(user.tenant_id);

    const { rows: orderRows } = await q(
      `INSERT INTO orders
         (tenant_id, member_id, number, status, notes, subtotal_cents, shipping_cents, total_cents)
       VALUES ($1,$2,$3,'pending',$4,$5,$6,$7)
       RETURNING id, number, status, created_at`,
      [user.tenant_id, user.member_id, number, notes || null, subtotal, shippingCents, total]
    );
    const order = orderRows[0];

    // lignes
    const values: any[] = [];
    const placeholders: string[] = [];
    items.forEach((it: any, i: number) => {
      const idx = i * 7;
      values.push(order.id, it.productId || null, it.sku || null, it.name, it.qty, it.unitPriceCents, JSON.stringify(it.options || {}));
      placeholders.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7})`);
    });
    await q(
      `INSERT INTO order_items
         (order_id, product_id, sku, name, qty, unit_price_cents, options)
       VALUES ${placeholders.join(',')}`,
      values
    );

    return NextResponse.json(order, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'bad_request' }, { status: 400 });
  }
}
