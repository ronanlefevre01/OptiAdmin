import React from "react"
import type { Opticien } from "../OptiComAdmin"

interface LicencesTabProps {
  opticiens: Opticien[]
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  // ⭐️ nouveaux callbacks
  onChangeFormule?: (opticienId: string, formule: Opticien['formule']) => void
  onChangeCredits?: (opticienId: string, delta: number) => void
}

const plans: Opticien['formule'][] = ["Starter", "Pro", "Premium", "À la carte"]

const LicencesTab: React.FC<LicencesTabProps> = ({ opticiens, onEdit, onDelete, onChangeFormule, onChangeCredits }) => {
  return (
    <div className="space-y-4">
      {opticiens.length === 0 ? (
        <p>Aucune licence enregistrée.</p>
      ) : (
        opticiens.map((opt, index) => (
          <div key={opt.id} className="border rounded-md p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{opt.nom}</div>
                <div className="text-sm text-gray-600">{opt.email} • {opt.telephone}</div>
                <div className="text-sm mt-1">
                  Formule : <strong>{opt.formule}</strong> — <strong>{opt.credits}</strong> crédits
                </div>
              </div>
              <div className="mt-1 space-x-2 shrink-0">
                <button onClick={() => onEdit(index)} className="text-blue-600 hover:underline">✏️ Modifier</button>
                <button onClick={() => onDelete(index)} className="text-red-600 hover:underline">🗑️ Supprimer</button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sélection de la formule */}
              <label className="block">
                <span className="text-xs text-gray-600">Changer la formule</span>
                <select
                  className="mt-1 w-full border rounded-md p-2"
                  value={opt.formule}
                  onChange={(e) => onChangeFormule?.(opt.id, e.target.value as Opticien['formule'])}
                >
                  {plans.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>

              {/* Ajustement rapide des crédits */}
              <div>
                <div className="text-xs text-gray-600">Ajuster les crédits</div>
                <div className="mt-1 inline-flex items-center gap-2">
                  <button
                    className="px-2 py-1 border rounded-md"
                    onClick={() => onChangeCredits?.(opt.id, -100)}
                    title="Retirer 100 crédits"
                  >
                    −100
                  </button>
                  <span className="font-semibold">{opt.credits}</span>
                  <button
                    className="px-2 py-1 border rounded-md"
                    onClick={() => onChangeCredits?.(opt.id, +100)}
                    title="Ajouter 100 crédits"
                  >
                    +100
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default LicencesTab
