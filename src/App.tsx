import React, { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface Licence {
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
  const [form, setForm] = useState<Licence>({
    licenceId: '',
    nom: '',
    valideJusqu: '',
    cachet: '',
    fonctions: { avance: false, video: false, profil: false, ia: false },
    verresProgressifs: false,
    verresSpeciaux: false,
    traitements: false,
    selectedApp: 'OptiMesure',
  });
  const [selectedApp, setSelectedApp] = useState('OptiMesure');
  const [logo, setLogo] = useState<File | null>(null);
  const [licences, setLicences] = useState<Licence[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const handleSendToDrive = async () => {
  try {
    const response = await fetch('http://localhost:3001/upload-licence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const result = await response.text();

    alert(result.message || 'Licence envoyée avec succès !');
  } catch (error) {
    console.error('Erreur lors de l’envoi à Google Drive :', error);
    alert('Échec de l’envoi de la licence.');
  }
};

  useEffect(() => {
    const saved = localStorage.getItem('licences');
    if (saved) {
      setLicences(JSON.parse(saved));
    }
  }, []);

  const saveLocally = (newLicences: Licence[]) => {
    localStorage.setItem('licences', JSON.stringify(newLicences));
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    if (name === 'selectedApp') {
      setSelectedApp(value);
      setForm((f) => ({ ...f, selectedApp: value }));
    } else if (['avance', 'video', 'profil', 'ia'].includes(name)) {
      setForm((f) => ({
        ...f,
        fonctions: { ...f.fonctions, [name]: checked },
      }));
    } else if (['verresProgressifs', 'verresSpeciaux', 'traitements'].includes(name)) {
      setForm((f) => ({ ...f, [name]: checked }));
    } else {
      setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLogo(e.target.files[0]);
    }
  };

  const handleDownload = async () => {
    const zip = new JSZip();
    const licenceData = JSON.stringify(form, null, 2);
    zip.file('licence.json', licenceData);

    if (logo) {
      const imgData = await logo.arrayBuffer();
      zip.file('logo.png', imgData);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `licence_${form.licenceId}.zip`);

    if (editIndex !== null) {
      const updated = [...licences];
      updated[editIndex] = form;
      setLicences(updated);
      saveLocally(updated);
      setEditIndex(null);
    } else {
      const updated = [...licences, form];
      setLicences(updated);
      saveLocally(updated);
    }

    setForm({
      licenceId: '',
      nom: '',
      valideJusqu: '',
      cachet: '',
      fonctions: { avance: false, video: false, profil: false, ia: false },
      verresProgressifs: false,
      verresSpeciaux: false,
      traitements: false,
      selectedApp: selectedApp,
    });
    setLogo(null);
  };

  const handleEdit = (index: number) => {
    setForm(licences[index]);
    setSelectedApp(licences[index].selectedApp);
    setEditIndex(index);
  };

  const handleDelete = (index: number) => {
    const confirm = window.confirm("Supprimer cette licence ?");
    if (confirm) {
      const updated = licences.filter((_, i) => i !== index);
      setLicences(updated);
      saveLocally(updated);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>OptiAdmin - Générateur de licence</h1>

      <label>
        Application :
        <select value={selectedApp} onChange={handleInput} name="selectedApp">
          <option value="OptiMesure">OptiMesure</option>
          <option value="OptiDemo">OptiDemo</option>
        </select>
      </label>
      <br />

      <input name="licenceId" placeholder="Clé licence (ex: ABCD-1234)" value={form.licenceId} onChange={handleInput} /><br />
      <input name="nom" placeholder="Nom opticien / société" value={form.nom} onChange={handleInput} /><br />
      <input name="valideJusqu" type="date" value={form.valideJusqu} onChange={handleInput} /><br />
      <textarea name="cachet" placeholder="Cachet ou mentions..." value={form.cachet} onChange={handleInput} /><br />

      {selectedApp === "OptiMesure" && (
        <>
          <label><input type="checkbox" name="avance" checked={form.fonctions.avance} onChange={handleInput} /> Mode avancé</label><br />
          <label><input type="checkbox" name="video" checked={form.fonctions.video} onChange={handleInput} /> Vidéo</label><br />
          <label><input type="checkbox" name="profil" checked={form.fonctions.profil} onChange={handleInput} /> Profil</label><br />
          <label><input type="checkbox" name="ia" checked={form.fonctions.ia} onChange={handleInput} /> IA</label><br /><br />
        </>
      )}

      {selectedApp === "OptiDemo" && (
        <>
          <label><input type="checkbox" name="verresProgressifs" checked={form.verresProgressifs} onChange={handleInput} /> Verres progressifs</label><br />
          <label><input type="checkbox" name="verresSpeciaux" checked={form.verresSpeciaux} onChange={handleInput} /> Verres spéciaux</label><br />
          <label><input type="checkbox" name="traitements" checked={form.traitements} onChange={handleInput} /> Traitements</label><br /><br />
        </>
      )}

      <input type="file" accept="image/*" onChange={handleLogoUpload} /><br /><br />

      <button onClick={handleDownload}>
        {editIndex === null ? '📦 Télécharger dossier .zip' : '💾 Enregistrer les modifications'}
      </button>
      <button onClick={handleSendToDrive}>📤 Envoyer sur Google Drive</button>


      <hr style={{ margin: '40px 0' }} />
      <h2>Licences existantes</h2>
      <ul>
        {licences.map((licence, index) => (
          <li key={index} style={{ marginBottom: '10px' }}>
            <strong>{licence.nom}</strong> ({licence.licenceId}) – Valide jusqu’au {licence.valideJusqu}
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
