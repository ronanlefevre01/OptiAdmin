// api/_utils/corsOVE.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const parseOrigins = () =>
  (process.env.OVE_ALLOWED_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

export function setCorsOVE(req: VercelRequest, res: VercelResponse) {
  const allowed = parseOrigins();
  const origin = String(req.headers.origin || "");
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  // en dernier recours, ne mets surtout pas '*'
  // laisse vide si l'origin n'est pas whitelisted
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
}

export function handleOptionsOVE(req: VercelRequest, res: VercelResponse) {
  setCorsOVE(req, res);
  // pas de body, pas de cache
  res.status(204).end();
}
