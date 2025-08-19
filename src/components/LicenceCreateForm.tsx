// src/components/LicenceCreateForm.tsx
import React, { useState } from "react";

export type NewLicenceInput = {
  name: string;
  siret?: string;
  sender: string;                 // alias expéditeur (A-Z 0-9)
  plan: "basic" | "pro" | "unlimited";
  credits: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

function onlyAZ09(s: string) {
  return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function onlyDigits(s: string) {
  return String(s || "").replace(/\D/g, "");
}
function mapFormuleToPlan(v?: string): NewLicenceInput["plan"] {
  const s = String(v || "").toLowerCase();
  if (s === "pro") return "pro";
  if (s === "premium" || s === "unlimited") return "unlimited";
  if (s === "starter" || s === "basic") return "basic";
  return "basic";
}
function mapPlanToFormule(v: NewLicenceInput["plan"]) {
  return v === "pro" ? "Pro" : v === "unlimited" ? "Premium" : "Starter";
}

type Props = {
  onCreate: (data: NewLicenceInput) => Promise<void> | void;
};

export default function LicenceCreateForm({ onCreate }: Props) {
  const [form, setForm] = useState<NewLicenceInput>({
    name: "",
    siret: "",
    sender: "",
    plan: "basic",
    credits: 0,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const senderPreview = onlyAZ09(form.sender);
  const validSender =
    senderPreview.length >= 3 &&
    senderPreview.length <= 11 &&
    /^[A-Z0-9]+$/.test(senderPreview);

  const canSubmit = !!form.name && validSender && !loading;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      await onCreate({
        ...form,
        sender: senderPreview,
        siret: onlyDigits(form.siret || ""),
        credits: Number(form.credits) || 0,
      });
      setMsg("✅ Licence créée.");
      // reset minimal
      setForm({
        name: "",
        siret: "",
        sender: "",
        plan: "basic",
        credits: 0,
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      });
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Erreur lors de la création."}`);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      name: "",
      siret: "",
      sender: "",
      plan: "basic",
      credits: 0,
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    });
    setMsg(null);
  }

  // Préremplissage depuis un JSON (collé depuis l’onglet Essais)
  function prefillFromObject(raw: any) {
    try {
      const contact = raw.contact || {};
      const name =
        raw.name || raw.nom || raw.enseigne || raw.storeName || raw.magasin || "";
      const siret = onlyDigits(raw.siret || "");
      const sender =
        raw.sender || raw.alias || raw.libelleExpediteur || form.sender || "";
      const email =
        contact.email || raw.contactEmail || raw.email || "";
      const phone =
        contact.phone || raw.contactPhone || raw.telephone || raw.phone || "";
      const contactName =
        contact.name || raw.contactName || "";
      // plan/formule/abonnement
      const plan =
        raw.plan
          ? mapFormuleToPlan(raw.plan)
          : raw.formule
          ? mapFormuleToPlan(raw.formule)
          : raw.abonnement?.formule
          ? mapFormuleToPlan(raw.abonnement.formule)
          : "basic";
      const credits =
        Number(
          raw.credits ??
          raw.creditsInitiaux ??
          0
        ) || 0;

      setForm((f) => ({
        ...f,
        name,
        siret,
        sender,
        plan,
        credits,
        contactName,
        contactEmail: email,
        contactPhone: phone,
      }));
      setMsg("✨ Champs préremplis depuis le presse-papiers.");
    } catch {
      setMsg("❌ Impossible de préremplir (format inattendu).");
    }
  }

  async function pasteFromClipboard() {
    setMsg(null);
    try {
      const text = await navigator.clipboard.readText();
      const obj = JSON.parse(text);
      prefillFromObject(obj);
    } catch (e) {
      // fallback: prompt si readText/JSON échoue
      const text = window.prompt("Collez ici le JSON copié depuis l’onglet Essais :");
      if (!text) return;
      try {
        const obj = JSON.parse(text);
        prefillFromObject(obj);
      } catch {
        setMsg("❌ JSON invalide.");
      }
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 520, padding: 16 }}>
      <h2>Créer une licence</h2>

      <div style={{ margin: "8px 0", display: "flex", gap: 8 }}>
        <button type="button" onClick={pasteFromClipboard}>
          📋 Coller depuis le presse-papiers
        </button>
        <button type="button" onClick={resetForm}>
          ♻️ Réinitialiser
        </button>
      </div>

      <label>
        Enseigne*<br />
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </label>
      <br />

      <label>
        SIRET<br />
        <input
          value={form.siret}
          onChange={(e) => setForm((f) => ({ ...f, siret: e.target.value }))}
          onBlur={() => setForm((f) => ({ ...f, siret: onlyDigits(f.siret) }))}
          placeholder="14 chiffres"
          inputMode="numeric"
        />
      </label>
      <br />

      <label>
        Expéditeur SMS* (3–11 A-Z / 0-9)<br />
        <input
          value={form.sender}
          onChange={(e) => setForm((f) => ({ ...f, sender: e.target.value }))}
          onBlur={() => setForm((f) => ({ ...f, sender: onlyAZ09(f.sender) }))}
          placeholder="OPTICOM"
          required
        />
      </label>
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Aperçu expéditeur: <code>{senderPreview || "—"}</code>
      </div>
      {!validSender && form.sender && (
        <div style={{ color: "#b00" }}>Entre 3 et 11 caractères A-Z / 0-9.</div>
      )}
      <br />

      <label>
        Plan<br />
        <select
          value={form.plan}
          onChange={(e) =>
            setForm((f) => ({ ...f, plan: e.target.value as NewLicenceInput["plan"] }))
          }
        >
          <option value="basic">basic</option>
          <option value="pro">pro</option>
          <option value="unlimited">unlimited</option>
        </select>
      </label>
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Formule résultante: <code>{mapPlanToFormule(form.plan)}</code>
      </div>
      <br />

      <label>
        Crédits initiaux<br />
        <input
          type="number"
          value={form.credits}
          onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))}
        />
      </label>

      <fieldset style={{ marginTop: 12 }}>
        <legend>Contact</legend>
        <label>
          Nom<br />
          <input
            value={form.contactName || ""}
            onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
          />
        </label>
        <br />
        <label>
          Email<br />
          <input
            value={form.contactEmail || ""}
            onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            type="email"
          />
        </label>
        <br />
        <label>
          Téléphone<br />
          <input
            value={form.contactPhone || ""}
            onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
          />
        </label>
      </fieldset>

      <button type="submit" disabled={!canSubmit} style={{ marginTop: 12 }}>
        {loading ? "Création…" : "Créer la licence"}
      </button>

      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </form>
  );
}
