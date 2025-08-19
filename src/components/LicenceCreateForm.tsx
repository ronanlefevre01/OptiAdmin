// src/components/LicenceCreateForm.tsx
import React, { useState } from "react";

export type NewLicenceInput = {
  name: string;
  siret?: string;
  sender: string; // alias expéditeur (A-Z 0-9)
  plan: "basic" | "pro" | "unlimited";
  credits: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

// Accepte string | undefined et normalise
function onlyAZ09(s?: string) {
  return String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function onlyDigits(s?: string) {
  return String(s ?? "").replace(/\D/g, "");
}

export default function LicenceCreateForm({
  onCreate,
}: {
  onCreate: (data: NewLicenceInput) => Promise<void> | void;
}) {
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

  const validSender =
    form.sender.length >= 3 &&
    form.sender.length <= 11 &&
    /^[A-Z0-9]+$/.test(onlyAZ09(form.sender));

  const canSubmit = !!form.name && validSender && !loading;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      await onCreate({
        ...form,
        sender: onlyAZ09(form.sender),
        siret: onlyDigits(form.siret),           // helpers gèrent l’undefined
        credits: Number(form.credits) || 0,
      });
      setMsg("✅ Licence créée.");
      // reset minimal
      setForm((f) => ({ ...f, name: "", siret: "", sender: "", credits: 0 }));
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Erreur lors de la création."}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 520, padding: 16 }}>
      <h2>Créer une licence</h2>

      <label>
        Enseigne*<br />
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </label>
      <br />

      <label>
        SIRET<br />
        <input
          value={form.siret ?? ""} // toujours une string pour l’input
          onChange={(e) => setForm((f) => ({ ...f, siret: e.target.value }))}
          placeholder="14 chiffres"
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
        />
      </label>
      {!validSender && form.sender && (
        <div style={{ color: "#b00" }}>Entre 3 et 11 caractères A-Z / 0-9.</div>
      )}
      <br />

      <label>
        Plan<br />
        <select
          value={form.plan}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              plan: e.target.value as NewLicenceInput["plan"],
            }))
          }
        >
          <option value="basic">basic</option>
          <option value="pro">pro</option>
          <option value="unlimited">unlimited</option>
        </select>
      </label>
      <br />

      <label>
        Crédits initiaux<br />
        <input
          type="number"
          value={form.credits}
          onChange={(e) =>
            setForm((f) => ({ ...f, credits: Number(e.target.value) }))
          }
        />
      </label>

      <fieldset style={{ marginTop: 12 }}>
        <legend>Contact</legend>
        <label>
          Nom<br />
          <input
            value={form.contactName ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactName: e.target.value }))
            }
          />
        </label>
        <br />
        <label>
          Email<br />
          <input
            value={form.contactEmail ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactEmail: e.target.value }))
            }
          />
        </label>
        <br />
        <label>
          Téléphone<br />
          <input
            value={form.contactPhone ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactPhone: e.target.value }))
            }
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
