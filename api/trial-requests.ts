// api/trial-requests.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

function allowOrigin(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '';
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (allowed.length === 0 || allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowed[0] || '*');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS,GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readRawBody(req: VercelRequest): Promise<string> {
  if (typeof (req as any).body === 'string') return (req as any).body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  return await new Promise<string>((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowOrigin(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Diag simple
  if (req.method === 'GET' && 'diag' in (req.query || {})) {
    return res.status(200).json({
      ok: true,
      env: {
        HAS_MASTER_KEY: !!(process.env.JSONBIN_MASTER_KEY || process.env.VITE_JSONBIN_MASTER_KEY),
        HAS_TRIAL_BIN: !!process.env.JSONBIN_TRIAL_BIN_ID,
        BASE: process.env.JSONBIN_BASE || 'https://api.jsonbin.io/v3'
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // ---- Lecture body JSON
  let payload: any = {};
  try {
    const raw = await readRawBody(req);
    payload = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(raw || '{}');
  } catch (e) {
    console.error('bad_json', e);
    return res.status(400).json({ ok: false, error: 'bad_json' });
  }

  const { storeName, siret, phone, email, alias, source } = payload;

  const MASTER = (process.env.JSONBIN_MASTER_KEY || process.env.VITE_JSONBIN_MASTER_KEY || '').trim();
  const BIN_ID = (process.env.JSONBIN_TRIAL_BIN_ID || '').trim();
  const BASE = (process.env.JSONBIN_BASE || 'https://api.jsonbin.io/v3').trim();
  if (!MASTER || !BIN_ID) {
    console.error('env_missing', { hasKey: !!MASTER, hasBin: !!BIN_ID });
    return res.status(500).json({ ok: false, error: 'env_missing' });
  }

  const entry = {
    id: Math.random().toString(36).slice(2),
    date: new Date().toISOString(),
    storeName, siret, phone, email, alias,
    source: source || 'web',
    ua: req.headers['user-agent'] || '',
    ip: (req.headers['x-forwarded-for'] as string) || (req.socket as any)?.remoteAddress || ''
  };

  try {
    // 1) Récup record actuel
    let record: any = { requests: [] };
    try {
      const r = await fetch(`${BASE}/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': MASTER, 'X-Bin-Meta': 'false' }
      });
      if (r.ok) record = await r.json();
    } catch (e) {
      console.warn('JSONBin GET failed (continue en création)', e);
    }

    // 2) Ajout + PUT
    const next = Array.isArray(record?.requests)
      ? { requests: [...record.requests, entry] }
      : { requests: [entry] };

    const put = await fetch(`${BASE}/b/${BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER
      },
      body: JSON.stringify(next)
    });

    if (!put.ok) {
      const txt = await put.text();
      console.error('jsonbin_put_failed', put.status, txt);
      return res.status(500).json({ ok: false, error: 'jsonbin_put_failed', status: put.status });
    }

    return res.status(200).json({ ok: true, savedTo: 'jsonbin', id: entry.id });
  } catch (e) {
    console.error('server_error', e);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
