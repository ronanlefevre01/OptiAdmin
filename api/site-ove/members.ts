// /api/site-ove/members.ts  (Neon + JWT, plus de JSONBin)
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
  // Préflight CORS
  if (req.method === "OPTIONS") return handleOptions(req, res);
  setCors(req, res);

  try {
    // --- Lecture robuste de la clé admin ---
    const adminKey = (process.env.ADMIN_API_KEY || "").trim();

    const h = req.headers["x-admin-key"];
    const incomingHeader = Array.isArray(h) ? (h[0] ?? "").trim() : String(h ?? "").trim();
    const incomingQuery = String((req.query?.admin_key as string) ?? "").trim();
    const providedKey = incomingHeader || incomingQuery;

    const fromAdmin = !!adminKey && providedKey === adminKey;
    const adminKeyWasProvided = !!providedKey;

    // Si une clé est fournie mais ne correspond pas → 401 explicite
    if (adminKeyWasProvided && !fromAdmin) {
      return res.status(401).json({ error: "bad_admin_key" });
    }

    // --------- GET: liste des membres du tenant ----------
    if (req.method === "GET") {
      if (fromAdmin) {
        // Mode admin: on peut passer ?tenant_id=, sinon fallback env
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
        // Mode client (JWT)
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

    // --------- POST: créer/mettre à jour un membre ----------
    if (req.method === "POST") {
      // - Soit Admin (X-Admin-Key) : tenant_id dans body ou fallback env
      // - Soit client JWT (idéalement role=admin)
      let tenantId = "";
      let requesterRole: string | undefined;

      if (fromAdmin) {
        tenantId = (req.body?.tenant_id as string) || process.env.OVE_TENANT_ID || "";
        if (!tenantId) return res.status(400).json({ error: "missing_tenant_id" });
      } else {
        const u = requireJwt(req.headers.authorization);
        tenantId = u.tenant_id;
        requesterRole = u.role;
        // Si tu veux restreindre : if (requesterRole !== 'admin') return res.status(403).json({ error: 'forbidden' });
      }

      const email = normalizeEmail(req.body?.email);
      if (!email) return res.status(400).json({ error: "missing_email" });

      const name = String(req.body?.name ?? "").trim().slice(0, 200);
      const roleRaw = String(req.body?.role ?? "client").trim().toLowerCase();
      const role = (ALLOWED_ROLES.has(roleRaw) ? roleRaw : "client") as MemberRow["role"];
      const enabled = boolOrDefault(req.body?.enabled, true);

      const passwordInput = String(req.body?.password ?? "").trim();
      const plain =
        passwordInput.length >= 6 ? passwordInput : Math.random().toString(36).slice(2, 10);
      const password_hash = await bcrypt.hash(plain, SALT_ROUNDS);

      const { rows } = await q<MemberRow>(
        `INSERT INTO members (tenant_id, email, name, role, enabled, password_hash)
         VALUES ($1, LOWER($2), $3, $4, $5, $6)
         ON CONFLICT (tenant_id, email)
         DO UPDATE SET name = EXCLUDED.name,
                       role = EXCLUDED.role,
                       enabled = EXCLUDED.enabled
         RETURNING id, tenant_id, email, name, role, enabled, created_at`,
        [tenantId, email, name, role, enabled, password_hash]
      );

      const payload: any = rows[0];
      if (fromAdmin) payload.password = plain; // mot de passe en clair UNIQUEMENT en mode admin
      return res.status(201).json(payload);
    }

    return res.status(405).json({ error: "method_not_allowed" });
  } catch (err: any) {
    console.error("API /site-ove/members error:", err?.message || err);
    const status = err?.message === "unauthorized" ? 401 : 500;
    return res.status(status).json({ error: err?.message || "server_error" });
  }
}
