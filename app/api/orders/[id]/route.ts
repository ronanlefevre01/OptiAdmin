import { NextRequest, NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    const id = params.id;

    const { rows: ord } = await q(
      `SELECT id, number, status, subtotal_cents, shipping_cents, total_cents, created_at
         FROM orders
        WHERE id = $1 AND tenant_id = $2 AND member_id = $3`,
      [id, user.tenant_id, user.member_id]
    );
    if (!ord[0]) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const { rows: items } = await q(
      `SELECT id, sku, name, qty, unit_price_cents, options
         FROM order_items WHERE order_id = $1`,
      [id]
    );

    return NextResponse.json({ ...ord[0], items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
