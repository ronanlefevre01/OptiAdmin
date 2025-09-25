import jwt from 'jsonwebtoken';
const SECRET = process.env.JWT_SECRET || 'dev-secret';
export type AuthUser = { tenant_id: string; member_id: string; role?: string };
export const signJwt = (p: AuthUser, e='7d') => jwt.sign(p, SECRET, { expiresIn: e });
export function requireJwt(auth?: string): AuthUser {
  const t = (auth || '').startsWith('Bearer ') ? auth!.slice(7) : '';
  if (!t) throw new Error('unauthorized');
  return jwt.verify(t, SECRET) as AuthUser;
}
