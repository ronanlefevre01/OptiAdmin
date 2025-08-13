import React, { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Opticien } from "@/types/opticien";

// --- Types ---
// Facture "UI" compatible avec:
//  - ancien schéma: { fichierPdf }
//  - nouveau schéma: { urlPdf, numero }
type FactureUI = {
  id: string;
  date: string;          // YYYY-MM-DD
  type: string;          // "Abonnement" | "Achat de crédits" | "Autre" | ...
  details?: string;
  montant?: number;      // HT (affichage)
  fichierPdf?: string;   // (ancien) nom de fichier sur ton serveur
  urlPdf?: string;       // (nouveau) URL complète
  numero?: string;       // (nouveau) numéro de facture
};

interface Props {
  opticiens: (Opticien & { factures?: FactureUI[] })[];
  // callback fourni par OptiComAdmin → ATTACHE une facture déjà générée
  onAttachInvoice?: (
    opticienId: string,
    facture: Omit<FactureUI, "id" | "fichierPdf">
  ) => void;
}

// Form par opticien
function emptyForm() {
  return {
    numero: "",
    date: new Date().toISOString().slice(0, 10),
    type: "Achat de crédits",
    details: "",
    montant: "",
    urlPdf: "",
  } as {
    numero?: string;
    date: string;
    type: string;
    details?: string;
    montant?: string; // string dans le form, converti en number au submit
    urlPdf: string;
  };
}

const InvoicesTab: React.FC<Props> = ({ opticiens, onAttachInvoice }) => {
  const [forms, setForms] = useState<Record<string, ReturnType<typeof emptyForm>>>({});

  const ensureForm = (id: string) => {
    if (!forms[id]) setForms((prev) => ({ ...prev, [id]: emptyForm() }));
  };
  const setField = (
    id: string,
    field: keyof ReturnType<typeof emptyForm>,
    value: string
  ) => {
    setForms((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSubmit = (opticienId: string) => {
    const f = forms[opticienId] || emptyForm();
    if (!f.urlPdf) {
      alert("L'URL complète du PDF est obligatoire.");
      return;
    }
    if (!f.date) {
      alert("La date est obligatoire.");
      return;
    }
    const montantNumber =
      f.montant !== undefined && f.montant !== ""
        ? Number(String(f.montant).replace(",", "."))
        : undefined;

    onAttachInvoice?.(opticienId, {
      numero: f.numero || undefined,
      date: f.date,
      type: f.type,
      details: f.details || undefined,
      montant:
        typeof montantNumber === "number" && !isNaN(montantNumber)
          ? montantNumber
          : undefined,
      urlPdf: f.urlPdf, // utilisé tel quel, sans réécriture
    });

    setForms((prev) => ({ ...prev, [opticienId]: emptyForm() }));
  };

  return (
    <div className="space-y-6">
      {opticiens.map((opt) => {
        const form = forms[opt.id] || emptyForm();
        const factures = Array.isArray(opt.factures) ? opt.factures : [];

        return (
          <Card key={opt.id}>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-3">
                👓 {opt.nom} {opt?.abonnement && (opt as any).abonnement?.formule ? `– ${(opt as any).abonnement.formule}` : ""}
              </h2>

              {/* Tableau des factures existantes */}
              {factures.length > 0 ? (
                <table className="w-full text-sm mb-4">
                  <thead className="text-left border-b">
                    <tr>
                      <th className="py-1">#</th>
                      <th className="py-1">📅 Date</th>
                      <th className="py-1">Type</th>
                      <th className="py-1">Détail</th>
                      <th className="py-1">HT</th>
                      <th className="py-1">TVA (20 %)</th>
                      <th className="py-1">TTC</th>
                      <th className="py-1">📄 Facture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factures.map((facture) => {
                      const ht = typeof facture.montant === "number" ? facture.montant : 0;
                      const tva = ht * 0.2;
                      const ttc = ht + tva;

                      // URL de téléchargement:
                      // 1) priorité au nouveau champ urlPdf (URL complète),
                      // 2) sinon fallback ancien champ fichierPdf (hébergé sur ton serveur),
                      // 3) sinon N/A.
                      const href = facture.urlPdf
                        ? facture.urlPdf
                        : facture.fichierPdf
                        ? `https://opticom-sms-server.onrender.com/factures/${facture.fichierPdf}`
                        : undefined;

                      return (
                        <tr key={facture.id} className="border-b">
                          <td className="py-1">{facture.numero || "—"}</td>
                          <td className="py-1">{facture.date}</td>
                          <td className="py-1">{facture.type}</td>
                          <td className="py-1">{facture.details || "—"}</td>
                          <td className="py-1">{ht.toFixed(2)} €</td>
                          <td className="py-1">{tva.toFixed(2)} €</td>
                          <td className="py-1">{ttc.toFixed(2)} €</td>
                          <td className="py-1">
                            {href ? (
                              <a href={href} target="_blank" rel="noopener noreferrer">
                                <Button>Télécharger</Button>
                              </a>
                            ) : (
                              <span className="text-muted-foreground italic">N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted-foreground italic mb-4">
                  Aucune facture enregistrée.
                </p>
              )}

              {/* Formulaire: attacher une facture EXISTANTE (URL complète) */}
              <div className="border rounded-md p-3 bg-gray-50">
                <div className="text-sm font-medium mb-2">
                  Attacher une facture existante
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                  <label className="block">
                    <span className="text-xs text-gray-600">Numéro</span>
                    <input
                      className="w-full border rounded p-2"
                      placeholder="FAC-2025-001"
                      value={form.numero || ""}
                      onChange={(e) => setField(opt.id, "numero", e.target.value)}
                      onFocus={() => ensureForm(opt.id)}
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs text-gray-600">Date</span>
                    <input
                      type="date"
                      className="w-full border rounded p-2"
                      value={form.date}
                      onChange={(e) => setField(opt.id, "date", e.target.value)}
                      onFocus={() => ensureForm(opt.id)}
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs text-gray-600">Type</span>
                    <select
                      className="w-full border rounded p-2"
                      value={form.type}
                      onChange={(e) => setField(opt.id, "type", e.target.value)}
                      onFocus={() => ensureForm(opt.id)}
                    >
                      <option value="Achat de crédits">Achat de crédits</option>
                      <option value="Abonnement">Abonnement</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs text-gray-600">Détails</span>
                    <input
                      className="w-full border rounded p-2"
                      placeholder="ex: 300 crédits"
                      value={form.details || ""}
                      onChange={(e) => setField(opt.id, "details", e.target.value)}
                      onFocus={() => ensureForm(opt.id)}
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs text-gray-600">Montant HT (€)</span>
                    <input
                      className="w-full border rounded p-2"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={form.montant || ""}
                      onChange={(e) => setField(opt.id, "montant", e.target.value)}
                      onFocus={() => ensureForm(opt.id)}
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-xs text-gray-600">URL complète du PDF</span>
                    <input
                      className="w-full border rounded p-2"
                      placeholder="https://.../factures/FAC-2025-001.pdf"
                      value={form.urlPdf}
                      onChange={(e) => setField(opt.id, "urlPdf", e.target.value)}
                      onFocus={() => ensureForm(opt.id)}
                    />
                  </label>
                </div>

                <div className="mt-3 text-right">
                  <Button onClick={() => handleSubmit(opt.id)}>Attacher</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default InvoicesTab;
