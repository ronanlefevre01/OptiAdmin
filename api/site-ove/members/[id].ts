// api/site-ove/members/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jsonbinGet, jsonbinPut } from "../../_utils/jsonbin";
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query as { id: string };

  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const { enabled, password } = req.body || {};
    const data = await jsonbinGet();
    const members = Array.isArray(data.members) ? data.members : [];

    const idx = members.findIndex((m: any) => m.id === id);
    if (idx === -1) return res.status(404).send("member not found");

    const m = { ...members[idx] };

    if (typeof enabled === "boolean") m.enabled = enabled;
    if (typeof password === "string" && password.trim().length > 0) {
      m.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    members[idx] = m;
    await jsonbinPut({ ...data, members });

    const { password_hash: _omit, ...safe } = m;
    return res.status(200).json(safe);
  } catch (e: any) {
    return res.status(500).send(e?.message || "Server error");
  }
}
