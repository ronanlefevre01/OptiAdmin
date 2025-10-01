// api/_utils/corsOVE.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEFAULT_ALLOWED = [
  "https://ove-site.vercel.app",
  "http://localhost:5173",
];

function getOrigin(req: VercelRequest) {
  const o = String(req.headers.origin || "");
  return o;
}

export function setCorsOVE(req: VercelRequest, res: VercelResponse) {
  const origin = getOrigin(req);
  const allowed = (process.env.OVE_CORS_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const list = allowed.length ? allowed : DEFAULT_ALLOWED;
  if (origin && list.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin); // ← origin exact (pas *)
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, content-type, x-admin-key, x-tenant-id"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
}

export function handleOptionsOVE(req: VercelRequest, res: VercelResponse) {
  setCorsOVE(req, res);
  res.status(204).end();
}
