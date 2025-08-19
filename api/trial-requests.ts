// api/trial-requests.ts  (Vercel – Node serverless, pour projet Vite)
import type { VercelRequest, VercelResponse } from '@vercel/node';

const JSONBIN_BASE = 'https://api.jsonbin.io/v3';

// Variables d'env à définir dans Vercel
const BIN_ID  = process.env.JSONBIN_TRIAL_BIN_ID || '';
const MASTER  = process.env.JSONBIN_MASTER_KEY || '';
const ADMIN   = process.env.ADMIN_FEEDBACK_TOKEN || ''; // (optionnel) si tu veux restreindre PATCH/DELETE etc.

const allowedOrigins = [
  'https://opticom-web.vercel.app',
  'https://opti-admin.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

function setCORS(req: VercelRequest, res: VercelResponse) {
  const origin = String(req.headers.origin || '');
  const allow =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function ok(res: VercelResponse, data: any) {
  return res.status(200).json(data);
}
function err(res: VercelResponse, code: number, error: string) {
  return res.status(code).json({ ok: false, error });
}

async function jsonbinGetLatest() {
  const r = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}/latest`, {
    headers: { 'X-Master-Key': MASTER, 'X-Bin-Meta': 'false' },
    cache: 'no-store',
  } as any);
  if (!r.ok) throw new Error(`JSONBin GET ${r.status}`);
  return r.json();
}
async function jsonbinPut(record: any) {
  const r = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': MASTER,
    },
    body: JSON.stringify(record),
  } as any);
  if (!r.ok) throw new Error(`JSONBin PUT ${r.status}`);
  return r.json();
}

function requireEnv(res: VercelResponse) {
  if (!BIN_ID || !MASTER) return err(res, 500, 'env_missing');
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // GET ?env=1 : ping des env (ne requiert pas JSONBin)
  if (req.method === 'GET' && req.query.env === '1') {
    return ok(res, {
      ok: true,
      env: { HAS_MASTER_KEY: !!MASTER, HAS_TRIAL_BIN: !!BIN_ID, BASE: JSONBIN_BASE },
    });
  }

  // à partir d'ici on a besoin des env
  const noEnv = requireEnv(res);
  if (noEnv) return;

  try {
    if (req.method === 'GET') {
      const status = String(req.query.status || '');
      const q = String(req.query.q || '').toLowerCase();
      const limit = Math.max(1, Math.min(1000, parseInt(String(req.query.limit || '200'), 10)));

      const latest = await jsonbinGetLatest();
      const list: any[] = Array.isArray(latest?.requests)
        ? latest.requests
        : Array.isArray(latest)
        ? latest
        : [];

      let items = list;
      if (status) {
        items = items.filter(x => (x.status || 'pending') === status);
      }
      if (q) {
        items = items.filter(x => {
          const blob = [
            x.storeName, x.magasin, x.nomMagasin,
            x.siret, x.phone, x.telephone,
            x.email, x.alias, x.emetteur, x.source,
          ].join(' ').toLowerCase();
          return blob.includes(q);
        });
      }
      items.sort((a, b) =>
        new Date(b.createdAt || b.date || 0).getTime() -
        new Date(a.createdAt || a.date || 0).getTime()
      );

      return ok(res, items.slice(0, limit));
    }

    if (req.method === 'POST') {
      const body = (req.body || {}) as any;
      const { storeName, siret, phone, email, alias, source } = body;

      if (!storeName || !siret || !phone || !email || !alias) {
        return err(res, 400, 'missing_fields');
      }

      const now = new Date().toISOString();
      const entry = {
        id: (globalThis as any)?.crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
        storeName: String(storeName),
        siret: String(siret),
        phone: String(phone),
        email: String(email),
        alias: String(alias),
        source: String(source || 'web'),
        status: 'pending',
        createdAt: now,
      };

      const latest = await jsonbinGetLatest();
      const bin = typeof latest === 'object' && !Array.isArray(latest) ? latest : { requests: [] as any[] };
      bin.requests = Array.isArray(bin.requests) ? bin.requests : [];
      bin.requests.unshift(entry);
      await jsonbinPut(bin);

      return ok(res, { ok: true, entry });
    }

    return err(res, 405, 'method_not_allowed');
  } catch (e: any) {
    return err(res, 500, e?.message || 'server_error');
  }
}
