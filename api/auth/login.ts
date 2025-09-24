// /api/auth/login.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jsonbinGet } from "../_utils/jsonbin";
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email et password requis" });

    const store = await jsonbinGet();
    const members = Array.isArray(store.members) ? store.members : [];

    const m = members.find((x: any) => x.email?.toLowerCase() === String(email).toLowerCase());
    if (!m || !m.enabled) return res.status(401).json({ error: "identifiants invalides" });

    const ok = await bcrypt.compare(String(password), m.password_hash || "");
    if (!ok) return res.status(401).json({ error: "identifiants invalides" });

    // token minimal (démo) : renvoie role/email
    return res.status(200).json({ email: m.email, role: m.role, name: m.name || "" });
  } catch (err: any) {
    console.error("login error:", err?.message || err);
    return res.status(500).json({ error: "server_error", detail: String(err?.message || err) });
  }
}
