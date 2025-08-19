// src/admin/tabs/TrialsTab.tsx
import { useEffect, useState } from "react";

export type TrialRequest = {
  id: string;
  date: string;
  storeName: string;
  siret: string;
  phone: string;
  email: string;
  alias: string;
  source?: string;
  status?: "nouveau" | "en_cours" | "traite";
};

export default function TrialsTab({ adminToken }: { adminToken: string }) {
  const [items, setItems] = useState<TrialRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const r = await fetch("/api/trial-requests?list=1", {
        headers: { Authorization: `Bearer ${adminToken}` },
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setItems(Array.isArray(j.items) ? j.items : []);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* au montage */ }, []);

  const filtered = items.filter((it) => {
    const s = `${it.storeName} ${it.siret} ${it.phone} ${it.email} ${it.alias}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  return (
    <div className="border rounded p-4">
      <div className="flex items-center gap-2 mb-3">
        <input
          placeholder="Rechercher (magasin, siret, email, tel, alias)…"
          className="text-sm border rounded px-2 py-1 w-[360px]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={load} className="text-sm border rounded px-3 py-1" disabled={loading}>
          {loading ? "Chargement…" : "🔄 Rafraîchir"}
        </button>
        <div className="ml-auto text-sm opacity-70">Total: {filtered.length}</div>
      </div>

      {err && <div className="text-red-600 mb-2">{err}</div>}

      <div className="overflow-x-auto rounded border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black/10">
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Magasin</th>
              <th className="text-left p-2">SIRET</th>
              <th className="text-left p-2">Téléphone</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Alias</th>
              <th className="text-left p-2">Source</th>
              <th className="text-left p-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-black/5">
                <td className="p-2">{new Date(r.date).toLocaleString()}</td>
                <td className="p-2">{r.storeName}</td>
                <td className="p-2">{r.siret}</td>
                <td className="p-2">{r.phone}</td>
                <td className="p-2">{r.email}</td>
                <td className="p-2">{r.alias}</td>
                <td className="p-2">{r.source || "—"}</td>
                <td className="p-2">{r.status || "nouveau"}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-3 text-center opacity-70">
                  Aucune demande
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
