import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export type AuthUser = { tenant_id: string; member_id: string; role?: string };

export function requireAuth(req: NextRequest): AuthUser {
  const hdr = req.headers.get('authorization') || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) throw new Error('unauthorized');
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
  } catch {
    throw new Error('invalid_token');
  }
}
