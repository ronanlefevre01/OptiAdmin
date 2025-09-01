import React, { useState } from "react";

// URL de l’API (Vite/CRA)
const API_BASE =
  (import.meta as any)?.env?.VITE_OPTIRH_API ||
  (process.env as any)?.REACT_APP_OPTIRH_API ||
  "";

// Helpers pour le champ datetime-local
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

export default function OptiRHAdmin() {
  // ⚠️ Ici "licenceKey" = tenant_code (ex: ACME)
  const [licenceKey, setLicenceKey] = useState("ACME");
  const [name, setName] = useState("Magasin Demo");
  const [siret, setSiret] = useState("12345678900011");
  const [contactEmail, setContactEmail] = useState("owner@demo.fr");
  const [contactFirst, setContactFirst] = useState("Jean");
  const [contactLast, setContactLast] = useState("Dupont");

  // On stocke la valeur DU CHAMP (locale) ; on n’envoie qu’en ISO au submit
  const [expiresAtLocal, setExpiresAtLocal] = useState(
    toLocalInput("2026-12-31T23:59:59Z")
  );

  const [modules, setModules] = useState<Modules>({
    leaves: true,
    calendar: true,
    announcements: true,
    sales_bonus: true,
  });

  // UI: "active" | "suspended" (→ paused en DB)
  const [status, setStatus] = useState<"active" | "suspended">("active");

  // ⚠️ Clé admin (x-admin-key) — ne pas commit en dur
  const [adminKey, setAdminKey] = useState("");
  const [out, setOut] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function saveLicence() {
    try {
      if (!API_BASE) return setOut("⚠️ API non configurée (VITE_OPTIRH_API / REACT_APP_OPTIRH_API).");
      if (!adminKey.trim()) return setOut("⚠️ Renseigne l'Admin API Key (x-admin-key).");
      if (!licenceKey.trim()) return setOut("⚠️ Code tenant requis.");

      setBusy(true);
      setOut("Envoi…");

      const dbStatus =
        status === "suspended" ? "paused" : "active"; // mapping UI -> DB
      const expiresIso = toIsoUtc(expiresAtLocal);     // ← ISO propre (ou null)

      const body = {
        tenant_code: licenceKey.trim(),
        name: name.trim(),
        status: dbStatus,                 // "active" | "paused" | "trial" | "expired" | "disabled"
        valid_until: expiresIso,          // ISO ou null
        seats: null,
        meta: {
          siret: siret.trim(),
          contact_email: contactEmail.trim(),
          contact_firstname: contactFirst.trim(),
          contact_lastname: contactLast.trim(),
          modules,
        },
      };

      const r = await fetch(`${API_BASE}/admin/licences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(), // l’API accepte x-admin-key / X-Admin-Key
        },
        body: JSON.stringify(body),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `Erreur API (${r.status})`);
      setOut("✅ Licence créée / mise à jour dans Neon.");
    } catch (e: any) {
      setOut("❌ " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  // Petit check lecture seule (utile pour contrôler ce qui est en base)
  async function checkLicence() {
    try {
      if (!API_BASE) return setOut("⚠️ API non configurée.");
      setBusy(true);
      setOut("Vérification…");
      const r = await fetch(
        `${API_BASE}/api/licences/validate?key=${encodeURIComponent(licenceKey.trim())}`
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `Erreur API (${r.status})`);
      setOut("ℹ️ " + JSON.stringify(j, null, 2));
    } catch (e: any) {
      setOut("❌ " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <h1>Gérer OptiRH — Licences (Neon)</h1>
      <p style={{ color: "#666" }}>
        Création/édition d’une licence Postgres via <code>/admin/licences</code>.
      </p>

      <div style={styles.grid}>
        <label style={styles.label}>Admin API Key (x-admin-key)</label>
        <input
          style={styles.input}
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="colle ici la clé ADMIN_API_KEY"
        />

        <label style={styles.label}>Code tenant (clé licence)</label>
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
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button style={styles.btnPrimary} onClick={saveLicence} disabled={busy}>
          {busy ? "…" : "Enregistrer la licence"}
        </button>
        <button style={styles.btnGhost} onClick={checkLicence} disabled={busy}>
          Vérifier la licence
        </button>
      </div>

      <pre style={styles.out}>{out || " "}</pre>

      <hr style={{ margin: "24px 0" }} />
      <small style={{ color: "#888" }}>
        Après création, l’app mobile utilisera <code>/api/licences/validate</code> puis
        <code> /auth/activate</code>/<code>/auth/login</code> (users.password_hash).
      </small>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, maxWidth: 820, margin: "0 auto", fontFamily: "system-ui, sans-serif" },
  grid: {
    display: "grid",
    gridTemplateColumns: "220px 1fr",
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
  },
};
