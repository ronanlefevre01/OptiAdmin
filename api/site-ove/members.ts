// /api/site-ove/members.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jsonbinGet, jsonbinPut } from "../_utils/jsonbin";
import bcrypt from "bcryptjs";

type Member = {
  id: string;
  email: string;
  name?: string;
  role: "client" | "admin" | "demo";
  enabled: boolean;
  created_at: string;
  password_hash: string;
};

const SALT_ROUNDS = 10;

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}
function generatePassword(len = 10) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#-_";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// CORS minimal si tu appelles depuis un autre domaine
function setCORS(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") {
      const store = await jsonbinGet();
      const members: Member[] = Array.isArray(store.members) ? store.members : [];
      return res.status(200).json(members);
    }

    if (req.method === "POST") {
      const { email, name, role, password } = req.body || {};
      if (!email) return res.status(400).json({ error: "email requis" });

      const store = await jsonbinGet();
      const members: Member[] = Array.isArray(store.members) ? store.members : [];

      if (members.some((m) => m.email.toLowerCase() === String(email).toLowerCase())) {
        return res.status(409).json({ error: "Membre déjà existant" });
      }

      const plain = password && String(password).trim().length >= 6 ? String(password) : generatePassword();
      const password_hash = await bcrypt.hash(plain, SALT_ROUNDS);

      const created: Member = {
        id: generateId(),
        email: String(email).trim(),
        name: (name || "").trim(),
        role: (role || "client") as Member["role"],
        enabled: true,
        created_at: new Date().toISOString(),
        password_hash,
      };

      const next = { ...store, members: [created, ...members] };
      await jsonbinPut(next);

      // On renvoie le mot de passe généré pour que tu puisses le communiquer
      return res.status(201).json({ ...created, password: plain });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("members handler error:", err?.message || err);
    return res.status(500).json({ error: "server_error", detail: String(err?.message || err) });
  }
}
