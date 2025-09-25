import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsOVE, handleOptionsOVE } from '../../_utils/corsOVE';
import { qOVE } from '../../_utils/dbOVE';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return handleOptionsOVE(req, res);
  setCorsOVE(req, res);
  try {
    const meta = await qOVE<{ db: string; usr: string; now: string }>(
      `select current_database() as db, current_user as usr, now()::text as now`
    );
    const tenants = await qOVE<{ id: string; name: string; created_at: string }>(
      `select id, name, created_at from public.tenants order by created_at desc limit 5`
    );
    res.status(200).json({
      uses: 'OVE stack',
      OVE_DATABASE_URL_starts: (process.env.OVE_DATABASE_URL || '').slice(0, 36) + '…',
      meta: meta[0],
      tenants,
    });
  } catch (e: any) {
    res.status(500).json({ error: 'ove_debug_failed', detail: String(e?.message || e) });
  }
}
