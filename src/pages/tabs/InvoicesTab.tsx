import React from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Opticien } from '@/types/opticien'


interface Facture {
  id: string;
  date: string;
  type: string;
  details: string;
  montant: number;
  fichierPdf?: string;
}

interface Props {
  opticiens: (Opticien & { factures?: Facture[] })[];
}

const InvoicesTab: React.FC<Props> = ({ opticiens }) => {
  return (
    <div className="space-y-6">
      {opticiens.map((opt) => (
        <Card key={opt.id}>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">
              👓 {opt.nom} – {opt.abonnement?.formule}

            </h2>

            {Array.isArray(opt.factures) && opt.factures.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-1">📅 Date</th>
                    <th className="py-1">Type</th>
                    <th className="py-1">Détail</th>
                    <th className="py-1">💶 Montant</th>
                    <th className="py-1">📄 Facture</th>
                  </tr>
                </thead>
                <tbody>
                  {opt.factures.map((facture) => (
                    <tr key={facture.id} className="border-b">
                      <td className="py-1">{facture.date}</td>
                      <td className="py-1">{facture.type}</td>
                      <td className="py-1">{facture.details}</td>
                      <td className="py-1">
                        {Number.isFinite(facture.montant)
                          ? facture.montant.toFixed(2) + " €"
                          : "-"}
                      </td>
                      <td className="py-1">
                        {facture.fichierPdf ? (
                          <Button onClick={() => console.log("...")}>
                           Télécharger
                          </Button>
                        ) : (
                          <span className="text-muted-foreground italic">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted-foreground italic">Aucune facture enregistrée.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InvoicesTab;
