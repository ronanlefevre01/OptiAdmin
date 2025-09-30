// api/site-ove/auth/me.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  setCorsOVE as setCors,
  handleOptionsOVE as handleOptions,
} from "../../_utils/corsOVE";
import { requireJwtFromReq } from "../../_utils/jwtOVE";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return handleOptions(req, res);
  setCors(req, res);               // doit mettre Access-Control-Allow-Credentials: true + Origin reflété
  res.setHeader("Vary", "Origin"); // éviter les caches partagés
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

    const claims = requireJwtFromReq(req); // lit cookie OVE_SESSION OU Authorization: Bearer
    return res.status(200).json({
      ok: true,
      user: {
        id: claims.member_id,
        tenant_id: claims.tenant_id,
        role: claims.role,
      },
    });
  } catch (e: any) {
    const msg = String(e?.message || "");
    // secret manquant => 500 ; sinon 401
    const status = msg === "ove_jwt_secret_missing" ? 500 : 401;
    return res.status(status).json({ error: "unauthorized" });
  }
}
