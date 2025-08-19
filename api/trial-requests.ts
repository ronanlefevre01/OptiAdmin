// /api/trial-requests.ts  (Vercel – Node serverless, TS)
// Lecture libre (GET), création depuis essai.html (POST sans admin),
// MAJ/suppression protégées par token admin (PATCH/DELETE)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';

const JSONBIN_BASE = 'https://api.jsonbin.io/v3';

const BIN_ID  = process.env.JSONBIN_TRIAL_BIN_ID || '';
const MASTER  = process.env.JSONBIN_MASTER_KEY || '';
const ADMIN   = process.env.ADMIN_FEEDBACK_TOKEN || ''; // requis pour PATCH/DELETE
const ALLOWED = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function setCORS(req: VercelRequest, res: VercelResponse) {
  const origin = String(req.headers.origin || '');
  const allow = ALLOWED.length ? (ALLOWED.includes(origin) ? origin : ALLOWED[0]) : '*';
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function ok(res: VercelResponse, data: any)       { return res.status(200).json(data); }
function err(res: VercelResponse, code: number, error: string) { return res.status(code).json({ ok: false, error }); }

async function jsonbinGetLatest() {
  const r = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}/latest`, {
    headers: { 'X-Master-Key': MASTER, 'X-Bin-Meta': 'false' },
    cache: 'no-store' as any,
  } as any);
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`JSONBin GET ${r.status} ${t}`);
  }
  return r.json();
}
async function jsonbinPut(record: any) {
  const r = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER },
    body: JSON.stringify(record),
  } as any);
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`JSONBin PUT ${r.status} ${t}`);
  }
  return r.json();
}

function requireEnv(res: VercelResponse) {
  if (!BIN_ID || !MASTER) return err(res, 500, 'env_missing');
  return null;
}
function requireAdmin(req: VercelRequest, res: VercelResponse) {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!ADMIN || token !== ADMIN) return err(res, 401, 'unauthorized');
  return null;
}

function safeBody(req: VercelRequest): any {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function normalizePhone(raw: string) {
  let p = String(raw || '').replace(/[^\d+]/g, '');
  if (p.startsWith('+33')) p = '0' + p.slice(3);
  return p.replace(/\D/g, '').slice(0, 10);
}
function normalizeSiret(raw: string) {
  return String(raw || '').replace(/\D/g, '').slice(0, 14);
}
function normalizeAlias(raw: string) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(3, 14).padStart(3, 'X');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // GET ?env=1 (ou tout param env présent) => debug env
  if (req.method === 'GET' && typeof req.query.env !== 'undefined') {
    return ok(res, {
      ok: true,
      env: { HAS_MASTER_KEY: !!MASTER, HAS_TRIAL_BIN: !!BIN_ID, BASE: JSONBIN_BASE },
    });
  }

  // Variables d'env indispensables
  const envMissing = requireEnv(res);
  if (envMissing) return;

  try {
    /* ============== GET : liste des demandes ============== */
    if (req.method === 'GET') {
      const status = String(req.query.status || '');
      const q      = String(req.query.q || '').toLowerCase();
      const limit  = Math.max(1, Math.min(1000, parseInt(String(req.query.limit || '200'), 10)));

      const latest = await jsonbinGetLatest();
      let items: any[] =
        Array.isArray(latest?.requests) ? latest.requests :
        (Array.isArray(latest) ? latest : []);

      if (status) items = items.filter(x => String(x.status || 'pending') === status);
      if (q)      items = items.filter(x => JSON.stringify(x).toLowerCase().includes(q));

      return ok(res, items.slice(0, limit)); // <- un tableau, comme attendu par l’admin
    }

    /* ============== POST : création (public, via essai.html) ============== */
    if (req.method === 'POST') {
      // Pas de token admin ici (formulaire public) — le CORS/Origin fait foi.
      const body = safeBody(req);

      const entry = {
        id: randomUUID?.() || Math.random().toString(36).slice(2),
        storeName: String(body.storeName || body.magasin || ''),
        siret:     normalizeSiret(body.siret || ''),
        phone:     normalizePhone(body.phone || body.telephone || ''),
        email:     String(body.email || ''),
        alias:     normalizeAlias(body.alias || body.emetteur || ''),
        source:    String(body.source || 'email-essai'),
        status:    'pending',
        createdAt: new Date().toISOString(),
      };

      const latest = await jsonbinGetLatest();
      const bin = typeof latest === 'object' && !Array.isArray(latest) ? latest : { requests: [] as any[] };
      bin.requests = Array.isArray(bin.requests) ? bin.requests : [];
      bin.requests.unshift(entry);

      await jsonbinPut(bin);
      return ok(res, { ok: true, savedTo: 'jsonbin', entry });
    }

    /* ============== PATCH : mise à jour (admin requis) ============== */
    if (req.method === 'PATCH') {
      const authMissing = requireAdmin(req, res); if (authMissing) return;

      const { id, status } = safeBody(req) as { id: string; status: string };
      if (!id || !status) return err(res, 400, 'bad_request');

      const latest = await jsonbinGetLatest();
      const bin = typeof latest === 'object' && !Array.isArray(latest) ? latest : { requests: [] as any[] };
      bin.requests = Array.isArray(bin.requests) ? bin.requests : [];

      const idx = bin.requests.findIndex((x: any) => String(x.id) === String(id));
      if (idx < 0) return err(res, 404, 'not_found');

      bin.requests[idx].status = status;
      await jsonbinPut(bin);
      return ok(res, { ok: true });
    }

    /* ============== DELETE : suppression (admin requis) ============== */
    if (req.method === 'DELETE') {
      const authMissing = requireAdmin(req, res); if (authMissing) return;

      const body = safeBody(req);
      const id = String((req.query.id || body.id || ''));
      if (!id) return err(res, 400, 'bad_request');

      const latest = await jsonbinGetLatest();
      const bin = typeof latest === 'object' && !Array.isArray(latest) ? latest : { requests: [] as any[] };
      bin.requests = Array.isArray(bin.requests) ? bin.requests : [];

      const before = bin.requests.length;
      bin.requests = bin.requests.filter((x: any) => String(x.id) !== String(id));
      if (bin.requests.length === before) return err(res, 404, 'not_found');

      await jsonbinPut(bin);
      return ok(res, { ok: true });
    }

    return err(res, 405, 'method_not_allowed');
  } catch (e: any) {
    return err(res, 500, e?.message || 'server_error');
  }
}
