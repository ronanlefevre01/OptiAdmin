import React, { useEffect, useState } from 'react';
import LicenceEditor from './LicenceEditor';
import licencesData from './licences.json';



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
  const [form, setForm] = useState<Licence>({
    licenceId: '',
    nom: '',
    valideJusqu: '',
    cachet: '',
    fonctions: {
      avance: false,
      video: false,
      profil: false,
      ia: false,
    },
    verresProgressifs: false,
    verresSpeciaux: false,
    traitements: false,
    selectedApp: 'OptiMesure',
  });

  const [selectedApp, setSelectedApp] = useState('OptiMesure');

  useEffect(() => {
    setLicences(licencesData as Licence[]);

  }, []);

  useEffect(() => {
    if (editing !== null) {
      setForm(licences[editing]);
      setSelectedApp(licences[editing].selectedApp);
    } else {
      resetForm();
    }
  }, [editing]);

  const resetForm = () => {
    setForm({
      licenceId: '',
      nom: '',
      valideJusqu: '',
      cachet: '',
      fonctions: {
        avance: false,
        video: false,
        profil: false,
        ia: false,
      },
      verresProgressifs: false,
      verresSpeciaux: false,
      traitements: false,
      selectedApp: 'OptiMesure',
    });
    setSelectedApp('OptiMesure');
  };

  const handleInput = (e: React.ChangeEvent<any>) => {
    const { name, value, type, checked } = e.target;
    if (['avance', 'video', 'profil', 'ia'].includes(name)) {
      setForm((prev) => ({
        ...prev,
        fonctions: { ...prev.fonctions, [name]: checked },
      }));
    } else if (['verresProgressifs', 'verresSpeciaux', 'traitements'].includes(name)) {
      setForm((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else if (name === 'selectedApp') {
      setSelectedApp(value);
      setForm((prev) => ({
        ...prev,
        selectedApp: value,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Gère l'upload du logo si tu veux le stocker ou le copier
    console.log("Logo uploaded", e.target.files?.[0]);
  };

  const handleDownload = () => {
    handleSave(form);
  };

  const handleSave = (licence: Licence) => {
    let updated = [...licences];
    if (editing !== null) {
      updated[editing] = licence;
    } else {
      updated.push(licence);
    }
    setLicences(updated);
    setEditing(null);
    resetForm();
  };

  const handleDelete = (index: number) => {
    if (confirm('Supprimer cette licence ?')) {
      const newLicences = licences.filter((_, i) => i !== index);
      setLicences(newLicences);
      setEditing(null);
    }
  };

  const handleNew = () => {
    setEditing(null);
    resetForm();
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
      <LicenceEditor
        form={form}
        setForm={setForm}
        selectedApp={selectedApp}
        setSelectedApp={setSelectedApp}
        handleInput={handleInput}
        handleLogoUpload={handleLogoUpload}
        handleDownload={handleDownload}
        editIndex={editing}
      />
      <hr />
      <h2>Licences enregistrées</h2>
      <ul>
        {licences.map((lic, index) => (
          <li key={index} style={{ marginBottom: 10 }}>
            <strong>{lic.nom}</strong> – {lic.licenceId} ({lic.selectedApp}) – jusqu'au {lic.valideJusqu}
            <br />
            <button onClick={() => setEditing(index)}>✏️ Modifier</button>{' '}
            <button onClick={() => handleDelete(index)}>🗑️ Supprimer</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
