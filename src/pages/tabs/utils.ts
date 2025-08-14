// src/pages/tabs/utils.ts
export type Normalized = {
  id: string;
  enseigne: string;
  email: string;
  telephone: string;
  siret: string;
  adresse1: string;
  codePostal: string;
  ville: string;
  pays: string;
  formule: string;
  credits: number;
  licenceKey: string;
  cgvAccepted: boolean;
  factures: any[];
  sms: Array<{ date?: string; type?: string; message?: string; credits?: number }>;
  abonnement: any;
  mandateId?: string;
  subscriptionId?: string;
  renouvellement?: string | null;
  resiliationDemandee?: boolean;
  dateResiliation?: string | null;
};

export function normalize(raw: any): Normalized {
  const o = raw?.opticien || raw || {};
  const id =
    (raw?.id && String(raw.id)) ||
    (raw?.licence && String(raw.licence)) ||
    (o?.id && String(o.id)) ||
    "";

  return {
    id,
    enseigne: o?.enseigne || raw?.nom || o?.nom || "—",
    email: o?.email || raw?.email || "—",
    telephone: o?.telephone || raw?.telephone || "—",
    siret: o?.siret || raw?.siret || "—",
    adresse1: o?.adresse || raw?.adresse || "",
    codePostal: o?.codePostal || raw?.codePostal || "",
    ville: o?.ville || raw?.ville || "",
    pays: o?.pays || raw?.pays || "FR",
    formule: raw?.formule || raw?.abonnement?.formule || raw?.abonnement || "—",
    credits: Number.isFinite(raw?.credits) ? Number(raw.credits) : 0,
    licenceKey: raw?.licence || "—",
    cgvAccepted:
      typeof raw?.cgvAccepted === "boolean" ? raw.cgvAccepted : !!raw?.cgv?.accepted,
    factures: Array.isArray(raw?.factures) ? raw.factures : [],
    sms: Array.isArray(raw?.historiqueSms)
      ? raw.historiqueSms
      : Array.isArray(raw?.sms)
      ? raw.sms
      : [],
    abonnement: raw?.abonnement || {},
    mandateId: raw?.mandateId,
    subscriptionId: raw?.subscriptionId,
    renouvellement: raw?.renouvellement || raw?.next_payment_date || null,
    resiliationDemandee:
      !!raw?.resiliationDemandee || !!raw?.resiliationDate || !!raw?.resiliation_date,
    dateResiliation: raw?.dateResiliation || raw?.resiliationDate || null,
  };
}

export function AdresseBloc(n: Normalized) {
  const lignes = [
    n.enseigne,
    n.adresse1,
    [n.codePostal, n.ville].filter(Boolean).join(" "),
    n.pays || "FR",
    n.siret ? `SIRET : ${n.siret}` : "",
  ].filter(Boolean);
  return lignes.join("\n");
}
