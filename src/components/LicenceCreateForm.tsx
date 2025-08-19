// src/components/LicenceCreateForm.tsx
import React, { useState } from "react";

type FormState = {
  name: string;
  siret: string;
  sender: string;
  plan: "basic" | "pro" | "unlimited";
  credits: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

function onlyAZ09(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function onlyDigits(s: string) {
  return String(s || "").replace(/\D/g, "");
}

const V = (import.meta as any).env || {};
const API_BASE = String(
  V.VITE_SERVER_URL ||
    V.VITE_SERVER_BASE ||
    "https://opticom-sms-server.onrender.com"
).replace(/\/$/, "");
const ADMIN_TOKEN_KEY = "ADMIN_FEEDBACK_TOKEN";

const PLAN_MAP: Record<FormState["plan"], string> = {
  basic: "starter",
  pro: "pro",
  unlimited: "premium",
};

export default function LicenceCreateForm() {
  const [form, setForm] = useState<FormState>({
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

  const validSender = form.sender.length >= 3 && form.sender.length <= 11;
  const canSubmit = !!form.name && validSender && !loading;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setMsg(null);

    const sender = onlyAZ09(form.sender);
    const siret = onlyDigits(form.siret);
    const credits = Number(form.credits) || 0;
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || "";

    const payload = {
      name: form.name,
      enseigne: form.name,

      siret,

      sender,
      libelleExpediteur: sender,

      plan: PLAN_MAP[form.plan] ?? form.plan, // starter|pro|premium
      formule:
        PLAN_MAP[form.plan] === "starter"
          ? "Starter"
          : PLAN_MAP[form.plan] === "pro"
          ? "Pro"
          : "Premium",

      credits,
      creditsInitiaux: credits,

      contact: {
        name: form.contactName || undefined,
        email: form.contactEmail || undefined,
        phone: form.contactPhone || undefined,
      },
      contactNom: form.contactName || undefined,
      contactEmail: form.contactEmail || undefined,
      contactTelephone: form.contactPhone || undefined,
    };

    // Priorité : POST /api/licences (puis fallbacks)
    const endpoints = [
      `${API_BASE}/api/licences`,
      `${API_BASE}/admin/licences`,
      `${API_BASE}/api/admin/licences`,
    ];

    try {
      let ok = false;
      let lastUrl = "";
      let lastStatus = 0;
      let lastText = "";

      for (const url of endpoints) {
        lastUrl = url;
        try {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers.Authorization = `Bearer ${token}`;

          const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            mode: "cors",
          });

          lastStatus = res.status;
          const isJson = res.headers.get("content-type")?.includes("application/json");
          const data = isJson ? await res.json().catch(() => ({})) : await res.text();

          if (res.ok) {
            const lic = (isJson ? (data as any)?.licence : null) || {};
            setMsg(
              `✅ Licence créée${lic?.id ? `: ${lic.id}` : ""}${
                lic?.sender ? ` — expéditeur ${lic.sender}` : ""
              }`
            );
            ok = true;
            setForm((f) => ({ ...f, name: "", siret: "", sender: "", credits: 0 }));
            break;
          } else {
            lastText =
              (isJson ? (data as any)?.error : data) || `HTTP ${res.status}`;
          }
        } catch (e: any) {
          lastText = e?.message || String(e);
        }
      }

      if (!ok) {
        throw new Error(
          `Échec création licence (dernier essai: ${lastUrl}, status ${lastStatus}) — ${lastText}`
        );
      }
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
          value={form.siret}
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
            setForm((f) => ({ ...f, plan: e.target.value as FormState["plan"] }))
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
            value={form.contactName}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactName: e.target.value }))
            }
          />
        </label>
        <br />
        <label>
          Email<br />
          <input
            value={form.contactEmail}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactEmail: e.target.value }))
            }
          />
        </label>
        <br />
        <label>
          Téléphone<br />
          <input
            value={form.contactPhone}
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

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
        API: <code>{API_BASE}</code>
      </div>
    </form>
  );
}
