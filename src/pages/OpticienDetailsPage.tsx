import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE as DEFAULT_API_BASE } from '../lib/api'; // ← ton api.ts

type Opticien = {
  id: string;
  nom: string;
  siret: string;
  formule: 'Starter' | 'Pro' | 'Premium' | 'À la carte' | 'Illimitée';
  credits: number;
  email: string;
  telephone: string;
};

interface Props {
  opticien: Opticien;                 // sert à l’ID + préfill immédiat
  onSave: (updated: Opticien) => void;
  onCancel: () => void;
  API_BASE?: string;                  // optionnel (fallback api.ts)
}

/* ================= Helpers ================= */
const SENDER_RX = /^[A-Za-z0-9]{3,11}$/;
const normalizeSender = (raw: string) =>
  (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) || 'OPTICOM';

const safeJson = (t: string) => {
  try { return JSON.parse(t); } catch { return null; }
};

/* ======= types serveur minimaux ======= */
type LicenceApi = {
  id: string;
  licence?: string;
  abonnement?: string;
  credits?: number;
  libelleExpediteur?: string;
  signature?: string;
  opticien?: {
    id?: string;
    enseigne?: string;
    nom?: string;
    email?: string;
    telephone?: string;
    adresse?: string;
    ville?: string;
    codePostal?: string;
    pays?: string;
    siret?: string;
  };
};

type FormState = {
  licenceKey: string;
  formule: Opticien['formule'];
  credits: string;

  nom: string;
  email: string;
  telephone: string;

  adresse: string;
  ville: string;
  codePostal: string;
  pays: string;
  siret: string;

  expediteur: string;
  signature: string;
};

export default function OpticienDetailsPage({
  opticien: optFromList,
  onSave,
  onCancel,
  API_BASE = DEFAULT_API_BASE,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [licence, setLicence] = useState<LicenceApi | null>(null);

  // Préremplissage instantané (avant fetch serveur)
  const instant: FormState = useMemo(
    () => ({
      licenceKey: '—',
      formule: optFromList.formule,
      credits: String(optFromList.credits ?? 0),

      nom: optFromList.nom || '',
      email: optFromList.email || '',
      telephone: optFromList.telephone || '',

      adresse: '',
      ville: '',
      codePostal: '',
      pays: 'FR',
      siret: optFromList.siret || '',

      expediteur: normalizeSender(optFromList.nom || 'OPTICOM'),
      signature: '',
    }),
    [optFromList]
  );

  const [form, setForm] = useState<FormState>(instant);

  // Fetch complet (robuste JSON/HTML + id/cle)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      const id = String(optFromList.id || '').trim();

      const urls = [
        `${API_BASE}/api/licence?id=${encodeURIComponent(id)}`,
        `${API_BASE}/api/licence/by-key?cle=${encodeURIComponent(id)}`,
        `${API_BASE}/licence?id=${encodeURIComponent(id)}`,
        `${API_BASE}/licence/by-key?cle=${encodeURIComponent(id)}`
      ];

      try {
        let L: LicenceApi | null = null;
        let last = '';

        for (const u of urls) {
          const r = await fetch(u, { headers: { Accept: 'application/json' } });
          const txt = await r.text(); last = txt;
          const j = safeJson(txt);
          if (r.ok && j?.licence) { L = j.licence as LicenceApi; break; }
        }
        if (!L) throw new Error(`Licence introuvable (réponse: ${last.slice(0, 80)}…)`);

        if (!alive) return;
        setLicence(L);

        const o = L.opticien || {};
        setForm(f => ({
          ...f,
          licenceKey: L.licence || '—',
          formule: (L.abonnement as Opticien['formule']) || f.formule,
          credits: String(L.credits ?? f.credits),

          nom: o.enseigne || o.nom || f.nom,
          email: o.email || f.email,
          telephone: o.telephone || f.telephone,
          adresse: o.adresse || '',
          ville: o.ville || '',
          codePostal: o.codePostal || '',
          pays: o.pays || 'FR',
          siret: o.siret || f.siret,

          expediteur: normalizeSender(L.libelleExpediteur || o.enseigne || o.nom || 'OPTICOM'),
          signature: L.signature || '',
        }));
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Erreur de chargement');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [API_BASE, optFromList.id]);

  const change = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!licence?.id) { setErr('Licence introuvable'); return; }

    // validations minimales
    const exp = normalizeSender(form.expediteur);
    if (!SENDER_RX.test(exp)) { setErr('Libellé expéditeur invalide (3–11, A–Z/0–9).'); return; }
    const creditsNum = Number(form.credits);
    if (!Number.isFinite(creditsNum) || creditsNum < 0) { setErr('Crédits invalides.'); return; }

    setSaving(true); setErr(null);
    try {
      // 1) patch général
      const patch = {
        abonnement: form.formule,
        credits: creditsNum,
        opticien: {
          ...(licence.opticien || {}),
          enseigne: form.nom,
          nom: form.nom,
          email: form.email,
          telephone: form.telephone,
          adresse: form.adresse,
          ville: form.ville,
          codePostal: form.codePostal,
          pays: form.pays,
          siret: form.siret,
        },
      };

      const r1 = await fetch(`${API_BASE}/api/licence/sync-safe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenceId: licence.id, patch }),
      });
      const j1 = safeJson(await r1.text());
      if (!r1.ok || j1?.ok === false) throw new Error(j1?.error || 'SYNC_FAILED');

      // 2) expéditeur
      const r2 = await fetch(`${API_BASE}/api/licence/expediteur`, {
        method: 'POST', // PUT accepté aussi côté serveur
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenceId: licence.id, libelleExpediteur: exp }),
      });
      const j2 = safeJson(await r2.text());
      if (!r2.ok || j2?.success === false) throw new Error(j2?.error || 'EXPEDITEUR_FAILED');

      // 3) signature
      const r3 = await fetch(`${API_BASE}/api/licence/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenceId: licence.id, signature: form.signature || '' }),
      });
      const j3 = safeJson(await r3.text());
      if (!r3.ok || j3?.success === false) throw new Error(j3?.error || 'SIGNATURE_FAILED');

      // callback liste
      onSave({
        id: licence.id,
        nom: form.nom,
        siret: form.siret,
        formule: form.formule,
        credits: creditsNum,
        email: form.email,
        telephone: form.telephone,
      });
    } catch (e: any) {
      setErr(e?.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 740 }}>
      <h2>📝 Modifier licence</h2>

      {form.licenceKey && (
        <div style={{ margin: '6px 0', color: '#666' }}>
          Licence : <code>{form.licenceKey}</code>
        </div>
      )}

      {err && <div style={{ color: '#d00', marginBottom: 8 }}>{err}</div>}
      {loading ? (
        <p>Chargement…</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="col-span-2">
              Nom / Enseigne :
              <input className="w-full border p-2 rounded"
                     value={form.nom} onChange={e=>change('nom', e.target.value)} />
            </label>

            <label>
              Email :
              <input className="w-full border p-2 rounded"
                     value={form.email} onChange={e=>change('email', e.target.value)} />
            </label>

            <label>
              Téléphone :
              <input className="w-full border p-2 rounded" placeholder="06… ou +33…"
                     value={form.telephone} onChange={e=>change('telephone', e.target.value)} />
            </label>

            <label className="col-span-2">
              Adresse :
              <input className="w-full border p-2 rounded"
                     value={form.adresse} onChange={e=>change('adresse', e.target.value)} />
            </label>

            <label>
              Ville :
              <input className="w-full border p-2 rounded"
                     value={form.ville} onChange={e=>change('ville', e.target.value)} />
            </label>

            <label>
              Code Postal :
              <input className="w-full border p-2 rounded"
                     value={form.codePostal} onChange={e=>change('codePostal', e.target.value)} />
            </label>

            <label>
              Pays :
              <input className="w-full border p-2 rounded"
                     value={form.pays} onChange={e=>change('pays', e.target.value)} />
            </label>

            <label>
              SIRET :
              <input className="w-full border p-2 rounded"
                     value={form.siret} onChange={e=>change('siret', e.target.value)} />
            </label>

            <label>
              Formule :
              <select className="w-full border p-2 rounded"
                      value={form.formule}
                      onChange={e=>change('formule', e.target.value as Opticien['formule'])}>
                <option value="Starter">Starter</option>
                <option value="Pro">Pro</option>
                <option value="Premium">Premium</option>
                <option value="À la carte">À la carte</option>
                <option value="Illimitée">Illimitée</option>
              </select>
            </label>

            <label>
              Crédits :
              <input type="number" className="w-full border p-2 rounded"
                     value={form.credits} onChange={e=>change('credits', e.target.value)} />
            </label>

            <label>
              Libellé expéditeur (3–11 car. A–Z/0–9) :
              <input className="w-full border p-2 rounded font-mono"
                     value={form.expediteur}
                     onChange={e=>change('expediteur', normalizeSender(e.target.value))} />
            </label>

            <label>
              Signature SMS :
              <input className="w-full border p-2 rounded"
                     value={form.signature} onChange={e=>change('signature', e.target.value)} />
            </label>
          </div>

          <div style={{ marginTop: 16 }}>
            <button onClick={saving ? undefined : handleSave} disabled={saving} style={{ marginRight: 8 }}>
              {saving ? 'Enregistrement…' : '💾 Sauvegarder'}
            </button>
            <button onClick={onCancel}>❌ Annuler</button>
          </div>
        </>
      )}
    </div>
  );
}
