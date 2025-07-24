import React from "react"
import { Opticien } from "../OptiComAdmin"

interface SmsUsageTabProps {
  opticiens: Opticien[]
}

const SmsUsageTab: React.FC<SmsUsageTabProps> = ({ opticiens }) => {
  // Créer un objet de statistiques par opticien et par mois
  const stats: Record<string, Record<string, { totalSms: number; totalCredits: number }>> = {}

  opticiens.forEach((opt) => {
    opt.historiqueSms?.forEach((sms) => {
      const mois = new Date(sms.date).toLocaleString("fr-FR", {
        month: "long",
        year: "numeric",
      })

      if (!stats[opt.nom]) stats[opt.nom] = {}
      if (!stats[opt.nom][mois]) stats[opt.nom][mois] = { totalSms: 0, totalCredits: 0 }

      stats[opt.nom][mois].totalSms += 1
      stats[opt.nom][mois].totalCredits += sms.credits
    })
  })

  const lignes = Object.entries(stats).flatMap(([opticien, moisStats]) =>
    Object.entries(moisStats).map(([mois, values]) => ({
      opticien,
      mois,
      ...values,
    }))
  )

  if (lignes.length === 0) {
    return <p className="italic text-gray-500">Aucun SMS envoyé pour l’instant.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-3 py-2 border-r">📅 Mois</th>
            <th className="px-3 py-2 border-r">👓 Opticien</th>
            <th className="px-3 py-2 border-r">✉️ SMS envoyés</th>
            <th className="px-3 py-2">🔢 Crédits utilisés</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((line, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2">{line.mois}</td>
              <td className="px-3 py-2">{line.opticien}</td>
              <td className="px-3 py-2">{line.totalSms}</td>
              <td className="px-3 py-2">{line.totalCredits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// À ajouter à la fin du fichier
export default SmsUsageTab;

