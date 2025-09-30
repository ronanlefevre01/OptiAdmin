// api/site-ove/auth/login.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { qOVE as q } from "../../_utils/dbOVE";
import { setCorsOVE as setCors, handleOptionsOVE as handleOptions } from "../../_utils/corsOVE";
import { signJwtOVE } from "../../_utils/jwtOVE";

type MemberRow = {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  role: "client" | "admin" | "demo";
  enabled: boolean;
  password_hash: string;
};

const normEmail = (v: unknown) => String(v ?? "").trim().toLowerCase();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return handleOptions(req, res);
  setCors(req, res); // doit inclure Access-Control-Allow-Credentials: true

  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

    // Body tolérant (string ou objet)
    let body: any = req.body ?? {};
    if (typeof body === "string") {
      try { body = JSON.parse(body || "{}"); } catch { body = {}; }
    }

    const email = normEmail(body.email);
    const password = String(body.password ?? "");
    let tenantId = String(body.tenant_id || process.env.OVE_TENANT_ID || "").trim();

    if (!email || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }

    // Si tenant non fourni et pas d'OVE_TENANT_ID, déduction par l'email
    if (!tenantId) {
      const found = await q<{ tenant_id: string }>`
        SELECT DISTINCT tenant_id
          FROM public.members
         WHERE email = lower(${email})
         LIMIT 2
      `;
      if (found.length === 0) return res.status(401).json({ error: "invalid_credentials" });
      if (found.length > 1) return res.status(400).json({ error: "ambiguous_tenant" });
      tenantId = found[0].tenant_id;
    }

    // Lecture du membre
    const rows = await q<MemberRow>`
      SELECT id, tenant_id, email, name, role, enabled, password_hash
        FROM public.members
       WHERE tenant_id = ${tenantId}
         AND email = lower(${email})
       LIMIT 1
    `;
    const m = rows[0];
    if (!m || !m.enabled) return res.status(401).json({ error: "invalid_credentials" });

    // Vérif du mot de passe
    const ok = await bcrypt.compare(password, m.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    // Token + cookie
    const token = signJwtOVE({ member_id: m.id, tenant_id: m.tenant_id, role: m.role });

    // Cookie HttpOnly (prod). En dev http://localhost, le cookie peut être ignoré -> on renvoie aussi le token
    res.setHeader(
      "Set-Cookie",
      `OVE_SESSION=${token}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${7 * 24 * 3600}`
    );
    res.setHeader("Cache-Control", "no-store");

    // IMPORTANT: renvoi aussi le token pour fallback (le front le mettra en localStorage si besoin)
    return res.status(200).json({
      ok: true,
      token, // <--- fallback dev
      user: { id: m.id, email: m.email, name: m.name, role: m.role, tenant_id: m.tenant_id },
    });
  } catch (e: any) {
    console.error("API /site-ove/auth/login error:", e?.message || e);
    return res.status(500).json({ error: "server_error" });
  }
}
