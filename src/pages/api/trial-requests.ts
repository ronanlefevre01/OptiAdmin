// /api/trial-requests.ts
import type { NextApiRequest, NextApiResponse } from "next";

type TrialRequest = {
  id: string;
  date: string;          // ISO
  storeName: string;
  siret: string;
  phone: string;
  email: string;
  alias: string;
  source?: string;
  status?: "nouveau" | "en_cours" | "traite";
};

const JSONBIN_BASE = process.env.VITE_JSONBIN_BASE || "https://api.jsonbin.io/v3";

// lecture robuste des ENV (tolère quelques anciens noms + trim)
function readTrialBinId(): string | undefined {
  const raw =
    process.env.JSONBIN_TRIAL_BIN_ID ||
    process.env.VITE_JSONBIN_TRIAL_BIN_ID ||
    process.env.NEXT_PUBLIC_JSONBIN_TRIAL_BIN_ID ||
    "";
  const v = raw.trim();
  return v.length ? v : undefined;
}
function readMasterKey(): string | undefined {
  const raw =
    process.env.JSONBIN_MASTER_KEY ||
    process.env.VITE_JSONBIN_MASTER_KEY ||
    "";
  const v = raw.trim();
  return v.length ? v : undefined;
}
function readAdminToken(): string | undefined {
  const raw =
    process.env.ADMIN_TRIALS_TOKEN ||      // tu peux créer cette variable si tu veux
    process.env.ADMIN_FEEDBACK_TOKEN ||    // sinon on réutilise celle-ci
    "";
  const v = raw.trim();
  return v.length ? v : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const BIN_ID = readTrialBinId();
  const MASTER_KEY = readMasterKey();
  const ADMIN_TOKEN = readAdminToken();

  // DIAG (ne divulgue pas les secrets, juste l'état)
  if (req.method === "GET" && req.query?.diag) {
    return res.status(200).json({
      ok: true,
      env: {
        HAS_MASTER_KEY: !!MASTER_KEY,
        HAS_TRIAL_BIN: !!BIN_ID,
        BASE: JSONBIN_BASE,
      },
    });
  }

  if (req.method === "GET" && req.query?.list) {
    try {
      // sécurité : token admin obligatoire
      const auth = String(req.headers.authorization || "");
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }
      if (!BIN_ID || !MASTER_KEY) {
        return res.status(500).json({ ok: false, error: "env_missing" });
      }

      // lecture JSONBin (record sans meta)
      const r = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}/latest`, {
        headers: {
          "X-Master-Key": MASTER_KEY,
          "X-Bin-Meta": "false",
          "Cache-Control": "no-store",
        } as any,
        cache: "no-store" as any,
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        return res.status(500).json({ ok: false, error: "jsonbin_read_failed", details: t });
      }

      const record = await r.json();
      const requests: TrialRequest[] = Array.isArray(record?.requests) ? record.requests : [];

      // tri décroissant par date
      requests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return res.status(200).json({ ok: true, total: requests.length, items: requests });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || "error" });
    }
  }

  if (req.method === "POST") {
    try {
      if (!BIN_ID || !MASTER_KEY) {
        return res.status(500).json({ ok: false, error: "env_missing" });
      }

      const body = req.body || {};
      const nowIso = new Date().toISOString();

      const toAdd: TrialRequest = {
        id:
          (globalThis.crypto as any)?.randomUUID?.() ||
          Math.random().toString(36).slice(2) + Date.now().toString(36),
        date: nowIso,
        storeName: String(body.storeName || "").trim(),
        siret: String(body.siret || "").trim(),
        phone: String(body.phone || "").trim(),
        email: String(body.email || "").trim(),
        alias: String(body.alias || "").trim(),
        source: String(body.source || "email-essai"),
        status: "nouveau",
      };

      // 1) lire l’état actuel
      const getR = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY, "X-Bin-Meta": "false" } as any,
        cache: "no-store" as any,
      });
      if (!getR.ok) {
        const t = await getR.text().catch(() => "");
        return res.status(500).json({ ok: false, error: "jsonbin_read_failed", details: t });
      }
      const current = await getR.json();
      const arr: TrialRequest[] = Array.isArray(current?.requests) ? current.requests : [];

      // 2) append
      arr.push(toAdd);

      // 3) écrire
      const putR = await fetch(`${JSONBIN_BASE}/b/${BIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": MASTER_KEY,
        } as any,
        body: JSON.stringify({ requests: arr }),
      });

      if (!putR.ok) {
        const t = await putR.text().catch(() => "");
        return res.status(500).json({ ok: false, error: "jsonbin_write_failed", details: t });
      }

      return res.status(200).json({ ok: true, savedTo: BIN_ID, id: toAdd.id });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || "error" });
    }
  }

  return res.status(405).json({ ok: false, error: "method_not_allowed" });
}
