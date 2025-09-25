import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export type AuthUser = { tenant_id: string; member_id: string; role?: string };

export function signJwt(payload: AuthUser, expires = '7d') {
  return jwt.sign(payload, SECRET, { expiresIn: expires });
}

export function requireJwt(authHeader?: string): AuthUser {
  const token = (authHeader || '').startsWith('Bearer ') ? authHeader!.slice(7) : '';
  if (!token) throw new Error('unauthorized');
  return jwt.verify(token, SECRET) as AuthUser;
}
