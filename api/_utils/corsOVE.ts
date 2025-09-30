// api/_utils/corsOVE.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

function getAllowList() {
  // Liste config via env (séparée par des virgules), sinon valeurs par défaut
  const fromEnv = (process.env.OVE_CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length
    ? fromEnv
    : [
        "http://localhost:5173",
        "https://localhost:5173",
        // ajoute ton domaine front si besoin :
        "https://ove-site.vercel.app",
      ];
}

export function setCorsOVE(req: VercelRequest, res: VercelResponse) {
  const origin = String(req.headers.origin || "");
  const allowList = getAllowList();

  // Avec credentials, on doit renvoyer l'origine exacte (pas '*')
  if (origin && (allowList.includes(origin) || allowList.includes("*"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,PUT,DELETE,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Admin-Key, X-Tenant-Id"
  );
}

export function handleOptionsOVE(req: VercelRequest, res: VercelResponse) {
  setCorsOVE(req, res);
  // Réponse vide OK pour le pré-vol
  res.status(204).end();
}
