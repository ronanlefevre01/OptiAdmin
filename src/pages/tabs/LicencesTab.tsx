import React from "react";
import type { Opticien } from "../OptiComAdmin";

interface LicencesTabProps {
  opticiens: any[]; // on accepte les 2 schémas
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onChangeFormule?: (opticienId: string, formule: Opticien["formule"]) => void;
  onChangeCredits?: (opticienId: string, delta: number) => void;
}

// Normalise une ligne quelle que soit la forme (plate vs serveur)
function normalizeRow(raw: any) {
  const o = raw?.opticien || raw || {};
  const id = String(raw?.id || o?.id || "");
  const enseigne = o?.enseigne || raw?.nom || o?.nom || "—";
  const email = raw?.email || o?.email || "—";
  const telephone = raw?.telephone || o?.telephone || "—";
  const siret = raw?.siret || o?.siret || "—";
  const formule = raw?.formule || raw?.abonnement || "—";
  const credits = typeof raw?.credits === "number" ? raw.credits : 0;
  const licenceKey = raw?.licence || "—";
  const sender = raw?.libelleExpediteur || "—";
  const created =
    raw?.dateCreation
      ? new Date(raw.dateCreation).toLocaleDateString("fr-FR")
      : undefined;

  return { id, enseigne, email, telephone, siret, formule, credits, licenceKey, sender, created };
}

const FORMULES: Opticien["formule"][] = ["Starter", "Pro", "Premium", "À la carte"];

const LicencesTab: React.FC<LicencesTabProps> = ({
  opticiens,
  onEdit,
  onDelete,
  onChangeFormule,
  onChangeCredits
}) => {
  if (!Array.isArray(opticiens) || opticiens.length === 0) {
    return <p>Aucune licence enregistrée.</p>;
  }

  return (
    <div className="space-y-4">
      {opticiens.map((opt, index) => {
        const row = normalizeRow(opt);

        return (
          <div key={row.id || index} className="border rounded-md p-4 shadow-sm">
            <div className="flex flex-col gap-1">
              <div className="text-lg font-semibold">{row.enseigne}</div>
              <div className="text-sm text-gray-600">
                {row.email} • {row.telephone}
              </div>

              <div className="text-sm text-gray-600">
                SIRET&nbsp;: <span className="font-mono">{row.siret}</span>
              </div>

              <div className="text-sm mt-1">
                Formule&nbsp;:&nbsp;
                <strong>{row.formule}</strong>
                &nbsp;—&nbsp;<strong>{row.credits}</strong>&nbsp;crédits
              </div>

              <div className="text-sm text-gray-600">
                Licence&nbsp;: <span className="font-mono">{row.licenceKey}</span>
              </div>

              <div className="text-sm text-gray-600">
                Expéditeur SMS&nbsp;: <span className="font-mono">{row.sender}</span>
              </div>

              {row.created && (
                <div className="text-xs text-gray-500">
                  Créée le {row.created}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => onEdit(index)}
                className="text-blue-600 hover:underline"
              >
                ✏️ Modifier
              </button>
              <button
                onClick={() => onDelete(index)}
                className="text-red-600 hover:underline"
              >
                🗑️ Supprimer
              </button>
            </div>

            {/* Outils rapides : changer formule / ajuster crédits */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Changer la formule</span>
                <select
                  className="border rounded px-2 py-1"
                  value={FORMULES.includes(row.formule as any) ? (row.formule as any) : "Starter"}
                  onChange={(e) =>
                    onChangeFormule?.(row.id, e.target.value as Opticien["formule"])
                  }
                >
                  {FORMULES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm">Ajuster les crédits</span>
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => onChangeCredits?.(row.id, -100)}
                >
                  −100
                </button>
                <span className="text-sm opacity-70">{row.credits}</span>
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => onChangeCredits?.(row.id, +100)}
                >
                  +100
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LicencesTab;
