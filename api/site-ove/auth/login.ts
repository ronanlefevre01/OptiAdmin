import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsOVE as setCors, handleOptionsOVE as handleOptions } from "../../_utils/corsOVE";
import { qOVE as q } from "../../_utils/dbOVE";
import { signJwtOVE } from "../../_utils/jwtOVE";
import bcrypt from "bcryptjs";

type Row = {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  role: "client" | "admin" | "demo";
  enabled: boolean;
  password_hash: string | null;
};

function setSessionCookie(res: VercelResponse, token: string) {
  const maxAge = 60 * 60 * 24 * 7; // 7 jours
  res.setHeader("Set-Cookie", [
    `OVE_SESSION=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`,
    // compat optionnelle si tu lis encore le token côté client
    `OVE_JWT=${encodeURIComponent(token)}; Path=/; Secure; SameSite=None; Max-Age=${maxAge}`,
  ]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return handleOptions(req, res);
  setCors(req, res);

  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!email || !password) return res.status(400).json({ error: "missing_credentials" });

    const rows = await q<Row>`
      SELECT id, tenant_id, email, name, role, enabled, password_hash
        FROM public.members
       WHERE email = ${email}
       LIMIT 1
    `;
    const m = rows[0];
    if (!m || !m.enabled || !m.password_hash) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await bcrypt.compare(password, m.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const token = signJwtOVE({ member_id: m.id, tenant_id: m.tenant_id, role: m.role });
    setSessionCookie(res, token);

    return res.status(200).json({
      ok: true,
      token, // compat
      member: { id: m.id, email: m.email, name: m.name, role: m.role, tenant_id: m.tenant_id },
    });
  } catch (e: any) {
    console.error("API /site-ove/auth/login error:", e);
    return res.status(500).json({ error: e?.message || "server_error" });
  }
}
