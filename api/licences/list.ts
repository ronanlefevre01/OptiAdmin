// api/licences/list.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  try {
    const r = await fetch(`${process.env.SERVER_URL}/api/admin/licences`, {
      headers: { Authorization: `Bearer ${process.env.ADMIN_UPLOAD_TOKEN}` },
      cache: 'no-store',
    });
    const j = await r.json().catch(() => ({}));

    if (!r.ok) return res.status(r.status).json(j);

    const list = Array.isArray(j.licences) ? j.licences
               : Array.isArray(j) ? j
               : j.licences ? Object.values(j.licences)
               : [];

    return res.status(200).json({ ok: true, licences: list });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'proxy_failed' });
  }
}
