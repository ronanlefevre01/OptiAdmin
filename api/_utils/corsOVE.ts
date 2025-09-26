// api/_utils/corsOVE.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const allowed = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function pickOrigin(req: VercelRequest) {
  const o = (req.headers.origin as string) || '';
  return allowed.includes(o) ? o : '';
}

export function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = pickOrigin(req);
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
}

export function handleOptions(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);
  res.status(204).end();
}

// ✅ Alias pour compatibilité avec l'ancien code
export { setCors as setCorsOVE, handleOptions as handleOptionsOVE };
