// /api/auth/login.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCors, handleOptions } from "../_utils/cors";
import { q } from "../_utils/db";
import { signJwt } from "../_utils/jwt";
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return handleOptions(req, res);
  setCors(req, res);

  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "missing_credentials" });

    const { rows } = await q<{ id:string; tenant_id:string; role:string; password_hash:string; enabled:boolean }>(
      `SELECT id, tenant_id, role, password_hash, enabled
         FROM members
        WHERE email = LOWER($1)
        LIMIT 1`, [email]
    );
    if (!rows.length || !rows[0].enabled) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await bcrypt.compare(String(password), rows[0].password_hash || "");
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const token = signJwt({ tenant_id: rows[0].tenant_id, member_id: rows[0].id, role: rows[0].role });
    return res.status(200).json({ token });
  } catch (e:any) {
    return res.status(500).json({ error: e?.message || "server_error" });
  }
}
