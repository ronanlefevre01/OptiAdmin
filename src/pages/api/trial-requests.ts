// /pages/api/trial-requests.ts  (Next.js API Route)

import type { NextApiRequest, NextApiResponse } from "next";

const JSONBIN_BASE = process.env.JSONBIN_BASE || "https://api.jsonbin.io/v3";
const BIN_ID  = process.env.JSONBIN_TRIAL_BIN_ID || "";
const MASTER  = process.env.JSONBIN_MASTER_KEY || "";
const ADMIN   = process.env.ADMIN_FEEDBACK_TOKEN || ""; // protège PATCH/DELETE (optionnel pour GET/POST)

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "https://opticom-web.vercel.app,https://opti-admin.vercel.app,http://localhost:5173,http://localhost:3000"
)
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function setCORS(res: NextApiResponse, origin?: string) {
  const allow = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*";
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function ok(res: NextApiResponse, data: any) { return res.status(200).json(data); }
function err(res: NextApiResponse, code: number, error: string) {
  return res.status(code).json({ ok: false, error });
}

function q1(q: string | string[] | undefined): string {
  return Array.isArray(q) ? String(q[0] ?? "") : String(q ?? "");
}

function requireEnv(res: NextApiResponse) {
  if (!BIN_ID || !MASTER) return err(res, 500, "env_missing");
  return null;
}

function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (!ADMIN || token !== ADMIN) return err(res, 401, "unauthorized");
  return null;
}

async function jsonbinGetLatest() {
  const r = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}/latest`, {
    headers: { "X-Master-Key": MASTER, "X-Bin-Meta": "false" },
    cache: "no-store" as RequestCache,
  });
  if (!r.ok) throw new Error(`JSONBin GET ${r.status}`);
  return r.json();
}

async function jsonbinPut(record: any) {
  const r = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Master-Key": MASTER },
    body: JSON.stringify(record),
  });
  if (!r.ok) throw new Error(`JSONBin PUT ${r.status}`);
  return r.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCORS(res, req.headers.origin as string | undefined);
  if (req.method === "OPTIONS") return res.status(204).end();

  // ✅ Ping env (GET/HEAD): /api/trial-requests?env=1
  const envFlag = q1(req.query.env);
  if ((req.method === "GET" || req.method === "HEAD") && envFlag === "1") {
    return ok(res, {
      ok: true,
      env: { HAS_MASTER_KEY: !!MASTER, HAS_TRIAL_BIN: !!BIN_ID, BASE: JSONBIN_BASE },
    });
  }

  // Sanity env
  const envMissing = requireEnv(res);
  if (envMissing) return;

  try {
    if (req.method === "GET") {
      // Lecture (publique par défaut)
      const status = q1(req.query.status); // "", "pending", "processed"
      const limit = Math.max(1, Math.min(1000, parseInt(q1(req.query.limit) || "200", 10)));

      const latest = await jsonbinGetLatest();
      let items: any[] = Array.isArray(latest?.requests)
        ? latest.requests
        : (Array.isArray(latest) ? latest : []);

      if (status) items = items.filter(x => (x.status || "pending") === status);

      return ok(res, items.slice(0, limit));
    }

    if (req.method === "POST") {
      // Création (pas d'auth obligatoire — c'est un formulaire public)
      const { storeName, siret, phone, email, alias, source } = (req.body || {}) as any;
      if (!storeName || !siret || !phone || !email || !alias) {
        return err(res, 400, "missing_fields");
      }

      const now = new Date().toISOString();
      const id =
        (globalThis.crypto as any)?.randomUUID?.() ||
        Math.random().toString(36).slice(2) + Date.now().toString(36);

      const entry = {
        id,
        storeName: String(storeName),
        siret: String(siret),
        phone: String(phone),
        email: String(email),
        alias: String(alias),
        source: String(source || "web"),
        status: "pending",
        createdAt: now,
      };

      const latest = await jsonbinGetLatest();
      const bin = typeof latest === "object" && !Array.isArray(latest) ? latest : { requests: [] as any[] };
      bin.requests = Array.isArray(bin.requests) ? bin.requests : [];
      bin.requests.unshift(entry);

      await jsonbinPut(bin);
      return ok(res, { ok: true, savedTo: "jsonbin", entry });
    }

    if (req.method === "PATCH") {
      // MAJ statut (protégé)
      const auth = requireAdmin(req, res); if (auth) return;

      const { id, status } = (req.body || {}) as { id: string; status: string };
      if (!id || !status) return err(res, 400, "bad_request");

      const latest = await jsonbinGetLatest();
      const bin = typeof latest === "object" && !Array.isArray(latest) ? latest : { requests: [] as any[] };
      bin.requests = Array.isArray(bin.requests) ? bin.requests : [];
      const idx = bin.requests.findIndex((x: any) => String(x.id) === String(id));
      if (idx < 0) return err(res, 404, "not_found");

      bin.requests[idx].status = status;
      await jsonbinPut(bin);
      return ok(res, { ok: true });
    }

    if (req.method === "DELETE") {
      // Suppression (protégé)
      const auth = requireAdmin(req, res); if (auth) return;

      const id = q1(req.query.id) || (req.body && String((req.body as any).id || ""));
      if (!id) return err(res, 400, "bad_request");

      const latest = await jsonbinGetLatest();
      const bin = typeof latest === "object" && !Array.isArray(latest) ? latest : { requests: [] as any[] };
      bin.requests = Array.isArray(bin.requests) ? bin.requests : [];
      const before = bin.requests.length;

      bin.requests = bin.requests.filter((x: any) => String(x.id) !== String(id));
      if (bin.requests.length === before) return err(res, 404, "not_found");

      await jsonbinPut(bin);
      return ok(res, { ok: true });
    }

    return err(res, 405, "method_not_allowed");
  } catch (e: any) {
    return err(res, 500, e?.message || "server_error");
  }
}
