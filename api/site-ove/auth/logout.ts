import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsOVE as setCors, handleOptionsOVE as handleOptions } from "../../_utils/corsOVE";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return handleOptions(req, res);
  setCors(req, res);
  res.setHeader("Set-Cookie", [
    `OVE_SESSION=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`,
    `OVE_JWT=; Path=/; Secure; SameSite=None; Max-Age=0`,
  ]);
  res.status(200).json({ ok: true });
}
