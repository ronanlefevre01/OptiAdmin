import React from "react";
import type { Opticien } from "../OptiComAdmin";
import { normalize } from "./utils";

type Props = {
  opticiens: any[];
  onUpdateAbonnement?: (opticienId: string, abo: any) => void;
  onCancelAbonnement?: (opticienId: string, mandateId?: string) => void;
};

const SubscriptionsTab: React.FC<Props> = ({
  opticiens,
  onUpdateAbonnement,
  onCancelAbonnement,
}) => {
  if (!Array.isArray(opticiens) || opticiens.length === 0) {
    return <p>Aucune donnée d’abonnement.</p>;
  }

  return (
    <div className="space-y-4">
      {opticiens.map((optRaw, i) => {
        const n = normalize(optRaw);
        return (
          <div key={n.id || i} className="border rounded-md p-4 shadow-sm">
            <div className="text-lg font-semibold">{n.enseigne}</div>
            <div className="text-sm text-gray-600">
              Licence&nbsp;: <span className="font-mono">{n.licenceKey}</span>
            </div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>Formule&nbsp;: <strong>{n.formule}</strong></div>
              <div>Crédits&nbsp;: <strong>{n.credits}</strong></div>
              <div>Mandate ID&nbsp;: <span className="font-mono">{n.mandateId || "—"}</span></div>
              <div>Subscription ID&nbsp;: <span className="font-mono">{n.subscriptionId || "—"}</span></div>
              <div>Renouvellement/échéance&nbsp;: {n.renouvellement || "—"}</div>
              <div>
                Résiliation&nbsp;:
                {n.resiliationDemandee
                  ? ` demandée (${n.dateResiliation || "date à venir"})`
                  : " aucune"}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => onCancelAbonnement?.(n.id, n.mandateId)}
                disabled={!n.id}
                title={!n.id ? "Identifiant manquant" : ""}
              >
                🛑 Annuler l’abonnement (GC)
              </button>
              {/* Exemple d’update (si tu veux activer un futur changement de formule côté admin) */}
              {/* <button className="px-3 py-1 border rounded"
                onClick={() => onUpdateAbonnement?.(n.id, { statut: "Actif" })}>Forcer actif</button> */}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SubscriptionsTab;
