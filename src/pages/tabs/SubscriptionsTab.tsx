import React, { useState } from "react"
import { Opticien } from "../OptiComAdmin"

interface SubscriptionsTabProps {
  opticiens: Opticien[]
  onUpdateAbonnement: (opticienId: string, abonnement: Opticien["abonnement"]) => void
  onCancelAbonnement: (opticienId: string, mandateId?: string) => void
}

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({
  opticiens,
  onUpdateAbonnement,
  onCancelAbonnement,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    formule: "Starter",
    dateFin: "",
  })

  const abonnés = opticiens.filter((opt) => opt.formule !== "À la carte")

  const handleEditClick = (opt: Opticien) => {
    setEditingId(opt.id)
    setFormData({
      formule: opt.formule,
      dateFin: opt.abonnement?.dateFin || "",
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = (opt: Opticien) => {
    const updated = {
      ...opt.abonnement,
      dateFin: formData.dateFin,
      statut: "Actif",
    }
    onUpdateAbonnement(opt.id, updated)
    setEditingId(null)
  }

  const handleCancelClick = (opt: Opticien) => {
    if (confirm("Résilier cet abonnement ?")) {
      onCancelAbonnement(opt.id, opt.abonnement?.gocardlessMandateId)
    }
  }

  return (
    <div className="space-y-6">
      {abonnés.length === 0 ? (
        <p className="italic text-gray-500">Aucun abonnement actif.</p>
      ) : (
        abonnés.map((opt) => (
          <div key={opt.id} className="border p-4 rounded shadow-sm">
            <div className="font-semibold text-lg mb-1">{opt.nom}</div>
            <div className="text-sm text-gray-600 mb-2">{opt.email} – {opt.telephone}</div>

            {editingId === opt.id ? (
              <div className="space-y-2">
                <select
                  name="formule"
                  value={formData.formule}
                  disabled
                  className="border px-2 py-1 rounded"
                >
                  <option value="Starter">Starter</option>
                  <option value="Pro">Pro</option>
                  <option value="Premium">Premium</option>
                </select>
                <input
                  type="date"
                  name="dateFin"
                  value={formData.dateFin}
                  onChange={handleChange}
                  className="border px-2 py-1 rounded"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleSave(opt)} className="bg-blue-600 text-white px-3 py-1 rounded">💾 Enregistrer</button>
                  <button onClick={() => setEditingId(null)} className="text-gray-500">Annuler</button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-sm">
                  Formule : <strong>{opt.formule}</strong><br />
                  Début : {opt.abonnement?.dateDebut}<br />
                  Renouvellement : {opt.abonnement?.dateFin}<br />
                  Statut : <span className={`font-semibold ${opt.abonnement?.statut === "Actif" ? "text-green-600" : "text-red-600"}`}>
                    {opt.abonnement?.statut}
                  </span>
                </div>

                <div className="mt-2 space-x-3">
                  <button onClick={() => handleEditClick(opt)} className="text-blue-600 hover:underline">✏️ Modifier</button>
                  <button onClick={() => handleCancelClick(opt)} className="text-red-600 hover:underline">⛔ Résilier</button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  )
}

export default SubscriptionsTab
