// src/types.ts
export type LicencePlan = 'basic' | 'pro' | 'unlimited';

export type Licence = {
  id?: string;
  name: string;
  siret?: string;
  sender: string;                 // 3–11 A-Z/0-9
  plan: LicencePlan;
  credits: number;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};
