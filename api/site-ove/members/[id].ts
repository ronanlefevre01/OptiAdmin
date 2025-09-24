// /api/site-ove/members/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jsonbinGet, jsonbinPut } from "../../_utils/jsonbin";
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

function setCORS(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  try {
    const id = (req.query as any).id as string;
    if (!id) return res.status(400).json({ error: "id manquant" });

    const store = await jsonbinGet();
    const members: Member[] = Array.isArray(store.members) ? store.members : [];

    const idx = members.findIndex((m) => m.id === id);
    if (idx === -1) return res.status(404).json({ error: "introuvable" });

    const { enabled, role, name, resetPassword } = req.body || {};
    let plain: string | undefined;

    if (typeof enabled === "boolean") members[idx].enabled = enabled;
    if (role) members[idx].role = role;
    if (typeof name === "string") members[idx].name = name;
    if (resetPassword) {
      plain = Math.random().toString(36).slice(2, 10);
      members[idx].password_hash = await bcrypt.hash(plain, 10);
    }

    await jsonbinPut({ ...store, members });
    return res.status(200).json({ ok: true, password: plain });
  } catch (err: any) {
    console.error("member[id] error:", err?.message || err);
    return res.status(500).json({ error: "server_error", detail: String(err?.message || err) });
  }
}
