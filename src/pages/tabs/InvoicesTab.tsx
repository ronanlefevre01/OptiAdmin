import React, { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { AdresseBloc, normalize } from "./utils";

// Type “UI” compatible ancien (fichierPdf) + nouveau (urlPdf, numero)
type FactureUI = {
  id: string;
  date: string;
  type: string;
  details?: string;
  montant?: number;
  fichierPdf?: string;
  urlPdf?: string;
  numero?: string;
};

interface Props {
  opticiens: any[]; // données mixtes
  onAttachInvoice?: (
    opticienId: string,
    facture: Omit<FactureUI, "id" | "fichierPdf">
  ) => void;
}

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
    montant?: string;
    urlPdf: string;
  };
}

const InvoicesTab: React.FC<Props> = ({ opticiens, onAttachInvoice }) => {
  const [forms, setForms] = useState<Record<string, ReturnType<typeof emptyForm>>>({});

  const ensureForm = (id: string) => {
    if (!forms[id]) setForms((prev) => ({ ...prev, [id]: emptyForm() }));
  };
  const setField = (id: string, field: keyof ReturnType<typeof emptyForm>, value: string) => {
    setForms((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSubmit = (opticienId: string) => {
    const f = forms[opticienId] || emptyForm();
    if (!f.urlPdf) return alert("L'URL du PDF est obligatoire.");
    if (!f.date) return alert("La date est obligatoire.");

    const montantNumber =
      f.montant !== undefined && f.montant !== ""
        ? Number(String(f.montant).replace(",", "."))
        : undefined;

    onAttachInvoice?.(opticienId, {
      numero: f.numero || undefined,
      date: f.date,
      type: f.type,
      details: f.details || undefined,
      montant: typeof montantNumber === "number" && !isNaN(montantNumber) ? montantNumber : undefined,
      urlPdf: f.urlPdf,
    });

    setForms((prev) => ({ ...prev, [opticienId]: emptyForm() }));
  };

  return (
    <div className="space-y-6">
      {opticiens.map((raw) => {
        const n = normalize(raw);
        const form = forms[n.id] || emptyForm();
        const factures = Array.isArray(raw?.factures) ? raw.factures : [];

        // URL download
        const toHref = (f: FactureUI) =>
          f.urlPdf
            ? f.urlPdf
            : f.fichierPdf
            ? `https://opticom-sms-server.onrender.com/factures/${f.fichierPdf}`
            : undefined;

        return (
          <Card key={n.id}>
            <CardContent className="p-4">
              <div className="mb-3">
                <div className="text-lg font-semibold">{n.enseigne}</div>
                <pre className="text-xs bg-gray-50 border rounded p-2 whitespace-pre-wrap">
                  {AdresseBloc(n)}
                </pre>
              </div>

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
                    {factures.map((f: FactureUI) => {
                      const ht = typeof f.montant === "number" ? f.montant : 0;
                      const tva = ht * 0.2;
                      const ttc = ht + tva;
                      const href = toHref(f);

                      return (
                        <tr key={f.id} className="border-b">
                          <td className="py-1">{f.numero || "—"}</td>
                          <td className="py-1">{f.date}</td>
                          <td className="py-1">{f.type}</td>
                          <td className="py-1">{f.details || "—"}</td>
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
                <p className="text-muted-foreground italic mb-4">Aucune facture enregistrée.</p>
              )}

              {/* Attacher une facture EXISTANTE (URL complète) */}
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
                      onChange={(e) => setField(n.id, "numero", e.target.value)}
                      onFocus={() => ensureForm(n.id)}
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs text-gray-600">Date</span>
                    <input
                      type="date"
                      className="w-full border rounded p-2"
                      value={form.date}
                      onChange={(e) => setField(n.id, "date", e.target.value)}
                      onFocus={() => ensureForm(n.id)}
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs text-gray-600">Type</span>
                    <select
                      className="w-full border rounded p-2"
                      value={form.type}
                      onChange={(e) => setField(n.id, "type", e.target.value)}
                      onFocus={() => ensureForm(n.id)}
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
                      onChange={(e) => setField(n.id, "details", e.target.value)}
                      onFocus={() => ensureForm(n.id)}
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs text-gray-600">Montant HT (€)</span>
                    <input
                      className="w-full border rounded p-2"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={form.montant || ""}
                      onChange={(e) => setField(n.id, "montant", e.target.value)}
                      onFocus={() => ensureForm(n.id)}
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-xs text-gray-600">URL complète du PDF</span>
                    <input
                      className="w-full border rounded p-2"
                      placeholder="https://.../factures/FAC-2025-001.pdf"
                      value={form.urlPdf}
                      onChange={(e) => setField(n.id, "urlPdf", e.target.value)}
                      onFocus={() => ensureForm(n.id)}
                    />
                  </label>
                </div>

                <div className="mt-3 text-right">
                  <Button onClick={() => handleSubmit(n.id)}>Attacher</Button>
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
