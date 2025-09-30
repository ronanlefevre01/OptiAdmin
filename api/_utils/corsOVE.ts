// api/_utils/corsOVE.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const parseOrigins = () =>
  String(process.env.OVE_CORS_ORIGINS || '')
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(Boolean);

export function setCorsOVE(req: VercelRequest, res: VercelResponse) {
  const allowList = parseOrigins();
  const origin = String(req.headers.origin || '');

  if (origin && allowList.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin); // pas '*'
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key, X-Tenant-Id');
}

export function handleOptionsOVE(req: VercelRequest, res: VercelResponse) {
  setCorsOVE(req, res);
  res.status(204).end();
}
