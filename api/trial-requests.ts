// api/trial-requests.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

function cors(res: VercelResponse, origin: string | undefined) {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const isAllowed =
    !allowed.length ||
    (origin ? allowed.includes(origin) : false);

  res.setHeader('Access-Control-Allow-Origin', isAllowed ? (origin || '*') : 'null');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS,GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return isAllowed;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '';
  const isAllowed = cors(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // ---- DIAGNOSTIC (GET /api/trial-requests?diag=1) ----
  if (req.method === 'GET' && (req.query.diag || req.query.ping)) {
    const BIN_ID =
      process.env.JSONBIN_TRIAL_BIN_ID || process.env.VITE_JSONBIN_TRIAL_BIN_ID || '';
    const MASTER_KEY =
      process.env.JSONBIN_MASTER_KEY || process.env.VITE_JSONBIN_MASTER_KEY || '';
    const BASE =
      process.env.JSONBIN_BASE || process.env.VITE_JSONBIN_BASE || 'https://api.jsonbin.io/v3';

    return res.json({
      ok: true,
      note: 'Ce endpoint est juste pour diagnostiquer la présence des variables.',
      hasBinId: BIN_ID.length > 0,
      hasMasterKey: MASTER_KEY.length > 0,
      base: BASE,
      allowedOriginsRaw: process.env.ALLOWED_ORIGINS || '',
      isOriginAllowed: isAllowed,
      seenOrigin: origin || null,
      envNamesChecked: {
        BIN_ID: ['JSONBIN_TRIAL_BIN_ID', 'VITE_JSONBIN_TRIAL_BIN_ID'],
        MASTER_KEY: ['JSONBIN_MASTER_KEY', 'VITE_JSONBIN_MASTER_KEY'],
        BASE: ['JSONBIN_BASE', 'VITE_JSONBIN_BASE']
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!isAllowed) {
    return res.status(403).json({ ok: false, error: 'origin_not_allowed', origin });
  }

  // ---- Récup ENV (tolérant aux 2 noms) ----
  const BIN_ID =
    process.env.JSONBIN_TRIAL_BIN_ID || process.env.VITE_JSONBIN_TRIAL_BIN_ID || '';
  const MASTER_KEY =
    process.env.JSONBIN_MASTER_KEY || process.env.VITE_JSONBIN_MASTER_KEY || '';
  const BASE =
    process.env.JSONBIN_BASE || process.env.VITE_JSONBIN_BASE || 'https://api.jsonbin.io/v3';

  if (!BIN_ID || !MASTER_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'env_missing',
      missing: {
        binId: !BIN_ID,
        masterKey: !MASTER_KEY,
      },
      hint: 'Vérifie les variables: JSONBIN_TRIAL_BIN_ID, JSONBIN_MASTER_KEY (ou leurs variantes VITE_*)',
    });
  }

  // ---- Corps de la requête ----
  let body: any = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid_json' });
  }

  const payload = {
    createdAt: new Date().toISOString(),
    ...body,
  };

  // ---- Écriture JSONBin ----
  try {
    const url = `${BASE}/b/${encodeURIComponent(BIN_ID)}`;
    const r = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY,
        'X-Bin-Versioning': 'false',
      },
      body: JSON.stringify((prev: any) => prev), // ignoré par fetch natif, on reconstruit juste un body
    });

    // On doit d’abord GET le record courant, puis y ajouter la demande, puis PUT
    const getR = await fetch(`${BASE}/b/${encodeURIComponent(BIN_ID)}/latest`, {
      headers: { 'X-Master-Key': MASTER_KEY, 'X-Bin-Meta': 'false' },
    });

    if (!getR.ok) {
      const t = await getR.text().catch(() => '');
      console.error('JSONBin GET error', getR.status, t);
      return res.status(500).json({ ok: false, error: 'jsonbin_get_failed', status: getR.status, text: t });
    }

    let current = {};
    try { current = await getR.json(); } catch {}

    const next = Array.isArray((current as any).requests)
      ? { requests: [...(current as any).requests, payload] }
      : { requests: [payload] };

    const putR = await fetch(`${BASE}/b/${encodeURIComponent(BIN_ID)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY,
      },
      body: JSON.stringify(next),
    });

    const putText = await putR.text();
    if (!putR.ok) {
      console.error('JSONBin PUT error', putR.status, putText);
      return res.status(500).json({ ok: false, error: 'jsonbin_put_failed', status: putR.status, text: putText });
    }

    return res.json({ ok: true, savedTo: 'jsonbin' });
  } catch (e: any) {
    console.error('Handler error', e?.message || e);
    return res.status(500).json({ ok: false, error: 'server_error', message: e?.message || String(e) });
  }
}
