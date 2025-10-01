// api/site-ove/auth/me.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  setCorsOVE as setCors,
  handleOptionsOVE as handleOptions,
} from "../../_utils/corsOVE";
import { requireJwtFromReq } from "../../_utils/jwtOVE";
import { qOVE as q } from "../../_utils/dbOVE";

type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenant_id: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Préflight CORS
  if (req.method === "OPTIONS") return handleOptions(req, res);

  // CORS (doit mettre: A-C-Allow-Credentials:true + A-C-Allow-Origin: <origin exact>)
  setCors(req, res);
  // Pour éviter des caches CDN/co, utile quand l’origin varie
  res.setHeader("Vary", "Origin");

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "method_not_allowed" });
    }

    // Lit le token depuis cookie OVE_SESSION OU Authorization: Bearer xxxx
    const claims = requireJwtFromReq(req); // { member_id, tenant_id, role }

    // Relit l’utilisateur (avec filtre tenant pour sécurité)
    const rows = await q<PublicUser>`
      SELECT id, email, name, role, tenant_id
        FROM public.members
       WHERE id = ${claims.member_id}
         AND tenant_id = ${claims.tenant_id}
         AND enabled = true
       LIMIT 1
    `;
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: "unauthorized" });
    }

    return res.status(200).json({ ok: true, user });
  } catch (e: any) {
    // erreurs JWT -> 401, sinon 500
    const isAuthErr =
      e?.message === "unauthorized" ||
      e?.name === "JsonWebTokenError" ||
      e?.name === "TokenExpiredError";
    return res.status(isAuthErr ? 401 : 500).json({
      error: isAuthErr ? "unauthorized" : "server_error",
    });
  }
}
