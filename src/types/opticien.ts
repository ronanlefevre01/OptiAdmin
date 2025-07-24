export interface Facture {
  id: string;
  date: string;
  type: string;
  details: string;
  montant: number;
  fichierPdf?: string;
}

export interface SmsEnvoye {
  id: string;
  date: string;
  type: string;
  contenu: string;
}

export interface Opticien {
  id: string;
  nom: string;
  siret: string;
  email: string;
  telephone: string;
  adresse: string;
  abonnement: {
    statut: 'Actif' | 'Suspendu' | 'Annulé';
    dateDebut: string;
    dateFin: string;
    formule: 'starter' | 'pro' | 'premium' | 'à la carte';
  };
  gocardlessMandatId?: string;
  credits?: number;
  achats?: {
    date: string;
    type: string;
    montant: number;
  }[];
  achatCredit?: number;
  historiqueSms?: SmsEnvoye[];
  factures?: Facture[];
}
