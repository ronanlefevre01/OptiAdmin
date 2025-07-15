import React from 'react';

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

interface Props {
  form: Licence;
  setForm: React.Dispatch<React.SetStateAction<Licence>>;
  selectedApp: string;
  setSelectedApp: (app: string) => void;
  handleInput: (e: React.ChangeEvent<any>) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDownload: () => void;
  editIndex: number | null;
}

const LicenceEditor: React.FC<Props> = ({
  form,
  setForm,
  selectedApp,
  setSelectedApp,
  handleInput,
  handleLogoUpload,
  handleDownload,
  editIndex
}) => {

  if (!form) return <div>Chargement...</div>;

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>OptiAdmin - Générateur de licence</h1>

      <label>
        Application :
        <select value={selectedApp} onChange={handleInput} name="selectedApp">
          <option value="OptiMesure">OptiMesure</option>
          <option value="OptiDemo">OptiDemo</option>
        </select>
      </label><br />

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
    </div>
  );
};

export default LicenceEditor;
