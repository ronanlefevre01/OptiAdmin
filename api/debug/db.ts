import type { VercelRequest, VercelResponse } from '@vercel/node';
import { q } from '../_utils/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const info = await q<{ db: string; usr: string; sch: string }>(
      `select current_database() as db, current_user as usr, current_schema() as sch`
    );
    const tenants = await q<{ id: string; name: string; created_at: string }>(
      `select id, name, created_at from public.tenants order by created_at desc limit 5`
    );
    return res.status(200).json({
      db: info.rows[0],
      // on masque le password si tu veux vérifier l'URL utilisée
      urlUsed: process.env.NEON_DATABASE_URL?.replace(/:\/\/.*@/, '://***@'),
      tenants: tenants.rows,
    });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
