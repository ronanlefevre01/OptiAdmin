import React, { useEffect, useState } from "react";
import type { Licence } from "./types";

interface Props {
  licence?: Licence;
  onSave: (licence: Licence) => void;
  onCancel?: () => void;
}

// Noms de clés pour sécuriser le typage
type FonctionKey = "avance" | "video" | "profil" | "ia";
type DemoKey = "verresProgressifs" | "verresSpeciaux" | "traitements";
type BaseKey =
  | "licenceId"
  | "nom"
  | "valideJusqu"
  | "cachet"
  | "libelleExpediteur"
  | "selectedApp";

const defaultLicence: Licence = {
  licenceId: "",
  nom: "",
  valideJusqu: "",
  cachet: "",
  fonctions: {
    avance: false,
    video: false,
    profil: false,
    ia: false,
  },
  verresProgressifs: false,
  verresSpeciaux: false,
  traitements: false,
  // même si optionnel, on peut initialiser à ""
  libelleExpediteur: "",
  selectedApp: "OptiMesure",
};

const isFonctionKey = (n: string): n is FonctionKey =>
  n === "avance" || n === "video" || n === "profil" || n === "ia";

const isDemoKey = (n: string): n is DemoKey =>
  n === "verresProgressifs" || n === "verresSpeciaux" || n === "traitements";

const isBaseKey = (n: string): n is BaseKey =>
  n === "licenceId" ||
  n === "nom" ||
  n === "valideJusqu" ||
  n === "cachet" ||
  n === "libelleExpediteur" ||
  n === "selectedApp";

const LicenceEditor: React.FC<Props> = ({ licence, onSave, onCancel }) => {
  const [form, setForm] = useState<Licence>(licence ?? defaultLicence);

  useEffect(() => {
    if (licence) setForm(licence);
  }, [licence]);

  function handleInput(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value, type } = e.target;
    const isCheckbox = type === "checkbox";
    const checked =
      (e.target as HTMLInputElement).checked !== undefined
        ? (e.target as HTMLInputElement).checked
        : false;

    if (isFonctionKey(name)) {
      setForm(prev => ({
        ...prev,
        fonctions: {
          ...prev.fonctions,
          [name]: checked,
        },
      }));
      return;
    }

    if (isDemoKey(name)) {
      setForm(prev => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    if (isBaseKey(name)) {
      // selectedApp est un union littéral → on caste la valeur
      if (name === "selectedApp") {
        setForm(prev => ({
          ...prev,
          selectedApp: value as Licence["selectedApp"],
        }));
        return;
      }

      setForm(prev => ({
        ...prev,
        [name]: isCheckbox ? checked : value,
      }));
      return;
    }

    // fallback (ne devrait pas arriver)
    setForm(prev => ({ ...prev }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setForm(prev => ({ ...prev, cachet: res }));
    };
    reader.readAsDataURL(file);
  }

  function handleDownload() {
    onSave(form);
  }

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>OptiAdmin - Générateur de licence</h1>

      <label>
        Application :{" "}
        <select name="selectedApp" value={form.selectedApp} onChange={handleInput}>
          <option value="OptiMesure">OptiMesure</option>
          <option value="OptiDemo">OptiDemo</option>
          <option value="OptiCOM">OptiCOM</option>
        </select>
      </label>
      <br />

      <input
        name="licenceId"
        placeholder="Clé licence (ex: ABCD-1234)"
        value={form.licenceId}
        onChange={handleInput}
      />
      <br />

      <input
        name="nom"
        placeholder="Nom opticien / société"
        value={form.nom}
        onChange={handleInput}
      />
      <br />

      <input
        name="valideJusqu"
        type="date"
        value={form.valideJusqu}
        onChange={handleInput}
      />
      <br />

      <textarea
        name="cachet"
        placeholder="Cachet ou mentions..."
        value={form.cachet}
        onChange={handleInput}
      />
      <br />

      {form.selectedApp === "OptiMesure" && (
        <>
          <label>
            <input
              type="checkbox"
              name="avance"
              checked={form.fonctions.avance}
              onChange={handleInput}
            />{" "}
            Mode avancé
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              name="video"
              checked={form.fonctions.video}
              onChange={handleInput}
            />{" "}
            Vidéo
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              name="profil"
              checked={form.fonctions.profil}
              onChange={handleInput}
            />{" "}
            Profil
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              name="ia"
              checked={form.fonctions.ia}
              onChange={handleInput}
            />{" "}
            IA
          </label>
          <br />
          <br />
        </>
      )}

      {form.selectedApp === "OptiDemo" && (
        <>
          <label>
            <input
              type="checkbox"
              name="verresProgressifs"
              checked={form.verresProgressifs}
              onChange={handleInput}
            />{" "}
            Verres progressifs
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              name="verresSpeciaux"
              checked={form.verresSpeciaux}
              onChange={handleInput}
            />{" "}
            Verres spéciaux
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              name="traitements"
              checked={form.traitements}
              onChange={handleInput}
            />{" "}
            Traitements
          </label>
          <br />
          <br />
        </>
      )}

      {form.selectedApp === "OptiCOM" && (
        <>
          <label>Libellé expéditeur SMS</label>
          <br />
          <input
            name="libelleExpediteur"
            placeholder="Ex: Optique Martin"
            value={form.libelleExpediteur ?? ""} 
            onChange={handleInput}
          />
          <br />
          <br />
        </>
      )}

      <input type="file" accept="image/*" onChange={handleLogoUpload} />
      <br />
      <br />

      <button onClick={handleDownload}>
        {licence ? "💾 Enregistrer les modifications" : "📦 Télécharger dossier .zip"}
      </button>{" "}
      {onCancel && (
        <button onClick={onCancel} style={{ marginLeft: 10 }}>
          ❌ Annuler
        </button>
      )}
    </div>
  );
};

export default LicenceEditor;
