import type { NextApiRequest, NextApiResponse } from "next";

const allowedOrigins = [
  "https://opticom-web.vercel.app",
  "https://opti-admin.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function setCORS(res: NextApiResponse, origin?: string) {
  const allow = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCORS(res, req.headers.origin as string | undefined);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { storeName, siret, phone, email, alias, source } = req.body || {};
    if (!storeName || !siret || !phone || !email || !alias) {
      res.status(400).json({ error: "Missing fields" });
      return;
    }

    // TODO: persister (DB/JSONBin/Sheet). Pour l’instant on log.
    console.log("Trial request:", { storeName, siret, phone, email, alias, source, at: new Date().toISOString() });

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
}
