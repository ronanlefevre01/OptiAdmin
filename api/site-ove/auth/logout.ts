// api/site-ove/auth/logout.ts  (OptiAdmin)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsOVE as setCors, handleOptionsOVE as handleOptions } from "../../_utils/corsOVE";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return handleOptions(req, res);
  setCors(req, res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // On supprime le cookie HttpOnly du JWT
  const isProd = (process.env.VERCEL_ENV === "production") || (process.env.NODE_ENV === "production");

  const clear = (name: string) =>
    [
      `${name}=`,               // valeur vide
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      isProd ? "Secure" : "",
      "Max-Age=0",
    ].filter(Boolean).join("; ");

  res.setHeader("Set-Cookie", [
    clear("OVE_JWT"),   // cookie principal
    clear("ove_jwt"),   // (compat éventuelle)
  ]);

  return res.status(200).json({ ok: true });
}
