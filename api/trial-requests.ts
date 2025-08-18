// /api/trial-requests.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'https://opticom-web.vercel.app',       // là où est servi ton essai.html
  'http://localhost:5173',                // utile en dev local
  // ajoute ici ton domaine custom si besoin, ex:
  // 'https://www.mon-domaine.fr'
];

function setCors(res: VercelResponse, origin: string) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin'); // pour éviter les caches foireux
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24h
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = String(req.headers.origin || '');
  const allow = ALLOWED_ORIGINS.includes(origin);

  // 1) Préflight (OPTIONS) — doit répondre SANS corps avec les bons headers
  if (req.method === 'OPTIONS') {
    if (allow) setCors(res, origin);
    return res.status(204).end();
  }

  // 2) Bloque les origines non autorisées
  if (!allow) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' });
  }

  // 3) CORS pour la vraie réponse
  setCors(res, origin);

  try {
    const { storeName, siret, phone, email, alias, source } = req.body || {};
    if (!storeName || !siret || !phone || !email || !alias) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }

    // === TODO: Traiter la demande ===
    // Exemple minimal : log + TODO persistance
    console.log('Trial request:', { storeName, siret, phone, email, alias, source });

    // Ici tu peux: créer une entrée JSONBin, envoyer un mail, pousser dans ta DB, etc.

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
