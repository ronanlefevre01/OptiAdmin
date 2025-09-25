import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { q } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const u = requireAuth(req);
    const { rows: allowed } = await q(
      `SELECT 1 FROM tickets WHERE id=$1 AND tenant_id=$2 AND member_id=$3`,
      [params.id, u.tenant_id, u.member_id]
    );
    if (!allowed[0]) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const { rows } = await q(
      `SELECT id, author_type, message, created_at
         FROM ticket_messages
        WHERE ticket_id = $1
        ORDER BY created_at ASC`,
      [params.id]
    );
    return NextResponse.json(rows);
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const u = requireAuth(req);
    const body = z.object({ message: z.string().min(1) }).parse(await req.json());

    const { rows: allowed } = await q(
      `SELECT 1 FROM tickets WHERE id=$1 AND tenant_id=$2 AND member_id=$3`,
      [params.id, u.tenant_id, u.member_id]
    );
    if (!allowed[0]) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await q(`INSERT INTO ticket_messages (ticket_id, author_type, message) VALUES ($1,'client',$2)`, [params.id, body.message]);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'bad_request' }, { status: 400 });
  }
}
