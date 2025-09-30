// src/pages/site-ove/index.tsx
import React from "react";

type Member = {
  id: string;
  email: string;
  name?: string;
  role: "client" | "admin" | "demo";
  enabled: boolean;
  created_at: string;
};

type Order = {
  id: string;
  customer_email: string;
  items: Array<{ sku: string; qty: number; price_ht?: number }>;
  total_ht?: number;
  status: "draft" | "submitted" | "processed" | "cancelled";
  created_at: string;
};

/* ====== CONFIG API (clé admin + tenant + éventuel JWT) ====== */
const ADMIN_KEY = import.meta.env.VITE_OVE_ADMIN_KEY || "";
const TENANT_ID = import.meta.env.VITE_OVE_TENANT_ID || "";

/** Construit les headers: JWT + Admin Key + Tenant Id (sécurisé, pas dans l’URL) */
function buildHeaders(extra: Record<string, string> = {}) {
  const token =
    localStorage.getItem("OVE_JWT") ||
    sessionStorage.getItem("OVE_JWT") ||
    "";

  const headers: Record<string, string> = { ...extra };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (ADMIN_KEY) headers["X-Admin-Key"] = ADMIN_KEY;
  if (TENANT_ID) headers["X-Tenant-Id"] = TENANT_ID;
  return headers;
}

export default function SiteOVEAdmin() {
  const [tab, setTab] = React.useState<"membres" | "commandes">("membres");

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ marginBottom: 8 }}>Site OVEDISTRIBUTION</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Gérez ici les <strong>membres</strong> (accès B2B) et les{" "}
        <strong>commandes</strong> reçues du site.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab("membres")} style={btnTabStyle(tab === "membres")}>
          Membres
        </button>
        <button onClick={() => setTab("commandes")} style={btnTabStyle(tab === "commandes")}>
          Commandes
        </button>
      </div>

      {tab === "membres" ? <MembersPanel /> : <OrdersPanel />}
    </div>
  );
}

function btnTabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: active ? "#0b5ed7" : "#fff",
    color: active ? "#fff" : "#111",
    cursor: "pointer",
  };
}

/* ===================== MEMBRES ===================== */

function randPassword(len = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%?";
  return Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function MembersPanel() {
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<{
    email: string;
    name: string;
    role: Member["role"];
    password: string;
  }>({
    email: "",
    name: "",
    role: "client",
    password: "",
  });

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/site-ove/members", {
          headers: buildHeaders(),
        });
        const data = await res.json();
        setMembers(Array.isArray(data) ? data : data.items || []);
      } catch {
        setMembers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function createMember(e: React.FormEvent) {
    e.preventDefault();

    const email = form.email.trim();
    if (!email) return;

    let password = form.password.trim();
    if (!password) password = randPassword();

    const payload = {
      email,
      name: form.name.trim(),
      role: form.role,
      password,
      // tenant_id NON nécessaire ici: déjà passé en header X-Tenant-Id.
    };

    const res = await fetch("/api/site-ove/members", {
      method: "POST",
      headers: buildHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const created = await res.json();
      setMembers((prev) => [created, ...prev]);
      setForm({ email: "", name: "", role: form.role, password: "" });
      alert(`Membre créé.\n\nEmail: ${email}\nMot de passe: ${password}\n\nNote: gardez-le en lieu sûr.`);
    } else {
      const t = await res.text();
      alert("Erreur création membre\n" + t);
    }
  }

  async function toggleMember(id: string, enabled: boolean) {
    const res = await fetch(`/api/site-ove/members/${id}`, {
      method: "PATCH",
      headers: buildHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) {
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, enabled } : m)));
    }
  }

  return (
    <div>
      <h3 style={{ margin: "16px 0" }}>Membres</h3>

      <form onSubmit={createMember} style={formRow}>
        <input
          placeholder="Email pro"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          style={input}
        />
        <input
          placeholder="Nom"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          style={input}
        />
        <select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Member["role"] }))}
          style={input}
        >
          <option value="client">client</option>
          <option value="admin">admin</option>
          <option value="demo">demo</option>
        </select>
        <input
          placeholder="Mot de passe (laisser vide = auto)"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          style={{ ...input, minWidth: 220 }}
          type="text"
        />
        <button type="submit" style={primaryBtn}>
          Créer
        </button>
      </form>

      {loading ? (
        <div style={{ color: "#666" }}>Chargement…</div>
      ) : (
        <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={th}>Email</th>
                <th style={th}>Nom</th>
                <th style={th}>Rôle</th>
                <th style={th}>Activé</th>
                <th style={th}>Créé</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid #eef2f7" }}>
                  <td style={td}>{m.email}</td>
                  <td style={td}>{m.name || "—"}</td>
                  <td style={td}>{m.role}</td>
                  <td style={td}>{m.enabled ? "Oui" : "Non"}</td>
                  <td style={td}>{new Date(m.created_at).toLocaleString()}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button
                      onClick={() => toggleMember(m.id, !m.enabled)}
                      style={ghostBtn}
                      title={m.enabled ? "Désactiver" : "Activer"}
                    >
                      {m.enabled ? "Désactiver" : "Activer"}
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...td, textAlign: "center", color: "#667085" }}>
                    Aucun membre pour l’instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ===================== COMMANDES ===================== */

function OrdersPanel() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/site-ove/orders", {
          headers: buildHeaders(),
        });
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : data.items || []);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function updateStatus(id: string, status: Order["status"]) {
    const res = await fetch(`/api/site-ove/orders/${id}`, {
      method: "PATCH",
      headers: buildHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    }
  }

  return (
    <div>
      <h3 style={{ margin: "16px 0" }}>Commandes reçues</h3>

      {loading ? (
        <div style={{ color: "#666" }}>Chargement…</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {orders.map((o) => (
            <div key={o.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Commande {o.id}</div>
                  <div style={{ color: "#667085", fontSize: 14 }}>
                    {new Date(o.created_at).toLocaleString()} — {o.customer_email}
                  </div>
                </div>
                <div>
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value as Order["status"])}
                    style={input}
                  >
                    <option value="draft">brouillon</option>
                    <option value="submitted">soumise</option>
                    <option value="processed">traitée</option>
                    <option value="cancelled">annulée</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 8, color: "#111" }}>
                {o.items.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <div>• {it.sku} × {it.qty}</div>
                    <div>{typeof it.price_ht === "number" ? `${it.price_ht.toFixed(2)} € HT` : ""}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 8, textAlign: "right", fontWeight: 600 }}>
                Total HT&nbsp;: {typeof o.total_ht === "number" ? `${o.total_ht.toFixed(2)} €` : "—"}
              </div>
            </div>
          ))}

          {orders.length === 0 && <div style={{ color: "#667085" }}>Aucune commande pour le moment.</div>}
        </div>
      )}
    </div>
  );
}

/* styles */
const formRow: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 };
const input: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb" };
const primaryBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 10, border: "none", background: "#0b5ed7", color: "#fff", cursor: "pointer" };
const ghostBtn: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" };
const th: React.CSSProperties = { textAlign: "left", padding: 12, fontSize: 14, color: "#111" };
const td: React.CSSProperties = { textAlign: "left", padding: 12, fontSize: 14 };
const card: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" };
