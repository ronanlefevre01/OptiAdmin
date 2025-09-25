import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsOVE as setCors, handleOptionsOVE as handleOptions } from '../_utils/corsOVE';
import { qOVE as q } from '../_utils/dbOVE';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

type Member = {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  role: 'client' | 'admin' | 'demo';
  enabled: boolean;
  password_hash: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(req, res);

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

    const { email, password, tenant_id } = (req.body ?? {}) as {
      email?: string;
      password?: string;
      tenant_id?: string;
    };

    const tenantId = String(tenant_id || process.env.OVE_TENANT_ID || '').trim();
    const mail = String(email ?? '').trim().toLowerCase();
    const pass = String(password ?? '');

    if (!tenantId || !mail || !pass) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    // Vérifie le tenant
    const t = await q<{ id: string }>(
      `SELECT id FROM public.tenants WHERE id = $1 LIMIT 1`,
      [tenantId]
    );
    if (!t.length) return res.status(400).json({ error: 'unknown_tenant' });

    // Récupère le membre
    const m = await q<Member>(
      `SELECT id, tenant_id, email, name, role, enabled, password_hash
         FROM public.members
        WHERE tenant_id = $1 AND email = LOWER($2) AND enabled = true
        LIMIT 1`,
      [tenantId, mail]
    );
    const member = m[0];
    if (!member) return res.status(401).json({ error: 'invalid_credentials' });

    const ok = await bcrypt.compare(pass, member.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'jwt_secret_missing' });

    const token = jwt.sign(
      {
        member_id: member.id,
        tenant_id: member.tenant_id,
        role: member.role,
      },
      secret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({ token });
  } catch (e: any) {
    console.error('API /auth/login error:', e);
    return res.status(500).json({ error: e?.message || 'server_error' });
  }
}
