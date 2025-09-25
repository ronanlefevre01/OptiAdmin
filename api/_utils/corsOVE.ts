import type { VercelRequest, VercelResponse } from '@vercel/node';

export function setCorsOVE(req: VercelRequest, res: VercelResponse) {
  const origins = (process.env.OVE_ALLOWED_ORIGINS || '*')
    .split(',')
    .map(s => s.trim());
  const origin = req.headers.origin || '';
  const allowed =
    origins.includes('*') || origins.includes(origin) ? origin || '*' : origins[0] || '*';

  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
}

export function handleOptionsOVE(_req: VercelRequest, res: VercelResponse) {
  res.status(204).end();
}
