import React from "react";
import { normalize } from "./utils";

type Props = { opticiens: any[] };

const SmsUsageTab: React.FC<Props> = ({ opticiens }) => {
  if (!Array.isArray(opticiens) || opticiens.length === 0) {
    return <p>Aucune consommation.</p>;
  }

  return (
    <div className="space-y-6">
      {opticiens.map((raw, i) => {
        const n = normalize(raw);
        const logs = n.sms || [];
        const total = logs.length;

        return (
          <div key={n.id || i} className="border rounded-md p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-semibold">{n.enseigne}</div>
              <div className="text-sm text-gray-600">{total} SMS envoyés</div>
            </div>

            {total === 0 ? (
              <p className="text-sm text-gray-500 mt-2">Aucun historique disponible.</p>
            ) : (
              <table className="w-full text-sm mt-3">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-1">Date</th>
                    <th className="py-1">Type</th>
                    <th className="py-1">Crédits</th>
                    <th className="py-1">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 10).map((m, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-1">{m.date ? new Date(m.date).toLocaleString("fr-FR") : "—"}</td>
                      <td className="py-1">{m.type || "—"}</td>
                      <td className="py-1">{typeof m.credits === "number" ? m.credits : 1}</td>
                      <td className="py-1">{(m.message || "").slice(0, 80)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SmsUsageTab;
