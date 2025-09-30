// api/site-ove/auth/me.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  setCorsOVE as setCors,
  handleOptionsOVE as handleOptions,
} from "../../_utils/corsOVE";
import { qOVE as q } from "../../_utils/dbOVE";
import { requireJwtFromReq } from "../../_utils/jwtOVE";
import jwt from "jsonwebtoken";

type Member = {
  id: string;
  email: string;
  name: string | null;
  role: "client" | "admin" | "demo";
};

function readCookie(req: VercelRequest, name: string) {
  const raw = req.headers.cookie || "";
  const m = raw.match(
    new RegExp("(?:^|;\\s*)" + name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&") + "=([^;]+)")
  );
  return m ? decodeURIComponent(m[1]) : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return handleOptions(req, res);
  setCors(req, res);

  try {
    if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

    // 1) Lecture des claims depuis cookie HttpOnly OVE_SESSION OU header Bearer
    //    + fallback legacy si cookie OVE_JWT existe encore.
    let payload: any;
    try {
      payload = requireJwtFromReq(req);
    } catch {
      const legacy = readCookie(req, "OVE_JWT");
      if (!legacy) return res.status(401).json({ error: "unauthorized" });

      const secret = process.env.OVE_JWT_SECRET;
      if (!secret) return res.status(500).json({ error: "ove_jwt_secret_missing" });
      try {
        payload = jwt.verify(legacy, secret);
      } catch {
        return res.status(401).json({ error: "invalid_token" });
      }
    }

    // 2) Vérifie que le membre existe et est actif
    const rows = await q<Member>`
      SELECT id, email, name, role
      FROM public.members
      WHERE id = ${payload.member_id}
        AND tenant_id = ${payload.tenant_id}
        AND enabled = true
      LIMIT 1
    `;
    const m = rows[0];
    if (!m) return res.status(401).json({ error: "member_not_found" });

    // 3) OK
    return res.status(200).json({
      ok: true,
      user: {
        id: m.id,
        email: m.email,
        name: m.name,
        role: m.role,
        tenant_id: payload.tenant_id,
      },
    });
  } catch (e: any) {
    console.error("API /site-ove/auth/me error:", e);
    return res.status(500).json({ error: e?.message || "server_error" });
  }
}
