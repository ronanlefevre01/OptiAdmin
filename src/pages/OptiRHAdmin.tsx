import React, { useState } from "react";

// Lis l'URL de l'API depuis env (Vite ou CRA)
const API_BASE =
  (import.meta as any)?.env?.VITE_OPTIRH_API ||
  (process.env as any)?.REACT_APP_OPTIRH_API ||
  "";

type Modules = {
  leaves: boolean;
  calendar: boolean;
  announcements: boolean;
  sales_bonus: boolean;
};

export default function OptiRHAdmin() {
  const [licenceKey, setLicenceKey] = useState("OPTI-TEST-0001");
  const [name, setName] = useState("Magasin Demo");
  const [siret, setSiret] = useState("12345678900011");
  const [contactEmail, setContactEmail] = useState("owner@demo.fr");
  const [contactFirst, setContactFirst] = useState("Jean");
  const [contactLast, setContactLast] = useState("Dupont");
  const [expiresAt, setExpiresAt] = useState("2026-12-31T23:59:59Z");
  const [modules, setModules] = useState<Modules>({
    leaves: true,
    calendar: true,
    announcements: true,
    sales_bonus: true,
  });
  const [status, setStatus] = useState<"active" | "suspended">("active");
  const [out, setOut] = useState<string>("");

  async function saveLicence() {
    try {
      if (!API_BASE) {
        setOut("⚠️ API non configurée (VITE_OPTIRH_API / REACT_APP_OPTIRH_API).");
        return;
      }
      setOut("Envoi…");
      const body = {
        licence_key: licenceKey.trim(),
        company: {
          name: name.trim(),
          siret: siret.trim(),
          contact_email: contactEmail.trim(),
          contact_firstname: contactFirst.trim(),
          contact_lastname: contactLast.trim(),
        },
        modules,
        expires_at: expiresAt,
        status,
      };

      const r = await fetch(`${API_BASE}/api/licences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Erreur API");
      setOut("✅ Licence créée/mise à jour.");
    } catch (e: any) {
      setOut("❌ " + e.message);
    }
  }

  return (
    <div style={styles.wrap}>
      <h1>Gérer OptiRH — Licences</h1>
      <p style={{ color: "#666" }}>
        Crée/édite une licence (écrit dans le Bin JSONBin via l’API Render).
      </p>

      <div style={styles.grid}>
        <label style={styles.label}>Clé de licence</label>
        <input style={styles.input} value={licenceKey} onChange={(e) => setLicenceKey(e.target.value)} />

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

        <label style={styles.label}>Expiration (ISO)</label>
        <input style={styles.input} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />

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
          <option value="suspended">suspended</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button style={styles.btnPrimary} onClick={saveLicence}>Enregistrer la licence</button>
      </div>

      <pre style={styles.out}>{out || " "}</pre>

      <hr style={{ margin: "24px 0" }} />
      <small style={{ color: "#888" }}>
        Astuce : après création, dans l’app OptiRH (mobile) onglet Patron → “Activer ma licence” avec la clé.
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
  out: {
    background: "#f7f7f9",
    border: "1px solid #eee",
    borderRadius: 8,
    padding: 12,
    whiteSpace: "pre-wrap",
    minHeight: 40,
  },
};
