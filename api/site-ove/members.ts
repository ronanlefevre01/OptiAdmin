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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return handleOptions(req, res);
  setCors(req, res);

  try {
    // --------- GET: liste des membres du tenant ----------
    if (req.method === "GET") {
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

    // --------- POST: créer/mettre à jour un membre ----------
    if (req.method === "POST") {
      // Autorisations :
      // - Soit appel depuis l’admin avec X-Admin-Key + tenant_id fourni
      // - Soit appel depuis un membre connecté (JWT) du tenant (idéalement role=admin)
      const adminKey = process.env.ADMIN_API_KEY || "";
      const fromAdmin = req.headers["x-admin-key"] === adminKey;

      let tenantId: string | null = null;
      let requesterRole: string | undefined;

      if (fromAdmin) {
        tenantId = String((req.body && req.body.tenant_id) || "");
        if (!tenantId) return res.status(400).json({ error: "missing_tenant_id" });
      } else {
        const u = requireJwt(req.headers.authorization);
        tenantId = u.tenant_id;
        requesterRole = u.role;
        // ici tu peux imposer: if (requesterRole !== 'admin') return res.status(403).json({ error: 'forbidden' });
      }

      const { email, name = "", role = "client", password } = req.body || {};
      if (!email) return res.status(400).json({ error: "missing_email" });

      const plain =
        password && String(password).trim().length >= 6
          ? String(password).trim()
          : Math.random().toString(36).slice(2, 10);

      const password_hash = await bcrypt.hash(plain, SALT_ROUNDS);

      const { rows } = await q<MemberRow>(
        `INSERT INTO members (tenant_id, email, name, role, enabled, password_hash)
         VALUES ($1, LOWER($2), $3, $4, true, $5)
         ON CONFLICT (tenant_id, email)
         DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
         RETURNING id, tenant_id, email, name, role, enabled, created_at`,
        [tenantId, email, name, role, password_hash]
      );

      // On renvoie le mot de passe en clair UNIQUEMENT aux appels admin
      const payload: any = rows[0];
      if (fromAdmin) payload.password = plain;

      return res.status(201).json(payload);
    }

    return res.status(405).json({ error: "method_not_allowed" });
  } catch (err: any) {
    const status = err?.message === "unauthorized" ? 401 : 500;
    return res.status(status).json({ error: err?.message || "server_error" });
  }
}
