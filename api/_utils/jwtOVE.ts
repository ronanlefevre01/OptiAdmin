import jwt from 'jsonwebtoken';
import type { VercelRequest } from '@vercel/node';

export type OVEClaims = { member_id: string; tenant_id: string; role: string };

function readCookie(req: VercelRequest, name: string) {
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}
function getBearer(auth?: string | null) {
  if (!auth) return '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
}

export function signJwtOVE(payload: OVEClaims) {
  const secret = process.env.OVE_JWT_SECRET;
  if (!secret) throw new Error('ove_jwt_secret_missing');
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function requireJwtFromReq(req: VercelRequest): OVEClaims {
  const secret = process.env.OVE_JWT_SECRET;
  if (!secret) throw new Error('ove_jwt_secret_missing');

  // 1) Cookie HttpOnly (recommandé)
  const cookieToken = readCookie(req, 'OVE_SESSION');
  // 2) Ou Authorization: Bearer ...
  const bearerToken = getBearer(req.headers.authorization);

  const token = cookieToken || bearerToken;
  if (!token) throw new Error('unauthorized');

  return jwt.verify(token, secret) as OVEClaims;
}

/** Bypass admin pour tester: X-Admin-Key + X-Tenant-Id */
export function requireUserOrAdmin(req: VercelRequest): OVEClaims {
  const adminKey = String(req.headers['x-admin-key'] || '');
  if (adminKey && adminKey === process.env.OVE_ADMIN_KEY) {
    const tenant = String(req.headers['x-tenant-id'] || process.env.OVE_TENANT_ID || '');
    if (!tenant) throw new Error('tenant_missing');
    return { member_id: 'admin-bypass', tenant_id: tenant, role: 'admin' };
  }
  return requireJwtFromReq(req);
}
