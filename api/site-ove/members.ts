// /api/site-ove/members.ts  (Neon + JWT)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { q } from "../_utils/db";
import { setCors, handleOptions } from "../_utils/cors";
import { requireJwt } from "../_utils/jwt";
import bcrypt from "bcryptjs";

type MemberRow = {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  role: "client" | "admin" | "demo";
  enabled: boolean;
  created_at: string;
};

const SALT_ROUNDS = 10;
const ALLOWED_ROLES = new Set(["client", "admin", "demo"]);

function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}
function boolOrDefault(v: unknown, d = true) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(s)) return true;
    if (["false", "0", "no", "n"].includes(s)) return false;
  }
  return d;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return handleOptions(req, res);
  setCors(req, res);

  try {
    // --- lecture robuste de la clé admin (header ou query) ---
    const adminKey = (process.env.ADMIN_API_KEY || "").trim();
    const h = req.headers["x-admin-key"];
    const incomingHeader = Array.isArray(h) ? (h[0] ?? "").trim() : String(h ?? "").trim();
    const incomingQuery = String((req.query?.admin_key as string) ?? "").trim();
    const providedKey = incomingHeader || incomingQuery;

    const fromAdmin = !!adminKey && providedKey === adminKey;
    const adminKeyWasProvided = !!providedKey;
    if (adminKeyWasProvided && !fromAdmin) {
      return res.status(401).json({ error: "bad_admin_key" });
    }

    // ---------- GET ----------
    if (req.method === "GET") {
      if (fromAdmin) {
        const tenantId =
          (req.query.tenant_id as string | undefined)?.trim() ||
          process.env.OVE_TENANT_ID ||
          "";
        if (!tenantId) return res.status(400).json({ error: "missing_tenant_id" });

        const { rows } = await q<MemberRow>(
          `SELECT id, tenant_id, email, name, role, enabled, created_at
             FROM members
            WHERE tenant_id = $1
            ORDER BY created_at DESC`,
          [tenantId]
        );
        return res.status(200).json(rows);
      } else {
        const u = requireJwt(req.headers.authorization);
        const { rows } = await q<MemberRow>(
          `SELECT id, tenant_id, email, name, role, enabled, created_at
             FROM members
            WHERE tenant_id = $1
            ORDER BY created_at DESC`,
          [u.tenant_id]
        );
        return res.status(200).json(rows);
      }
    }

    // ---------- POST (upsert robuste + erreurs parlantes) ----------
if (req.method === "POST") {
  const adminKey = (process.env.ADMIN_API_KEY || "").trim();
  const h = req.headers["x-admin-key"];
  const incomingHeader = Array.isArray(h) ? (h[0] ?? "").trim() : String(h ?? "").trim();
  const incomingQuery = String((req.query?.admin_key as string) ?? "").trim();
  const providedKey = incomingHeader || incomingQuery;
  const fromAdmin = !!adminKey && providedKey === adminKey;

  let tenantId = "";
  if (fromAdmin) {
    tenantId = (req.body?.tenant_id as string) || process.env.OVE_TENANT_ID || "";
    if (!tenantId) return res.status(400).json({ error: "missing_tenant_id" });
  } else {
    const u = requireJwt(req.headers.authorization);
    tenantId = u.tenant_id;
  }

  // 1) Vérifie que le tenant existe
  const checkTenant = await q<{ id: string }>(
    `SELECT id FROM tenants WHERE id = $1 LIMIT 1`,
    [tenantId]
  );
  if (!checkTenant.rows.length) {
    return res.status(400).json({ error: "unknown_tenant", tenant_id: tenantId });
  }

  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "missing_email" });

  const name = String(req.body?.name ?? "").trim().slice(0, 200);
  const roleRaw = String(req.body?.role ?? "client").trim().toLowerCase();
  const role = (["client","admin","demo"].includes(roleRaw) ? roleRaw : "client") as
    "client" | "admin" | "demo";
  const enabled = (() => {
    const v = req.body?.enabled;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (["true","1","yes","y"].includes(s)) return true;
      if (["false","0","no","n"].includes(s)) return false;
    }
    return true;
  })();

  const passwordInput = String(req.body?.password ?? "").trim();
  const plain = passwordInput.length >= 6 ? passwordInput : Math.random().toString(36).slice(2, 10);
  const password_hash = await bcrypt.hash(plain, 10);

  // 2) Upsert en 3 étapes avec erreurs parlantes
  try {
    // existe ?
    const existing = await q<{ id: string }>(
      `SELECT id FROM members WHERE tenant_id = $1 AND email = LOWER($2) LIMIT 1`,
      [tenantId, email]
    );

    if (existing.rows.length) {
      await q(
        `UPDATE members
            SET name=$3, role=$4, enabled=$5, password_hash=$6
          WHERE tenant_id=$1 AND email=LOWER($2)`,
        [tenantId, email, name, role, enabled, password_hash]
      );
    } else {
      await q(
        `INSERT INTO members (tenant_id, email, name, role, enabled, password_hash)
         VALUES ($1, LOWER($2), $3, $4, $5, $6)`,
        [tenantId, email, name, role, enabled, password_hash]
      );
    }
  } catch (e: any) {
    console.error("DML members failed:", e?.message || e);
    return res.status(400).json({
      error: "dml_failed",
      detail: String(e?.message || e),
      code: (e && (e.code || e.sqlState)) || undefined,
    });
  }

  // 3) Relit la ligne
  const reread = await q<MemberRow>(
    `SELECT id, tenant_id, email, name, role, enabled, created_at
       FROM members
      WHERE tenant_id = $1 AND email = LOWER($2)
      LIMIT 1`,
    [tenantId, email]
  );
  const row = reread.rows?.[0];
  if (!row) {
    // Petit extra diagnostique
    const cnt = await q<{ n: string }>(
      `SELECT count(*)::text as n FROM members WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.status(500).json({
      error: "insert_or_update_failed",
      diag: { tenant_id: tenantId, members_for_tenant: cnt.rows?.[0]?.n ?? "?" }
    });
  }

  const payload: any = { ...row };
  if (fromAdmin) payload.password = plain;
  return res.status(201).json(payload);
}


    return res.status(405).json({ error: "method_not_allowed" });
  } catch (err: any) {
    console.error("API /site-ove/members error:", err?.message || err);
    const status = err?.message === "unauthorized" ? 401 : 500;
    return res.status(status).json({ error: err?.message || "server_error" });
  }
}
