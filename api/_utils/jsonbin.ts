// /api/_utils/jsonbin.ts
const BIN_ID = process.env.JSONBIN_BIN_ID;
const MASTER_KEY = process.env.JSONBIN_MASTER_KEY;
const READ_KEY = process.env.JSONBIN_READ_KEY;

if (!BIN_ID || !MASTER_KEY) {
  console.warn("JSONBin env manquantes (JSONBIN_BIN_ID / JSONBIN_MASTER_KEY)");
}

const BASE = "https://api.jsonbin.io/v3/b";

async function ensureOk(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`JSONBin ${res.status} ${res.statusText} :: ${text}`);
  }
}

export async function jsonbinGet(): Promise<any> {
  const url = `${BASE}/${BIN_ID}/latest`;
  const res = await fetch(url, {
    headers: {
      "X-Master-Key": MASTER_KEY as string,
      ...(READ_KEY ? { "X-Access-Key": READ_KEY } : {}),
    },
    cache: "no-store",
  });
  await ensureOk(res);
  const j = await res.json();
  return j.record || {};
}

/**
 * v3: PUT /b/:id  -> body: { record: {...} }
 */
export async function jsonbinPut(record: any): Promise<void> {
  const url = `${BASE}/${BIN_ID}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "X-Master-Key": MASTER_KEY as string,
    },
    body: JSON.stringify({ record }),
  });
  await ensureOk(res);
}
