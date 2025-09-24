// api/auth/login.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jsonbinGet } from "../_utils/jsonbin";
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).send("email et password requis");

    const data = await jsonbinGet();
    const members = Array.isArray(data.members) ? data.members : [];

    const m = members.find((x: any) => x.email?.toLowerCase() === String(email).toLowerCase());
    if (!m || !m.enabled) return res.status(401).send("Identifiants invalides");

    const ok = await bcrypt.compare(String(password), String(m.password_hash || ""));
    if (!ok) return res.status(401).send("Identifiants invalides");

    // minimal profile (ton AuthContext peut le stocker en localStorage)
    const profile = { id: m.id, email: m.email, name: m.name, role: m.role };
    return res.status(200).json({ user: profile });
  } catch (e: any) {
    return res.status(500).send(e?.message || "Server error");
  }
}
