import React, { useEffect, useMemo, useState } from "react";

// URL API
const API_BASE =
  (import.meta as any)?.env?.VITE_OPTIRH_API ||
  (process.env as any)?.REACT_APP_OPTIRH_API ||
  "";

// Helpers datetime-local
const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toIsoUtc = (local?: string) => (local ? new Date(local).toISOString() : null);

type Modules = {
  leaves: boolean;
  calendar: boolean;
  announcements: boolean;
  sales_bonus: boolean;
};

type LicenceRow = {
  tenant_code: string;
  tenant_name?: string | null;
  status: "active" | "paused" | "trial" | "expired" | "disabled";
  valid_until?: string | null;
  seats?: number | null; // limite employés
  meta?: any;
  employees_count: number;
  admins_count: number;
};

export default function OptiRHAdmin() {
  // ----- Admin key -----
  const [adminKey, setAdminKey] = useState("");

  // ----- Form licence (création/édition) -----
  const [licenceKey, setLicenceKey] = useState("ACME");
  const [name, setName] = useState("Magasin Demo");
  const [siret, setSiret] = useState("12345678900011");
  const [contactEmail, setContactEmail] = useState("owner@demo.fr");
  const [contactFirst, setContactFirst] = useState("Jean");
  const [contactLast, setContactLast] = useState("Dupont");
  const [expiresAtLocal, setExpiresAtLocal] = useState(toLocalInput("2026-12-31T23:59:59Z"));
  const [modules, setModules] = useState<Modules>({
    leaves: true,
    calendar: true,
    announcements: true,
    sales_bonus: true,
  });
  const [status, setStatus] = useState<"active" | "suspended">("active");

  // limites
  const [seats, setSeats] = useState<number | "">("");           // employés max (colonne licences.seats)
  const [adminsMax, setAdminsMax] = useState<number | "">("");   // admins max (meta.limits.admins_max)

  // ----- UI -----
  const [out, setOut] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // ----- Listing -----
  const [listBusy, setListBusy] = useState(false);
  const [licences, setLicences] = useState<LicenceRow[]>([]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return licences;
    return licences.filter(
      (l) =>
        l.tenant_code.toLowerCase().includes(q) ||
        (l.tenant_name || "").toLowerCase().includes(q)
    );
  }, [licences, search]);

  async function reloadList() {
    if (!API_BASE || !adminKey.trim()) return;
    setListBusy(true);
    try {
      const r = await fetch(`${API_BASE}/admin/licences`, {
        headers: { "x-admin-key": adminKey.trim() },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `Erreur API (${r.status})`);
      setLicences(j.licences || []);
      setOut("Liste rechargée.");
    } catch (e: any) {
      setOut("❌ " + (e?.message || e));
    } finally {
      setListBusy(false);
    }
  }

  useEffect(() => {
    // recharge quand on colle la clé admin
    if (adminKey.trim()) reloadList();
  }, [adminKey]);

  function fillFormFromLicence(l: LicenceRow) {
    setLicenceKey(l.tenant_code);
    setName(l.tenant_name || l.meta?.company_name || "");
    setExpiresAtLocal(toLocalInput(l.valid_until || null));
    setStatus(l.status === "paused" ? "suspended" : "active");
    setSeats(typeof l.seats === "number" ? l.seats : "");
    // limites admins stockées dans meta.limits.admins_max
    setAdminsMax(
      typeof l.meta?.limits?.admins_max === "number" ? l.meta.limits.admins_max : ""
    );
    setSiret(l.meta?.siret || "");
    setContactEmail(l.meta?.contact_email || "");
    setContactFirst(l.meta?.contact_firstname || "");
    setContactLast(l.meta?.contact_lastname || "");
    setModules({
      leaves: !!l.meta?.modules?.leaves,
      calendar: !!l.meta?.modules?.calendar,
      announcements: !!l.meta?.modules?.announcements,
      sales_bonus: !!l.meta?.modules?.sales_bonus,
    });
  }

  async function saveLicence() {
    try {
      if (!API_BASE) return setOut("⚠️ API non configurée (VITE_OPTIRH_API / REACT_APP_OPTIRH_API).");
      if (!adminKey.trim()) return setOut("⚠️ Renseigne l'Admin API Key (x-admin-key).");
      if (!licenceKey.trim()) return setOut("⚠️ Code tenant requis.");

      setBusy(true);
      setOut("Envoi…");

      const dbStatus = status === "suspended" ? "paused" : "active";
      const expiresIso = toIsoUtc(expiresAtLocal);
      const seatsNum = seats === "" ? null : Number(seats);
      const adminsNum = adminsMax === "" ? null : Number(adminsMax);

      const meta = {
        siret: siret.trim(),
        contact_email: contactEmail.trim(),
        contact_firstname: contactFirst.trim(),
        contact_lastname: contactLast.trim(),
        modules,
        limits: {
          employees_max: seatsNum,   // redondant mais explicite
          admins_max: adminsNum,
        },
      };

      // utilise le POST existant pour créer / mettre à jour
      const body = {
        tenant_code: licenceKey.trim(),
        name: name.trim(),
        status: dbStatus,
        valid_until: expiresIso,
        seats: seatsNum,          // limite employés
        meta,
      };

      const r = await fetch(`${API_BASE}/admin/licences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify(body),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `Erreur API (${r.status})`);
      setOut("✅ Licence créée / mise à jour.");
      reloadList();
    } catch (e: any) {
      setOut("❌ " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteLicence(code: string) {
    if (!window.confirm(`Supprimer la licence ${code} ? (sans purge) `)) return;
    try {
      const r = await fetch(`${API_BASE}/admin/licences/${encodeURIComponent(code)}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey.trim() },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `Erreur API (${r.status})`);
      setOut(`🗑️ Licence ${code} supprimée.`);
      reloadList();
    } catch (e: any) {
      setOut("❌ " + (e?.message || e));
    }
  }

  async function resetOwnerPassword() {
  try {
    if (!API_BASE) return setOut("⚠️ API non configurée.");
    if (!adminKey.trim()) return setOut("⚠️ Renseigne l'Admin API Key.");
    if (!licenceKey.trim()) return setOut("⚠️ Code tenant requis.");
    setBusy(true);
    setOut("Réinitialisation…");

    const r = await fetch(`${API_BASE}/admin/reset-owner-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey.trim(),
      },
      body: JSON.stringify({ tenant_code: licenceKey.trim() }), // optionnel: new_password
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || `Erreur API (${r.status})`);
    // temp_password est renvoyé si généré côté serveur
    setOut(
      j?.temp_password
        ? `✅ Reset OK. Mot de passe temporaire: ${j.temp_password}`
        : `✅ Reset OK.`
    );
  } catch (e: any) {
    setOut("❌ " + (e?.message || e));
  } finally {
    setBusy(false);
  }
}


  return (
    <div style={styles.wrap}>
      <h1>Gérer OptiRH — Licences (Neon)</h1>

      {/* Admin key + actions globales */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          style={{ ...styles.input, width: 360 }}
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="Admin API Key (x-admin-key)"
        />
        <button style={styles.btnGhost} onClick={reloadList} disabled={listBusy || !adminKey.trim()}>
          {listBusy ? "…" : "Recharger la liste"}
        </button>
        <input
          style={{ ...styles.input, width: 240 }}
          placeholder="Rechercher (code/nom)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* LISTING */}
      <div style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#fafafa" }}>
              <th style={styles.th}>Tenant</th>
              <th style={styles.th}>Nom</th>
              <th style={styles.th}>Statut</th>
              <th style={styles.th}>Expire</th>
              <th style={styles.th}>Employés</th>
              <th style={styles.th}>Admins</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const employeesLimit = l.seats ?? l.meta?.limits?.employees_max ?? null;
              const adminsLimit = l.meta?.limits?.admins_max ?? null;
              const empWarn = employeesLimit != null && l.employees_count > employeesLimit;
              const admWarn = adminsLimit != null && l.admins_count > adminsLimit;
              return (
                <tr key={l.tenant_code} style={{ borderTop: "1px solid #eee" }}>
                  <td style={styles.td}><code>{l.tenant_code}</code></td>
                  <td style={styles.td}>{l.tenant_name || ""}</td>
                  <td style={styles.td}>{l.status}</td>
                  <td style={styles.td}>{l.valid_until ? new Date(l.valid_until).toLocaleString() : "—"}</td>
                  <td style={styles.td}>
                    {l.employees_count}
                    {employeesLimit != null && (
                      <span style={{ marginLeft: 6, color: empWarn ? "#c00" : "#666" }}>
                        / {employeesLimit}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {l.admins_count}
                    {adminsLimit != null && (
                      <span style={{ marginLeft: 6, color: admWarn ? "#c00" : "#666" }}>
                        / {adminsLimit}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.btnGhost}
                      onClick={() => fillFormFromLicence(l)}
                    >
                      Éditer
                    </button>
                    <button
                      style={{ ...styles.btnGhost, marginLeft: 8, borderColor: "#f3c" }}
                      onClick={() => deleteLicence(l.tenant_code)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td style={styles.td} colSpan={7}>Aucune licence.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 24 }}>Créer / Éditer une licence</h2>

      {/* FORM */}
      <div style={styles.grid}>
        <label style={styles.label}>Code tenant (clé)</label>
        <input
          style={styles.input}
          value={licenceKey}
          onChange={(e) => setLicenceKey(e.target.value.toUpperCase())}
        />

        <label style={styles.label}>Nom société</label>
        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} />

        <label style={styles.label}>SIRET</label>
        <input style={styles.input} value={siret} onChange={(e) => setSiret(e.target.value)} />

        <label style={styles.label}>Email contact</label>
        <input style={styles.input} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />

        <label style={styles.label}>Contact — Prénom</label>
        <input style={styles.input} value={contactFirst} onChange={(e) => setContactFirst(e.target.value)} />

        <label style={styles.label}>Contact — Nom</label>
        <input style={styles.input} value={contactLast} onChange={(e) => setContactLast(e.target.value)} />

        <label style={styles.label}>Expiration</label>
        <input
          type="datetime-local"
          style={styles.input}
          value={expiresAtLocal}
          onChange={(e) => setExpiresAtLocal(e.target.value)}
        />

        <label style={styles.label}>Modules</label>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {(["leaves","calendar","announcements","sales_bonus"] as (keyof Modules)[]).map((k) => (
            <label key={k} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={modules[k]}
                onChange={(e) => setModules((m) => ({ ...m, [k]: e.target.checked }))}
              />
              {k}
            </label>
          ))}
        </div>

        <label style={styles.label}>Statut</label>
        <select style={styles.input} value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="active">active</option>
          <option value="suspended">suspended (→ paused)</option>
        </select>

        <label style={styles.label}>Limite employés</label>
        <input
          style={styles.input}
          type="number"
          min={0}
          placeholder="ex: 20 (laisser vide = illimité)"
          value={seats === "" ? "" : String(seats)}
          onChange={(e) => setSeats(e.target.value === "" ? "" : Number(e.target.value))}
        />

        <label style={styles.label}>Limite admins (OWNER+HR)</label>
        <input
          style={styles.input}
          type="number"
          min={0}
          placeholder="ex: 2 (laisser vide = illimité)"
          value={adminsMax === "" ? "" : String(adminsMax)}
          onChange={(e) => setAdminsMax(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button style={styles.btnPrimary} onClick={saveLicence} disabled={busy}>
          {busy ? "…" : "Enregistrer la licence"}
        </button>
        <button style={styles.btnGhost} onClick={reloadList} disabled={listBusy}>
          Rafraîchir la liste
        </button>
        <button
    style={{ ...styles.btnGhost, borderColor: "#0aa" }}
    onClick={resetOwnerPassword}
    disabled={busy || !licenceKey.trim() || !adminKey.trim()}
  >
    Réinitialiser mot de passe OWNER
  </button>
      </div>

      <pre style={styles.out}>{out || " "}</pre>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: "system-ui, sans-serif" },
  grid: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: 12,
    alignItems: "center",
    marginTop: 12,
  },
  label: { fontWeight: 600 },
  input: { padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 },
  btnPrimary: { padding: "10px 16px", borderRadius: 8, border: "none", background: "#6f42c1", color: "#fff", cursor: "pointer" },
  btnGhost: { padding: "10px 16px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer" },
  out: {
    background: "#f7f7f9",
    border: "1px solid #eee",
    borderRadius: 8,
    padding: 12,
    whiteSpace: "pre-wrap",
    minHeight: 40,
    marginTop: 16,
  },
  th: { padding: "8px 10px", borderBottom: "1px solid #eee" },
  td: { padding: "8px 10px", verticalAlign: "top" },
};
