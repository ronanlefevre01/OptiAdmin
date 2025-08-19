// api/trial-requests.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const JSONBIN_BASE = 'https://api.jsonbin.io/v3';
const BIN_ID  = process.env.JSONBIN_TRIAL_BIN_ID || '';
const MASTER  = process.env.JSONBIN_MASTER_KEY || '';
const ALLOWED = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '';
  const host   = (req.headers.host as string) || '';
  const sameOrigin = !origin || origin === `https://${host}` || origin === `http://${host}`;
  const allowed = sameOrigin || ALLOWED.includes(origin);

  // CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (allowed) {
    // Reflète l’origine (meilleure pratique que '*')
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  }
  return { allowed };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { allowed } = setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!allowed) return res.status(403).json({ error: 'Origin not allowed' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { storeName, siret, phone, email, alias, source } = (req.body || {});
  if (!storeName || !siret || !phone || !email || !alias) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const entry = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    storeName, siret, phone, email, alias,
    source: source || 'email-essai',
    createdAt: new Date().toISOString(),
  };

  // Fallback: si JSONBin n’est pas configuré, on log et on répond OK (évite le 500)
  if (!BIN_ID || !MASTER) {
    console.log('[trial-request:FALLBACK]', entry);
    return res.status(200).json({ ok: true, stored: 'logs' });
  }

  try {
    // 1) Lire le bin
    const rGet = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': MASTER, 'X-Bin-Meta': 'false' },
      cache: 'no-store',
    });
    if (!rGet.ok) {
      const t = await rGet.text().catch(() => '');
      throw new Error(`JSONBin GET ${rGet.status} ${t}`);
    }
    const current = await rGet.json();

    // 2) Supporte {requests:[]} OU []
    const list: any[] = Array.isArray(current)
      ? current
      : Array.isArray(current?.requests)
      ? current.requests
      : [];

    const newList = [entry, ...list].slice(0, 1000);
    const body = Array.isArray(current) ? newList : { requests: newList };

    // 3) Écrire
    const rPut = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER },
      body: JSON.stringify(body),
    });
    if (!rPut.ok) {
      const t = await rPut.text().catch(() => '');
      throw new Error(`JSONBin PUT ${rPut.status} ${t}`);
    }

    return res.status(200).json({ ok: true, stored: 'jsonbin' });
  } catch (e: any) {
    console.error('trial-requests error:', e?.message || e);
    return res.status(500).json({ error: 'Persist failed' }); // pas d’infos sensibles côté client
  }
}
