// api/site-ove/auth/me.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsOVE as setCors, handleOptionsOVE as handleOptions } from "../../_utils/corsOVE";
import { verifyJwtOVE } from "../../_utils/jwtOVE"; // ou require + try/catch si tu n'as pas verify

function pickToken(req: VercelRequest) {
  const auth = String(req.headers.authorization || "");
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const cookie = String(req.headers.cookie || "");
  const m = cookie.match(/(?:^|;\s*)OVE_SESSION=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return handleOptions(req, res);
  setCors(req, res);
  res.setHeader("Vary", "Origin");

  try {
    if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

    const token = pickToken(req);
    if (!token) return res.status(401).json({ error: "unauthorized" });

    const payload = verifyJwtOVE(token); // { member_id, tenant_id, role, ... }
    if (!payload?.member_id) return res.status(401).json({ error: "unauthorized" });

    // renvoie juste ce qu’il faut au front
    return res.status(200).json({
      ok: true,
      user: {
        id: payload.member_id,
        tenant_id: payload.tenant_id,
        role: payload.role,
      },
    });
  } catch (e: any) {
    console.error("API /site-ove/auth/me error:", e?.message || e);
    return res.status(401).json({ error: "unauthorized" });
  }
}
