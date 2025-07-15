import React, { useEffect, useState } from 'react';
import LicenceEditor from './LicenceEditor';

export interface Licence {
  licenceId: string;
  nom: string;
  valideJusqu: string;
  cachet: string;
  fonctions: {
    avance: boolean;
    video: boolean;
    profil: boolean;
    ia: boolean;
  };
  verresProgressifs: boolean;
  verresSpeciaux: boolean;
  traitements: boolean;
  selectedApp: string;
}

const App = () => {
  const [licences, setLicences] = useState<Licence[]>([]);
  const [editing, setEditing] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('licences');
    if (stored) {
      setLicences(JSON.parse(stored));
    } else {
      fetch('/licences.json')
        .then(res => res.json())
        .then(data => {
          setLicences(data);
          localStorage.setItem('licences', JSON.stringify(data));
        })
        .catch(err => console.error('Erreur chargement licences.json', err));
    }
  }, []);

  const handleEdit = (index: number) => {
    setEditing(index);
  };

  const handleDelete = (index: number) => {
    if (confirm('Supprimer cette licence ?')) {
      const newLicences = licences.filter((_, i) => i !== index);
      setLicences(newLicences);
      localStorage.setItem('licences', JSON.stringify(newLicences));
      setEditing(null);
    }
  };

  const handleSave = (licence: Licence) => {
    let updated = [...licences];
    if (editing !== null) {
      updated[editing] = licence;
    } else {
      updated.push(licence);
    }
    setLicences(updated);
    localStorage.setItem('licences', JSON.stringify(updated));
    setEditing(null);
  };

  const handleNew = () => {
    setEditing(null);
  };

  const downloadJson = () => {
    const json = JSON.stringify(licences, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'licences.json';
    a.click();
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>OptiAdmin</h1>
      <button onClick={handleNew}>➕ Nouvelle licence</button>{' '}
      <button onClick={downloadJson}>📥 Exporter JSON</button>
      <hr />
      {editing !== null || editing === 0 ? (
        <LicenceEditor
          licence={licences[editing]}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <LicenceEditor onSave={handleSave} />
      )}
      <hr />
      <h2>Licences enregistrées</h2>
      <ul>
        {licences.map((lic, index) => (
          <li key={index} style={{ marginBottom: 10 }}>
            <strong>{lic.nom}</strong> – {lic.licenceId} ({lic.selectedApp}) – jusqu'au {lic.valideJusqu}
            <br />
            <button onClick={() => handleEdit(index)}>✏️ Modifier</button>{' '}
            <button onClick={() => handleDelete(index)}>🗑️ Supprimer</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
