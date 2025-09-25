import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { q } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const u = requireAuth(req);
    const { rows } = await q(
      `SELECT id, subject, status, order_id, created_at
         FROM tickets
        WHERE tenant_id = $1 AND member_id = $2
        ORDER BY created_at DESC`,
      [u.tenant_id, u.member_id]
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const u = requireAuth(req);
    const schema = z.object({
      orderId: z.string().uuid().optional(),
      subject: z.string().min(3),
      message: z.string().min(1)
    });
    const { orderId, subject, message } = schema.parse(await req.json());

    const { rows: tRows } = await q(
      `INSERT INTO tickets (tenant_id, member_id, order_id, subject, status)
       VALUES ($1,$2,$3,$4,'open')
       RETURNING id, subject, status, created_at`,
      [u.tenant_id, u.member_id, orderId || null, subject]
    );
    const ticket = tRows[0];

    await q(`INSERT INTO ticket_messages (ticket_id, author_type, message) VALUES ($1,'client',$2)`, [ticket.id, message]);

    return NextResponse.json(ticket, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'bad_request' }, { status: 400 });
  }
}
