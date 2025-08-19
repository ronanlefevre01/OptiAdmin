// api/trial-requests.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BIN_ID   = process.env.JSONBIN_TRIAL_BIN_ID || '';
const MASTER   = process.env.JSONBIN_MASTER_KEY   || '';

function cors(res: VercelResponse) {
  // Si formulaire sur le même domaine (opti-admin.vercel.app), "*" marche aussi
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Master-Key');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // --- GET = lecture/diagnostic rapide ---
  if (req.method === 'GET') {
    if (!BIN_ID || !MASTER) {
      return res.status(200).json({ ok:false, reason:'env_missing', BIN_ID: !!BIN_ID, MASTER: !!MASTER, requests: [] });
    }
    try {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': MASTER, 'X-Bin-Meta': 'false' },
        cache: 'no-store',
      });
      const text = await r.text();
      if (!r.ok) {
        console.error('JSONBin GET failed', r.status, text);
        return res.status(500).json({ ok:false, where:'jsonbin:get', status:r.status, text });
      }
      const data = JSON.parse(text || '{}');
      const list = Array.isArray(data?.requests) ? data.requests : [];
      return res.status(200).json({ ok:true, requests:list });
    } catch (e:any) {
      console.error('GET error', e?.message || e);
      return res.status(500).json({ ok:false, error:e?.message || 'get_failed' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error:'method_not_allowed' });

  try {
    const { storeName, siret, phone, email, alias, source } = (req.body || {}) as any;

    // validations simples
    if (!storeName || !email || !alias) {
      return res.status(400).json({ ok:false, error:'missing_fields' });
    }

    const id = (globalThis as any).crypto?.randomUUID?.()
            || Math.random().toString(36).slice(2) + Date.now().toString(36);

    const now = new Date().toISOString();
    const record = { id, storeName, siret, phone, email, alias, source, createdAt: now };

    if (!BIN_ID || !MASTER) {
      console.error('ENV MISSING', { BIN_ID: !!BIN_ID, MASTER: !!MASTER });
      return res.status(500).json({ ok:false, savedTo:null, error:'env_missing' });
    }

    // 1) Lire le bin actuel
    const r1 = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': MASTER, 'X-Bin-Meta': 'false' },
      cache: 'no-store',
    });
    const t1 = await r1.text();
    if (!r1.ok) {
      console.error('JSONBin GET failed', r1.status, t1);
      return res.status(500).json({ ok:false, savedTo:'jsonbin', step:'GET', status:r1.status, error:t1 });
    }

    let current: any = {};
    try { current = JSON.parse(t1 || '{}'); } catch {}
    const list = Array.isArray(current?.requests) ? current.requests : [];
    list.unshift(record);

    // 2) Écrire le bin
    const r2 = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: { 'X-Master-Key': MASTER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: list }),
    });
    const t2 = await r2.text();
    if (!r2.ok) {
      console.error('JSONBin PUT failed', r2.status, t2);
      return res.status(500).json({ ok:false, savedTo:'jsonbin', step:'PUT', status:r2.status, error:t2 });
    }

    console.log('stored: jsonbin', id);
    return res.status(200).json({ ok:true, savedTo:'jsonbin', id });
  } catch (e:any) {
    console.error('POST error', e?.message || e);
    return res.status(500).json({ ok:false, error:e?.message || 'post_failed' });
  }
}
