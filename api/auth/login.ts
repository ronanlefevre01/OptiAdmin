import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, handleOptions } from '../_utils/cors';
import { q } from '../_utils/db';
import { signJwt } from '../_utils/jwt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(req, res);

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const { email, password } = req.body || {};
    if (!email) return res.status(400).json({ error: 'missing_email' });

    // 🔐 DEV simplifié : cherche le membre par email, ignore password
    const { rows } = await q<{ id: string; tenant_id: string }>(
      `SELECT id, tenant_id FROM members WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'invalid_credentials' });

    const member = rows[0];
    const token = signJwt({ tenant_id: member.tenant_id, member_id: member.id });

    return res.status(200).json({ token });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'server_error' });
  }
}
