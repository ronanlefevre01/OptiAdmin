import React from "react"
import { Opticien } from "../OptiComAdmin"

interface LicencesTabProps {
  opticiens: Opticien[]
  onEdit: (index: number) => void
  onDelete: (index: number) => void
}

const LicencesTab: React.FC<LicencesTabProps> = ({ opticiens, onEdit, onDelete }) => {
  return (
    <div className="space-y-4">
      {opticiens.length === 0 ? (
        <p>Aucune licence enregistrée.</p>
      ) : (
        opticiens.map((opt, index) => (
          <div key={opt.id} className="border rounded-md p-4 shadow-sm">
            <div className="font-semibold">{opt.nom}</div>
            <div className="text-sm text-gray-600">
              {opt.email} • {opt.telephone}
            </div>
            <div className="text-sm mt-1">
              Formule : <strong>{opt.formule}</strong> — <strong>{opt.credits}</strong> crédits
            </div>
            <div className="mt-2 space-x-2">
              <button onClick={() => onEdit(index)} className="text-blue-600 hover:underline">
                ✏️ Modifier
              </button>
              <button onClick={() => onDelete(index)} className="text-red-600 hover:underline">
                🗑️ Supprimer
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default LicencesTab
