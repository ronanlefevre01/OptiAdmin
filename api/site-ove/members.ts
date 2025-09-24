// api/site-ove/members.ts (Vercel serverless)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jsonbinGet, jsonbinPut } from "../_utils/jsonbin";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const data = await jsonbinGet();
      const members = Array.isArray(data.members) ? data.members : [];
      return res.status(200).json(members);
    }

    if (req.method === "POST") {
      const { email, name, role = "client", password } = req.body || {};
      if (!email || !password) return res.status(400).send("email et password requis");

      const data = await jsonbinGet();
      const members = Array.isArray(data.members) ? data.members : [];

      if (members.some((m: any) => m.email?.toLowerCase() === String(email).toLowerCase())) {
        return res.status(409).send("email déjà existant");
      }

      const password_hash = await bcrypt.hash(String(password), 10);
      const id = crypto.randomUUID();
      const created = {
        id,
        email: String(email).trim(),
        name: String(name || ""),
        role: role === "admin" || role === "demo" ? role : "client",
        enabled: true,
        created_at: new Date().toISOString(),
        password_hash,
      };

      const next = { ...data, members: [created, ...members] };
      await jsonbinPut(next);

      // on ne renvoie jamais le hash
      const { password_hash: _omit, ...safe } = created as any;
      return res.status(200).json(safe);
    }

    res.setHeader("Allow", "GET,POST");
    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    return res.status(500).send(e?.message || "Server error");
  }
}
