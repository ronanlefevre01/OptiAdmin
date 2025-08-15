// api/licences/create.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  try {
    const r = await fetch(`${process.env.SERVER_URL}/api/admin/licences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ADMIN_UPLOAD_TOKEN}`,
      },
      body: JSON.stringify(req.body ?? {}),
      // évite tout cache
      cache: 'no-store',
    });

    const j = await r.json().catch(() => ({}));
    res.status(r.status).json(j);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'proxy_failed' });
  }
}
