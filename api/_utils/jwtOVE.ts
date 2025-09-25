import jwt from 'jsonwebtoken';

const SECRET = process.env.OVE_JWT_SECRET || '';
export function signJwtOVE(payload: object) {
  if (!SECRET) throw new Error('unauthorized');
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}
export function requireJwtOVE(authorization?: string) {
  if (!SECRET) throw new Error('unauthorized');
  if (!authorization?.startsWith('Bearer ')) throw new Error('unauthorized');
  const token = authorization.slice('Bearer '.length);
  return jwt.verify(token, SECRET) as any;
}
