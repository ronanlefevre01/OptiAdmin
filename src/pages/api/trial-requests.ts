// src/pages/api/trial-requests.ts
import type { NextApiRequest, NextApiResponse } from "next";

/* ---------- C O N F I G ---------- */
const JSONBIN_BASE = "https://api.jsonbin.io/v3";

// Variables d’environnement (à définir dans Vercel)
const BIN_ID  = process.env.JSONBIN_TRIAL_BIN_ID || "";
const MASTER  = process.env.JSONBIN_MASTER_KEY || "";
const ADMIN   = process.env.ADMIN_FEEDBACK_TOKEN || ""; // optionnel (si tu veux protéger des actions)

const allowedOrigins = [
  "https://opticom-web.vercel.app",
  "https://opti-admin.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

/* ---------- U T I L S ---------- */
function setCORS(res: NextApiResponse, origin?: string) {
  const allow = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function ok(res: NextApiResponse, data: any) {
  return res.status(200).json(data);
}
function err(res: NextApiResponse, code: number, error: string) {
  return res.status(code).json({ ok: false, error });
}

async function jsonbinGetLatest() {
  const r = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}/latest`, {
    headers: { "X-Master-Key": MASTER, "X-Bin-Meta": "false" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`JSONBin GET ${r.status}`);
  return r.json();
}

async function jsonbinPut(record: any) {
  const r = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": MASTER,
    },
    body: JSON.stringify(record),
  });
  if (!r.ok) throw new Error(`JSONBin PUT ${r.status}`);
  return r.json();
}

function requireEnv(res: NextApiResponse) {
  if (!BIN_ID || !MASTER) return err(res, 500, "env_missing");
  return null;
}

function normalizeList(latest: any): any[] {
  // le bin peut être { requests: [...] } ou directement un tableau
  if (Array.isArray(latest?.requests)) return latest.requests;
  if (Array.isArray(latest)) return latest;
  return [];
}

/* ---------- H A N D L E R ---------- */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCORS(res, req.headers.origin as string | undefined);
  if (req.method === "OPTIONS") return res.status(204).end();

  // GET /api/trial-requests?env=1  -> ping env
  if (req.method === "GET" && req.query.env === "1") {
    return ok(res, {
      ok: true,
      env: {
        HAS_MASTER_KEY: !!MASTER,
        HAS_TRIAL_BIN: !!BIN_ID,
        BASE: JSONBIN_BASE,
      },
    });
  }

  // besoin d'ENV pour toute la suite
  const envMissing = requireEnv(res);
  if (envMissing) return;

  try {
    if (req.method === "GET") {
      // Liste + filtres
      const status = String(req.query.status || "");
      const q = String(req.query.q || "").toLowerCase();
      const limit = Math.max(1, Math.min(1000, parseInt(String(req.query.limit || "200"), 10)));

      const latest = await jsonbinGetLatest();
      let items = normalizeList(latest);

      if (status) {
        items = items.filter((x: any) => (x.status || "pending") === status);
      }
      if (q) {
        items = items.filter((x: any) => {
          const blob = [
            x.storeName, x.magasin, x.nomMagasin,
            x.siret, x.phone, x.telephone,
            x.email, x.alias, x.emetteur, x.source,
          ].join(" ").toLowerCase();
          return blob.includes(q);
        });
      }

      // tri par date desc si possible
      items.sort((a: any, b: any) =>
        new Date(b.createdAt || b.date || 0).getTime() -
        new Date(a.createdAt || a.date || 0).getTime()
      );

      return ok(res, items.slice(0, limit));
    }

    if (req.method === "POST") {
      // Création d'une demande d'essai (publique)
      const { storeName, siret, phone, email, alias, source } = (req.body || {}) as any;
      if (!storeName || !siret || !phone || !email || !alias) {
        return err(res, 400, "missing_fields");
      }

      const now = new Date().toISOString();
      const entry = {
        id:
          (globalThis as any)?.crypto?.randomUUID?.() ||
          Math.random().toString(36).slice(2),
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

      return ok(res, { ok: true, entry });
    }

    return err(res, 405, "method_not_allowed");
  } catch (e: any) {
    return err(res, 500, e?.message || "server_error");
  }
}
