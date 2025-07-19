import React, { useEffect, useState } from 'react';
import { Licence } from './App';

interface Props {
  licence?: Licence;
  onSave: (licence: Licence) => void;
  onCancel?: () => void;
}

const defaultLicence: Licence = {
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
  libelleExpediteur: '',
  selectedApp: 'OptiMesure',
};

const LicenceEditor: React.FC<Props> = ({ licence, onSave, onCancel }) => {
  const [form, setForm] = useState<Licence>(licence || defaultLicence);

  useEffect(() => {
    if (licence) {
      setForm(licence);
    }
  }, [licence]);

  const handleInput = (e: React.ChangeEvent<any>) => {
    const { name, value, type, checked } = e.target;
    if (['avance', 'video', 'profil', 'ia'].includes(name)) {
      setForm(prev => ({
        ...prev,
        fonctions: {
          ...prev.fonctions,
          [name]: checked,
        },
      }));
    } else if (['verresProgressifs', 'verresSpeciaux', 'traitements'].includes(name)) {
      setForm(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setForm(prev => ({
          ...prev,
          cachet: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    onSave(form);
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>OptiAdmin - Générateur de licence</h1>

      <label>
        Application :
        <select name="selectedApp" value={form.selectedApp} onChange={handleInput}>
          <option value="OptiMesure">OptiMesure</option>
          <option value="OptiDemo">OptiDemo</option>
          <option value="OptiCOM">OptiCOM</option>
        </select>
      </label><br />

      <input name="licenceId" placeholder="Clé licence (ex: ABCD-1234)" value={form.licenceId} onChange={handleInput} /><br />
      <input name="nom" placeholder="Nom opticien / société" value={form.nom} onChange={handleInput} /><br />
      <input name="valideJusqu" type="date" value={form.valideJusqu} onChange={handleInput} /><br />
      <textarea name="cachet" placeholder="Cachet ou mentions..." value={form.cachet} onChange={handleInput} /><br />

      {form.selectedApp === 'OptiMesure' && (
        <>
          <label><input type="checkbox" name="avance" checked={form.fonctions.avance} onChange={handleInput} /> Mode avancé</label><br />
          <label><input type="checkbox" name="video" checked={form.fonctions.video} onChange={handleInput} /> Vidéo</label><br />
          <label><input type="checkbox" name="profil" checked={form.fonctions.profil} onChange={handleInput} /> Profil</label><br />
          <label><input type="checkbox" name="ia" checked={form.fonctions.ia} onChange={handleInput} /> IA</label><br /><br />
        </>
      )}

      {form.selectedApp === 'OptiDemo' && (
        <>
          <label><input type="checkbox" name="verresProgressifs" checked={form.verresProgressifs} onChange={handleInput} /> Verres progressifs</label><br />
          <label><input type="checkbox" name="verresSpeciaux" checked={form.verresSpeciaux} onChange={handleInput} /> Verres spéciaux</label><br />
          <label><input type="checkbox" name="traitements" checked={form.traitements} onChange={handleInput} /> Traitements</label><br /><br />
        </>
      )}

      {form.selectedApp === 'OptiCOM' && (
        <>
          <label>Libellé expéditeur SMS</label><br />
          <input name="libelleExpediteur" placeholder="Ex: Optique Martin" value={form.libelleExpediteur} onChange={handleInput} /><br /><br />
        </>
      )}

      <input type="file" accept="image/*" onChange={handleLogoUpload} /><br /><br />

      <button onClick={handleDownload}>
        {licence ? '💾 Enregistrer les modifications' : '📦 Télécharger dossier .zip'}
      </button>{' '}
      {onCancel && (
        <button onClick={onCancel} style={{ marginLeft: '10px' }}>
          ❌ Annuler
        </button>
      )}
    </div>
  );
};

export default LicenceEditor;
