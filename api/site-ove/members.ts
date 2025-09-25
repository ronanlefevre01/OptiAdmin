// /api/site-ove/members.ts  (Neon + JWT OVE)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { qOVE as q } from "../_utils/dbOVE";
import {
  setCorsOVE as setCors,
  handleOptionsOVE as handleOptions,
} from "../_utils/corsOVE";
import { requireJwtOVE as requireJwt } from "../_utils/jwtOVE";
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

const normalizeEmail = (v: unknown) => String(v ?? "").trim().toLowerCase();
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
    // Clé admin (header ou query). Préférence à OVE_ADMIN_API_KEY mais fallback ADMIN_API_KEY.
    const adminKey = (process.env.OVE_ADMIN_API_KEY || process.env.ADMIN_API_KEY || "").trim();
    const h = req.headers["x-admin-key"];
    const incomingHeader = Array.isArray(h) ? (h[0] ?? "").trim() : String(h ?? "").trim();
    const incomingQuery = String((req.query?.admin_key as string) ?? "").trim();
    const providedKey = incomingHeader || incomingQuery;
    const fromAdmin = !!adminKey && providedKey === adminKey;
    if (providedKey && !fromAdmin) return res.status(401).json({ error: "bad_admin_key" });

    // ---------- GET ----------
    if (req.method === "GET") {
      const tenantId = fromAdmin
        ? String(req.query.tenant_id || process.env.OVE_TENANT_ID || "").trim()
        : requireJwt(req.headers.authorization).tenant_id;

      if (!tenantId) return res.status(400).json({ error: "missing_tenant_id" });

      const rows = await q<MemberRow>`
        SELECT id, tenant_id, email, name, role, enabled, created_at
        FROM public.members
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `;
      return res.status(200).json(rows);
    }

    // ---------- POST ----------
    if (req.method === "POST") {
      let tenantId = "";
      if (fromAdmin) {
        tenantId = (req.body?.tenant_id as string) || process.env.OVE_TENANT_ID || "";
        if (!tenantId) return res.status(400).json({ error: "missing_tenant_id" });
      } else {
        const u = requireJwt(req.headers.authorization);
        tenantId = u.tenant_id;
      }

      // Vérifie l'existence du tenant
      const t = await q<{ id: string }>`
        SELECT id FROM public.tenants WHERE id = ${tenantId} LIMIT 1
      `;
      if (!t.length) return res.status(400).json({ error: "unknown_tenant", tenant_id: tenantId });

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

      try {
        // existe ?
        const existing = await q<{ id: string }>`
          SELECT id FROM public.members
          WHERE tenant_id = ${tenantId} AND email = LOWER(${email}::text)
          LIMIT 1
        `;

        if (existing.length) {
          await q`
            UPDATE public.members
               SET name = ${name},
                   role = ${role},
                   enabled = ${enabled},
                   password_hash = ${password_hash}
             WHERE tenant_id = ${tenantId}
               AND email = LOWER(${email}::text)
          `;
        } else {
          await q`
            INSERT INTO public.members (tenant_id, email, name, role, enabled, password_hash)
            VALUES (${tenantId}, LOWER(${email}::text), ${name}, ${role}, ${enabled}, ${password_hash})
          `;
        }
      } catch (e: any) {
        console.error("DML members failed:", e?.message || e);
        return res.status(400).json({ error: "dml_failed", detail: String(e?.message || e) });
      }

      // Relit la ligne créée/mise à jour
      const reread = await q<MemberRow>`
        SELECT id, tenant_id, email, name, role, enabled, created_at
        FROM public.members
        WHERE tenant_id = ${tenantId} AND email = LOWER(${email}::text)
        LIMIT 1
      `;
      const row = reread[0];
      if (!row) {
        const cnt = await q<{ n: string }>`
          SELECT count(*)::text AS n FROM public.members WHERE tenant_id = ${tenantId}
        `;
        return res.status(500).json({
          error: "insert_or_update_failed",
          diag: { tenant_id: tenantId, members_for_tenant: cnt[0]?.n ?? "?" },
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
