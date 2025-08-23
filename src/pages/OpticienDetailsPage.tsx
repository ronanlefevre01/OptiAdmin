import React, { useEffect, useMemo, useState } from 'react';

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
  opticien: Opticien;                 // on s’en sert pour l’ID et un pré-remplissage instantané
  onSave: (updated: Opticien) => void;
  onCancel: () => void;
  API_BASE?: string;                  // passe-le en prop, sinon modifie DEFAULT_API_BASE ci-dessous
}

/* ================= Helpers ================= */
const DEFAULT_API_BASE = ''; // ← remplace par ton import si tu veux: import API_BASE from '../config/api'
const SENDER_RX = /^[A-Za-z0-9]{3,11}$/;

function normalizeSender(raw: string) {
  const s = String(raw || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 11);
  return s.length < 3 ? 'OPTICOM' : s;
}

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

  // Préremplissage instantané (avant fetch) avec les infos que tu avais déjà
  const initialInstant: FormState = useMemo(
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

  const [form, setForm] = useState<FormState>(initialInstant);

  // Fetch complet depuis le serveur (préremplit tout)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const url = `${API_BASE}/licence?id=${encodeURIComponent(optFromList.id)}`;
        const r = await fetch(url);
        const j = await r.json();
        if (!r.ok || !j?.licence) throw new Error(j?.error || 'Licence introuvable');

        const L: LicenceApi = j.licence;
        if (!alive) return;

        const o = L.opticien || {};
        setLicence(L);
        setForm({
          licenceKey: L.licence || '—',
          formule: (L.abonnement as any) || initialInstant.formule,
          credits: String(L.credits ?? initialInstant.credits),

          nom: o.enseigne || o.nom || initialInstant.nom,
          email: o.email || initialInstant.email,
          telephone: o.telephone || initialInstant.telephone,

          adresse: o.adresse || '',
          ville: o.ville || '',
          codePostal: o.codePostal || '',
          pays: o.pays || 'FR',
          siret: o.siret || initialInstant.siret,

          expediteur: L.libelleExpediteur
            ? normalizeSender(L.libelleExpediteur)
            : normalizeSender(o.enseigne || o.nom || initialInstant.nom),
          signature: L.signature || '',
        });
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Erreur de chargement');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [API_BASE, optFromList.id]); // charge quand l’ID change

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  async function handleSave() {
    if (!licence) return;
    setErr(null);

    // validations min
    const exp = normalizeSender(form.expediteur);
    if (!SENDER_RX.test(exp)) {
      setErr("Le libellé expéditeur doit être alphanumérique (3–11 caractères).");
      return;
    }
    const creditsNum = Number(form.credits);
    if (!Number.isFinite(creditsNum) || creditsNum < 0) {
      setErr('Crédits invalides.');
      return;
    }

    setSaving(true);
    try {
      // 1) Patch général (adresse / emails / formule / crédits)
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
      const j1 = await r1.json();
      if (!r1.ok || j1?.ok === false) throw new Error(j1?.error || 'SYNC_FAILED');

      // 2) Expéditeur (champ protégé)
      const r2 = await fetch(`${API_BASE}/api/licence/expediteur`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenceId: licence.id, libelleExpediteur: exp }),
      });
      const j2 = await r2.json();
      if (!r2.ok || j2?.success === false) throw new Error(j2?.error || 'EXPEDITEUR_FAILED');

      // 3) Signature (champ protégé)
      const r3 = await fetch(`${API_BASE}/api/licence/signature`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenceId: licence.id, signature: form.signature || '' }),
      });
      const j3 = await r3.json();
      if (!r3.ok || j3?.success === false) throw new Error(j3?.error || 'SIGNATURE_FAILED');

      // Appelle ton callback existant avec un objet “plat” compatible avec ta liste
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
    <div style={{ padding: 20, maxWidth: 680 }}>
      <h2>📝 Modifier licence</h2>

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <>
          {form.licenceKey && (
            <div style={{ margin: '6px 0', color: '#666' }}>
              Licence&nbsp;:&nbsp;<code>{form.licenceKey}</code>
            </div>
          )}

          <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="col-span-2">
              Nom / Enseigne :
              <input
                value={form.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                className="w-full border p-2 rounded"
              />
            </label>

            <label>
              Email :
              <input
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full border p-2 rounded"
              />
            </label>

            <label>
              Téléphone :
              <input
                value={form.telephone}
                onChange={(e) => handleChange('telephone', e.target.value)}
                placeholder="06… ou +33…"
                className="w-full border p-2 rounded"
              />
            </label>

            <label className="col-span-2">
              Adresse :
              <input
                value={form.adresse}
                onChange={(e) => handleChange('adresse', e.target.value)}
                className="w-full border p-2 rounded"
              />
            </label>

            <label>
              Ville :
              <input
                value={form.ville}
                onChange={(e) => handleChange('ville', e.target.value)}
                className="w-full border p-2 rounded"
              />
            </label>

            <label>
              Code Postal :
              <input
                value={form.codePostal}
                onChange={(e) => handleChange('codePostal', e.target.value)}
                className="w-full border p-2 rounded"
              />
            </label>

            <label>
              Pays :
              <input
                value={form.pays}
                onChange={(e) => handleChange('pays', e.target.value)}
                className="w-full border p-2 rounded"
              />
            </label>

            <label>
              SIRET :
              <input
                value={form.siret}
                onChange={(e) => handleChange('siret', e.target.value)}
                className="w-full border p-2 rounded"
              />
            </label>

            <label>
              Formule :
              <select
                value={form.formule}
                onChange={(e) => handleChange('formule', e.target.value as Opticien['formule'])}
                className="w-full border p-2 rounded"
              >
                <option value="Starter">Starter</option>
                <option value="Pro">Pro</option>
                <option value="Premium">Premium</option>
                <option value="À la carte">À la carte</option>
                <option value="Illimitée">Illimitée</option>
              </select>
            </label>

            <label>
              Crédits :
              <input
                type="number"
                value={form.credits}
                onChange={(e) => handleChange('credits', e.target.value)}
                className="w-full border p-2 rounded"
              />
            </label>

            <label>
              Libellé expéditeur (3–11 car. A-Z/0-9) :
              <input
                value={form.expediteur}
                onChange={(e) => handleChange('expediteur', e.target.value)}
                className="w-full border p-2 rounded"
              />
            </label>

            <label>
              Signature SMS :
              <input
                value={form.signature}
                onChange={(e) => handleChange('signature', e.target.value)}
                className="w-full border p-2 rounded"
              />
            </label>
          </div>

          {err && <div style={{ color: '#d00', marginTop: 8 }}>{err}</div>}

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
