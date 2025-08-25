// LicencesTab.tsx
import React from "react";
import type { Opticien } from "../OptiComAdmin";

// ⚠️ adapte ces chemins si besoin selon l’emplacement du fichier
import { api } from "../../lib/api";
import { getAdminToken } from "../../lib/adminAuth";

interface LicencesTabProps {
  opticiens: any[];
  onEdit: (index: number) => void;
  onDelete: (index: number) => void; // retirer localement après succès API
  onChangeFormule?: (opticienId: string, formule: Opticien["formule"]) => void;
  onChangeCredits?: (opticienId: string, delta: number) => void;
}

// Normalise une ligne quelle que soit la forme (plate vs “serveur”)
function normalizeRow(raw: any) {
  const o = raw?.opticien || raw || {};

  const id =
    (raw?.id && String(raw.id)) ||
    (raw?.licence && String(raw.licence)) ||
    (o?.id && String(o.id)) ||
    "";

  const enseigne   = o?.enseigne || raw?.nom || o?.nom || "—";
  const email      = raw?.email || o?.email || "—";
  const telephone  = raw?.telephone || o?.telephone || "—";
  const siret      = raw?.siret || o?.siret || "—";

  const formule =
    raw?.formule ||
    raw?.abonnement?.formule ||
    raw?.abonnement ||
    "—";

  const credits    = typeof raw?.credits === "number" ? raw.credits : 0;
  const licenceKey = raw?.licence || "—";
  const sender     = raw?.libelleExpediteur || "—";

  const created = raw?.dateCreation
    ? new Date(raw.dateCreation).toLocaleDateString("fr-FR")
    : undefined;

  const cgvAccepted =
    typeof raw?.cgvAccepted === "boolean" ? raw.cgvAccepted : !!raw?.cgv?.accepted;

  const cgvVersion        = raw?.cgvAcceptedVersion ?? raw?.cgv?.acceptedVersion ?? null;
  const cgvCurrentVersion = raw?.cgvCurrentVersion ?? raw?.cgv?.currentVersion ?? null;
  const cgvAt             = raw?.cgv?.acceptedAt ? new Date(raw.cgv.acceptedAt).toLocaleString("fr-FR") : null;

  return {
    id,
    enseigne,
    email,
    telephone,
    siret,
    formule,
    credits,
    licenceKey,
    sender,
    created,
    cgvAccepted,
    cgvVersion,
    cgvCurrentVersion,
    cgvAt,
  };
}

const FORMULES: Opticien["formule"][] = ["Starter", "Pro", "Premium", "À la carte"];

const LicencesTab: React.FC<LicencesTabProps> = ({
  opticiens,
  onEdit,
  onDelete,
  onChangeFormule,
  onChangeCredits,
}) => {
  if (!Array.isArray(opticiens) || opticiens.length === 0) {
    return <p>Aucune licence enregistrée.</p>;
  }

  async function handleDelete(row: ReturnType<typeof normalizeRow>, index: number) {
    const sure = window.confirm(
      `Supprimer définitivement la licence « ${row.enseigne} » ?\n\n` +
      `Cela la retire aussi de JSONBin et déconnectera l’app liée.`
    );
    if (!sure) return;

    const token = getAdminToken();
    if (!token) {
      alert("Session admin expirée. Merci de vous reconnecter.");
      return;
    }

    try {
      // Priorité ID ; sinon suppression par clé
      let url = "";
      if (row.id && row.id !== "—") {
        url = api(`/api/admin/secure/licences/${encodeURIComponent(row.id)}`);
      } else if (row.licenceKey && row.licenceKey !== "—") {
        const q = new URLSearchParams({ cle: String(row.licenceKey) }).toString();
        url = api(`/api/admin/secure/licences?${q}`);
      } else {
        alert("Impossible de déterminer l’identifiant ou la clé de la licence.");
        return;
      }

      const resp = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Essaye de décoder la réponse JSON, même en cas d’erreur
      let j: any = {};
      try { j = await resp.json(); } catch { /* noop */ }

      if (resp.status === 401) throw new Error("UNAUTHORIZED");
      if (resp.status === 404) throw new Error("LICENCE_NOT_FOUND");
      if (!resp.ok || j?.ok === false) {
        throw new Error(j?.error || `HTTP ${resp.status}`);
      }

      onDelete(index); // succès : retire localement
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg === "UNAUTHORIZED") {
        alert("Non autorisé. Veuillez vous reconnecter à OptiAdmin.");
      } else if (msg === "LICENCE_NOT_FOUND") {
        alert("Licence introuvable (déjà supprimée ?). La liste locale va être rafraîchie.");
      } else {
        alert(`Échec de la suppression: ${msg}`);
      }
    }
  }

  return (
    <div className="space-y-4">
      {opticiens.map((opt, index) => {
        const row = normalizeRow(opt);
        const hasId = !!row.id;

        return (
          <div key={row.id || row.licenceKey || index} className="border rounded-md p-4 shadow-sm">
            <div className="flex flex-col gap-1">
              <div className="text-lg font-semibold">{row.enseigne}</div>

              <div className="text-sm text-gray-600">
                {row.email} • {row.telephone}
              </div>

              <div className="text-sm text-gray-600">
                SIRET&nbsp;: <span className="font-mono">{row.siret}</span>
              </div>

              <div className="text-sm mt-1">
                Formule&nbsp;:&nbsp;<strong>{row.formule}</strong>
                &nbsp;—&nbsp;<strong>{row.credits}</strong>&nbsp;crédits
              </div>

              <div className="text-sm text-gray-600">
                Licence&nbsp;: <span className="font-mono">{row.licenceKey}</span>
              </div>

              <div className="text-sm text-gray-600">
                Expéditeur SMS&nbsp;: <span className="font-mono">{row.sender}</span>
              </div>

              <div className="text-sm">
                CGV&nbsp;:&nbsp;
                {row.cgvAccepted ? (
                  <>
                    ✅ {row.cgvVersion || "acceptées"}
                    {row.cgvCurrentVersion && row.cgvVersion && row.cgvCurrentVersion !== row.cgvVersion ? (
                      <span className="text-amber-600"> — à mettre à jour vers {row.cgvCurrentVersion}</span>
                    ) : null}
                    {row.cgvAt ? <span className="text-gray-600"> — {row.cgvAt}</span> : null}
                  </>
                ) : (
                  <span className="text-red-600">❌ Non accepté</span>
                )}
              </div>

              {row.created && (
                <div className="text-xs text-gray-500">Créée le {row.created}</div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onEdit(index)}
                className="text-blue-600 hover:underline"
              >
                ✏️ Modifier
              </button>
              <button
                type="button"
                onClick={() => handleDelete(row, index)}
                className="text-red-600 hover:underline"
                title="Supprimer définitivement (JSONBin)"
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
                  onChange={(e) => hasId && onChangeFormule?.(row.id, e.target.value as Opticien["formule"])}
                  disabled={!hasId}
                  title={!hasId ? "Identifiant manquant" : ""}
                >
                  {FORMULES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm">Ajuster les crédits</span>
                <button
                  type="button"
                  className="px-3 py-1 border rounded"
                  onClick={() => hasId && onChangeCredits?.(row.id, -100)}
                  disabled={!hasId}
                  title={!hasId ? "Identifiant manquant" : ""}
                >
                  −100
                </button>
                <span className="text-sm opacity-70">{row.credits}</span>
                <button
                  type="button"
                  className="px-3 py-1 border rounded"
                  onClick={() => hasId && onChangeCredits?.(row.id, +100)}
                  disabled={!hasId}
                  title={!hasId ? "Identifiant manquant" : ""}
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
