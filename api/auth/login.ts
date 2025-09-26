// /api/auth/login.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsOVE as setCors, handleOptionsOVE as handleOptions } from '../_utils/corsOVE';
import { qOVE as q } from '../_utils/dbOVE';
import bcrypt from 'bcryptjs';
import { signJwtOVE } from '../_utils/jwtOVE';

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

    // 1) Vérifie le tenant
    const t = await q<{ id: string }>`
      SELECT id FROM public.tenants WHERE id = ${tenantId} LIMIT 1
    `;
    if (!t.length) return res.status(400).json({ error: 'unknown_tenant' });

    // 2) Récupère le membre actif
    const m = await q<Member>`
      SELECT id, tenant_id, email, name, role, enabled, password_hash
      FROM public.members
      WHERE tenant_id = ${tenantId}
        AND email = ${mail}
        AND enabled = true
      LIMIT 1
    `;
    const member = m[0];
    if (!member) return res.status(401).json({ error: 'invalid_credentials' });

    // 3) Vérifie le mot de passe
    const ok = await bcrypt.compare(pass, member.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    // 4) Signe le JWT avec OVE_JWT_SECRET (via util)
    const token = signJwtOVE(
      { member_id: member.id, tenant_id: member.tenant_id, role: member.role },
      '7d'
    );

    // (Optionnel) Cookie HttpOnly :
    // res.setHeader('Set-Cookie', `OVE_JWT=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60*60*24*7}`);

    return res.status(200).json({
      token, // côté front, stocke-le sous "OVE_JWT"
      member: { id: member.id, email: member.email, name: member.name, role: member.role },
    });
  } catch (e: any) {
    console.error('API /auth/login error:', e);
    const status = e?.message === 'ove_jwt_secret_missing' ? 500 : 500;
    return res.status(status).json({ error: e?.message || 'server_error' });
  }
}
