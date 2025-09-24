// src/api/_utils/jsonbin.ts
const BIN_ID = process.env.VITE_JSONBIN_BIN_ID || process.env.JSONBIN_BIN_ID;
const MASTER_KEY = process.env.VITE_JSONBIN_MASTER_KEY || process.env.JSONBIN_MASTER_KEY;
const READ_KEY = process.env.VITE_JSONBIN_READ_KEY || process.env.JSONBIN_READ_KEY;

if (!BIN_ID || !MASTER_KEY) {
  console.warn("JSONBin env manquantes: BIN_ID et/ou MASTER_KEY");
}

const BASE = "https://api.jsonbin.io/v3/b";

export async function jsonbinGet() {
  const res = await fetch(`${BASE}/${BIN_ID}/latest`, {
    headers: { "X-Master-Key": MASTER_KEY!, "X-Access-Key": READ_KEY || "" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`JSONBin GET ${res.status}`);
  const j = await res.json();
  return j.record || {};
}

export async function jsonbinPut(record: any) {
  const res = await fetch(`${BASE}/${BIN_ID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": MASTER_KEY!,
      "X-Access-Key": READ_KEY || "",
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`JSONBin PUT ${res.status}`);
  const j = await res.json();
  return j.record || record;
}
