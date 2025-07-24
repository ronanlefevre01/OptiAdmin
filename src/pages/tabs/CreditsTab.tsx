import React, { useState } from "react"
import { Opticien } from "../OptiComAdmin"

interface AchatCredit {
  date: string
  montant: number
  credits: number
  modePaiement: string
}

interface CreditsTabProps {
  opticiens: Opticien[]
  onAddAchat: (opticienId: string, achat: AchatCredit) => void
}

const CreditsTab: React.FC<CreditsTabProps> = ({ opticiens, onAddAchat }) => {
  const [activeForm, setActiveForm] = useState<string | null>(null)
  const [formData, setFormData] = useState<AchatCredit>({
    date: new Date().toISOString().split("T")[0],
    montant: 0,
    credits: 0,
    modePaiement: "Stripe",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (opticienId: string) => {
    onAddAchat(opticienId, formData)
    setFormData({
      date: new Date().toISOString().split("T")[0],
      montant: 0,
      credits: 0,
      modePaiement: "Stripe",
    })
    setActiveForm(null)
  }

  return (
    <div className="space-y-8">
      {opticiens.map((opticien) => (
        <div key={opticien.id} className="border rounded-md p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">{opticien.nom}</h2>

          {opticien.achats && opticien.achats.length > 0 ? (
            <table className="w-full text-sm border mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 border-r">📅 Date</th>
                  <th className="text-left px-3 py-2 border-r">💳 Paiement</th>
                  <th className="text-left px-3 py-2 border-r">💰 Montant</th>
                  <th className="text-left px-3 py-2">🎯 Crédits</th>
                </tr>
              </thead>
              <tbody>
                {opticien.achats.map((achat, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-3 py-2">{achat.date}</td>
                    <td className="px-3 py-2">{achat.modePaiement}</td>
                    <td className="px-3 py-2">{achat.montant} €</td>
                    <td className="px-3 py-2">{achat.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm italic text-gray-500 mb-4">Aucun achat de crédits enregistré.</p>
          )}

          {activeForm === opticien.id ? (
            <div className="space-y-2 bg-gray-50 p-4 rounded-md border">
              <div className="grid grid-cols-2 gap-2">
                <input
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="border rounded px-2 py-1"
                />
                <select
                  name="modePaiement"
                  value={formData.modePaiement}
                  onChange={handleChange}
                  className="border rounded px-2 py-1"
                >
                  <option value="Stripe">Stripe</option>
                  <option value="GoCardless">GoCardless</option>
                  <option value="Autre">Autre</option>
                </select>
                <input
                  name="montant"
                  type="number"
                  placeholder="Montant €"
                  value={formData.montant}
                  onChange={handleChange}
                  className="border rounded px-2 py-1"
                />
                <input
                  name="credits"
                  type="number"
                  placeholder="Crédits"
                  value={formData.credits}
                  onChange={handleChange}
                  className="border rounded px-2 py-1"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleSubmit(opticien.id)} className="bg-blue-600 text-white px-3 py-1 rounded">
                  ✅ Ajouter
                </button>
                <button onClick={() => setActiveForm(null)} className="text-gray-600 hover:underline">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setActiveForm(opticien.id)} className="text-blue-600 hover:underline">
              ➕ Ajouter un achat
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export default CreditsTab
