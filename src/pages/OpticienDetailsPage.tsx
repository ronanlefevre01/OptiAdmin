import React, { useState } from 'react';

type Opticien = {
  id: string;
  nom: string;
  siret: string;
  formule: 'Starter' | 'Pro' | 'Premium' | 'À la carte';
  credits: number;
  email: string;
  telephone: string;
};

interface Props {
  opticien: Opticien;
  onSave: (updated: Opticien) => void;
  onCancel: () => void;
}

export default function OpticienDetailsPage({ opticien, onSave, onCancel }: Props) {
  const [form, setForm] = useState<Opticien>({ ...opticien });

  const handleChange = (key: keyof Opticien, value: any) => {
    setForm({ ...form, [key]: value });
  };

  return (
    <div style={{ padding: 20, maxWidth: 500 }}>
      <h2>📝 Modifier opticien</h2>

      <label>Nom :</label>
      <input value={form.nom} onChange={(e) => handleChange('nom', e.target.value)} />

      <label>SIRET :</label>
      <input value={form.siret} onChange={(e) => handleChange('siret', e.target.value)} />

      <label>Email :</label>
      <input value={form.email} onChange={(e) => handleChange('email', e.target.value)} />

      <label>Téléphone :</label>
      <input value={form.telephone} onChange={(e) => handleChange('telephone', e.target.value)} />

      <label>Formule :</label>
      <select value={form.formule} onChange={(e) => handleChange('formule', e.target.value as any)}>
        <option value="Starter">Starter</option>
        <option value="Pro">Pro</option>
        <option value="Premium">Premium</option>
        <option value="À la carte">À la carte</option>
      </select>

      <label>Crédits :</label>
      <input
        type="number"
        value={form.credits}
        onChange={(e) => handleChange('credits', parseInt(e.target.value))}
      />

      <div style={{ marginTop: 20 }}>
        <button onClick={() => onSave(form)}>💾 Sauvegarder</button>{' '}
        <button onClick={onCancel}>❌ Annuler</button>
      </div>
    </div>
  );
}
