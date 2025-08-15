// src/types.ts
export type SelectedApp = 'OptiMesure' | 'OptiDemo' | 'OptiCOM';

export interface Licence {
  licenceId: string;
  nom: string;
  valideJusqu: string; // YYYY-MM-DD
  cachet: string;

  // OptiMesure – fonctions
  fonctions: {
    avance: boolean;
    video: boolean;
    profil: boolean;
    ia: boolean;
  };

  // OptiDemo – flags
  verresProgressifs: boolean;
  verresSpeciaux: boolean;
  traitements: boolean;

  // OptiCOM – peut ne pas être défini sur les autres apps
  libelleExpediteur?: string;  // <- OPTIONNEL

  selectedApp: SelectedApp;
}
