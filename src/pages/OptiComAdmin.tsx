/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from "react";
import {
  Tabs, TabsList, TabsTrigger, TabsContent
} from "../components/ui/tabs";
import {
  FileText, Package, Repeat, BarChart, FolderOpen, MessageSquare
} from "lucide-react";

import OpticienDetailsPage from "./OpticienDetailsPage";
import LicencesTab from "./tabs/LicencesTab";
import CreditsTab from "./tabs/CreditsTab";
import SubscriptionsTab from "./tabs/SubscriptionsTab";
import SmsUsageTab from "./tabs/SmsUsageTab";
import InvoicesTab from "./tabs/InvoicesTab";
import LicenceCreateForm from "../components/LicenceCreateForm";

/* ========= Types ========= */
export interface AchatCredit {
  date: string;
  montant: number;
  credits: number;
  modePaiement: string;
}
export interface Abonnement {
  dateDebut: string;
  dateFin: string;
  statut: "Actif" | "Suspendu" | "Annulé";
  gocardlessMandateId?: string;
}
export interface SmsEnvoye {
  date: string;
  type: string;
  message: string;
  credits: number;
}
export interface Facture {
  id: string;
  date: string;
  type: "Abonnement" | "Achat de crédits" | "Autre";
  details?: string;
  montant?: number;
  urlPdf?: string;
  numero?: string;
  fichierPdf?: string;
}
export interface Opticien {
  id: string;
  nom: string;
  siret: string;
  email: string;
  telephone: string;
  formule: "Starter" | "Pro" | "Premium" | "À la carte";
  credits: number;
  achats?: AchatCredit[];
  abonnement?: Abonnement;
  historiqueSms?: SmsEnvoye[];
  factures?: Facture[];
}

/* Feedback (nous joindre / suggestions) */
type FeedbackStatus = "open" | "in_progress" | "closed";
type Feedback = {
  id: string;
  licenceId?: string;
  subject?: string;
  message: string;
  email?: string;
  platform?: string;
  createdAt: string;
  status: FeedbackStatus;
  adminNotes?: string;
  handledBy?: string;
};

type TabKey =
  | "licences"
  | "credits"
  | "subscriptions"
  | "sms"
  | "invoices"
  | "feedback";

/* ====== ENV (Vite) ====== */
const V = (import.meta as any).env as Record<string, string | undefined>;
const API_BASE =
  (V.VITE_SERVER_URL ||
    V.VITE_SERVER_BASE ||
    "https://opticom-sms-server.onrender.com") as string;

const JSONBIN_BASE = "https://api.jsonbin.io/v3";
const JSONBIN_MASTER_KEY: string | undefined = V.VITE_JSONBIN_MASTER_KEY;
const JSONBIN_OPTICOM_BIN_ID: string = (V.VITE_JSONBIN_OPTICOM_BIN_ID || "") as string;

/* Admin token (pour endpoints protégés) */
const ADMIN_TOKEN_KEY = "ADMIN_UPLOAD_TOKEN";
const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY) || "";
const setAdminToken = (t: string) => localStorage.setItem(ADMIN_TOKEN_KEY, t.trim());

/* ====== API helpers Licences ====== */
async function fetchServerLicences(): Promise<any[]> {
  const urls = [`${API_BASE}/api/licences`, `${API_BASE}/licences.json`];
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        return Array.isArray(data) ? data : data ? [data] : [];
      }
    } catch {
      /* try next */
    }
  }
  throw new Error("Aucun endpoint de licences côté serveur");
}

async function jsonbinGet<T>(binId: string): Promise<T> {
  const headers: Record<string, string> = { "X-Bin-Meta": "false" };
  if (JSONBIN_MASTER_KEY) headers["X-Master-Key"] = JSONBIN_MASTER_KEY;

  const r = await fetch(`${JSONBIN_BASE}/b/${binId}/latest`, { headers, cache: "no-store" });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`JSONBin GET ${r.status} ${txt}`);
  }
  const j = await r.json();
  return j.record as T;
}
async function jsonbinPut<T>(binId: string, record: T): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (JSONBIN_MASTER_KEY) headers["X-Master-Key"] = JSONBIN_MASTER_KEY;

  const r = await fetch(`${JSONBIN_BASE}/b/${binId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(record),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`JSONBin PUT ${r.status} ${txt}`);
  }
  const j = await r.json();
  return (j.record ?? record) as T;
}
async function loadOpticiens(): Promise<any[]> {
  if (!JSONBIN_OPTICOM_BIN_ID) throw new Error("VITE_JSONBIN_OPTICOM_BIN_ID manquant");
  const record = await jsonbinGet<any>(JSONBIN_OPTICOM_BIN_ID);
  return Array.isArray(record) ? record : record ? [record] : [];
}
async function saveOpticiens(list: any[]): Promise<any[]> {
  if (!JSONBIN_OPTICOM_BIN_ID) throw new Error("VITE_JSONBIN_OPTICOM_BIN_ID manquant");
  return jsonbinPut<any[]>(JSONBIN_OPTICOM_BIN_ID, list);
}

/* ====== CGV helpers ====== */
function getLicenceId(o: any) {
  return String(o?.id || o?.licence || o?.opticien?.id || "");
}
async function decorateWithCgvStatus(list: any[]) {
  const rows = await Promise.all(
    list.map(async (o) => {
      const id = getLicenceId(o);
      if (!id) return o;
      try {
        const r = await fetch(
          `${API_BASE}/licence/cgv-status?licenceId=${encodeURIComponent(id)}`,
          { cache: "no-store" }
        );
        if (!r.ok) return o;
        const s = await r.json();
        return {
          ...o,
          cgvAccepted: !!s.accepted,
          cgvAcceptedVersion: s.acceptedVersion,
          cgvCurrentVersion: s.currentVersion,
        };
      } catch {
        return o;
      }
    })
  );
  return rows;
}

/* ====== API helpers Feedback (admin) ====== */
async function fetchFeedbackList(params: {
  status?: "" | FeedbackStatus;
  limit?: number;
  q?: string;
}) {
  const t = getAdminToken();
  const status = params.status ?? "open";
  const url = `${API_BASE}/api/admin/feedback?status=${encodeURIComponent(
    status || ""
  )}&limit=${params.limit ?? 100}&q=${encodeURIComponent(params.q || "")}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${t}` },
    cache: "no-store",
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`${r.status} ${txt}`);
  }
  const j = await r.json();
  // backend peut renvoyer {items,total} ou directement []
  if (Array.isArray(j)) return { items: j as Feedback[], total: j.length };
  return {
    items: (j.items || []) as Feedback[],
    total: Number(j.total || (j.items?.length ?? 0)),
  };
}

async function patchFeedback(id: string, patch: Partial<Feedback>) {
  const t = getAdminToken();
  const r = await fetch(`${API_BASE}/api/admin/feedback/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${t}`,
    },
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`${r.status} ${txt}`);
  }
  return (await r.json()) as { ok: boolean; item: Feedback };
}

/* ====== Component ====== */
const OptiComAdmin = () => {
  const [opticiens, setOpticiens] = useState<any[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [tab, setTab] = useState<TabKey>("licences");
  const [showCreate, setShowCreate] = useState(false);

  // ---- Feedback state
  const [fbStatus, setFbStatus] = useState<"" | FeedbackStatus>("open");
  const [fbQuery, setFbQuery] = useState("");
  const [fbItems, setFbItems] = useState<Feedback[]>([]);
  const [fbTotal, setFbTotal] = useState(0);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);
  const [fbSelected, setFbSelected] = useState<Feedback | null>(null);
  const [adminTok, setAdminTok] = useState<string>(getAdminToken());

  useEffect(() => {
    (async () => {
      await reloadFromRemote();
    })();
  }, []);

  async function reloadFromRemote() {
    try {
      setLoading(true);
      setError(null);

      // 1) Serveur
      try {
        const fromApi = await fetchServerLicences();
        const withCgv = await decorateWithCgvStatus(fromApi);
        setOpticiens(withCgv);
        localStorage.setItem("opticom", JSON.stringify(withCgv));
        return;
      } catch {
        /* fallback */
      }

      // 2) JSONBin
      const remote = await loadOpticiens();
      const withCgv = await decorateWithCgvStatus(remote);
      setOpticiens(withCgv);
      localStorage.setItem("opticom", JSON.stringify(withCgv));
    } catch (e: any) {
      console.warn("Distants KO, fallback localStorage", e);
      const stored = localStorage.getItem("opticom");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setOpticiens(Array.isArray(parsed) ? parsed : []);
          setError(null);
        } catch {
          setOpticiens([]);
          setError("Impossible de charger les données (distants & localStorage vides)");
        }
      } else {
        setOpticiens([]);
        setError("Impossible de charger les données (distants & localStorage vides)");
      }
    } finally {
      setLoading(false);
    }
  }

  const handleReloadClick = async () => {
    setReloading(true);
    await reloadFromRemote();
    setReloading(false);
  };
  const handleClearCacheAndReload = async () => {
    localStorage.removeItem("opticom");
    await handleReloadClick();
  };

  const saveToStorage = async (list: any[]) => {
    const withCgv = await decorateWithCgvStatus(list);
    setOpticiens(withCgv);
    localStorage.setItem("opticom", JSON.stringify(withCgv));
    try {
      await saveOpticiens(withCgv);
    } catch (e) {
      console.error("Sauvegarde JSONBin échouée (modifs gardées en localStorage)", e);
    }
  };

  const handleEdit = (index: number) => setEditing(index);
  const handleSave = (updated: any) => {
    if (editing === null) return;
    const newList = [...opticiens];
    newList[editing] = updated;
    saveToStorage(newList);
    setEditing(null);
  };
  const handleCancel = () => setEditing(null);
  const handleDelete = (index: number) => {
    if (!confirm("Supprimer ce client ?")) return;
    const newList = opticiens.filter((_, i) => i !== index);
    saveToStorage(newList);
  };

  const handleAddAchat = (opticienId: string, achat: AchatCredit) => {
    const updated = opticiens.map((opt: any) => {
      if (opt.id === opticienId) {
        const achats = opt.achats || [];
        return { ...opt, achats: [...achats, achat], credits: (opt.credits || 0) + (achat.credits || 0) };
      }
      return opt;
    });
    saveToStorage(updated);
  };

  const handleUpdateAbonnement = (opticienId: string, abonnement: Abonnement) => {
    const updated = opticiens.map((opt: any) => (opt.id === opticienId ? { ...opt, abonnement } : opt));
    saveToStorage(updated);
  };

  const handleCancelAbonnement = async (opticienId: string, mandateId?: string) => {
    if (mandateId) {
      try {
        await fetch(`${API_BASE}/api/cancel-gocardless`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mandateId }),
        });
      } catch {
        alert("Erreur lors de l’annulation GoCardless.");
      }
    }
    const updated = opticiens.map((opt: any) =>
      opt.id === opticienId
        ? { ...opt, abonnement: { ...opt.abonnement, statut: "Annulé", dateFin: "" } }
        : opt
    );
    saveToStorage(updated);
  };

  const handleChangeCredits = (opticienId: string, delta: number) => {
    const updated = opticiens.map((opt: any) =>
      opt.id === opticienId ? { ...opt, credits: Math.max(0, (opt.credits || 0) + delta) } : opt
    );
    saveToStorage(updated);
  };

  const handleChangeFormule = (opticienId: string, formule: Opticien["formule"]) => {
    const updated = opticiens.map((opt: any) => (opt.id === opticienId ? { ...opt, formule } : opt));
    saveToStorage(updated);
  };

  const handleAttachInvoice = (
    opticienId: string,
    facture: {
      date: string;
      type: "Abonnement" | "Achat de crédits" | "Autre";
      details?: string;
      montant?: number;
      urlPdf: string;
      numero?: string;
    }
  ) => {
    const updated = opticiens.map((opt: any) => {
      if (opt.id !== opticienId) return opt;
      const factures = Array.isArray(opt.factures) ? opt.factures : [];

      const safeId =
        typeof window !== "undefined" && window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);

      const rec: Facture = { id: safeId, ...facture };
      return { ...opt, factures: [rec, ...factures] };
    });
    saveToStorage(updated);
  };

  /* -------- FEEDBACK: load quand l’onglet est actif -------- */
  const effectiveStatus = useMemo(() => (tab === "feedback" ? fbStatus : ""), [tab, fbStatus]);

  async function loadFeedback() {
    try {
      setFbLoading(true);
      setFbError(null);
      const data = await fetchFeedbackList({
        status: effectiveStatus,
        limit: 200,
        q: fbQuery,
      });
      setFbItems(data.items);
      setFbTotal(data.total);
    } catch (e: any) {
      setFbItems([]);
      setFbTotal(0);
      setFbError(e.message || "Erreur de chargement");
    } finally {
      setFbLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "feedback") return;
    loadFeedback();
    const t = setInterval(loadFeedback, 10000); // refresh auto 10s
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, effectiveStatus]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">📊 Tableau de bord OptiCOM</h1>
        <button
          onClick={handleReloadClick}
          className="text-sm border rounded px-3 py-1"
          disabled={reloading || loading}
          title="Recharger depuis le serveur/JSONBin (ignore le cache)"
        >
          {reloading || loading ? "Rechargement…" : "🔄 Recharger"}
        </button>
        <button
          onClick={handleClearCacheAndReload}
          className="text-sm border rounded px-3 py-1"
          disabled={reloading || loading}
          title="Supprimer le cache local puis recharger"
        >
          🧹 Vider le cache + recharger
        </button>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="text-sm border rounded px-3 py-1"
          title="Créer une nouvelle licence"
        >
          {showCreate ? "Fermer" : "➕ Nouvelle licence"}
        </button>
      </div>

      {loading && <div className="mb-4">Chargement des données…</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <Tabs value={tab} onValueChange={(v: string) => setTab(v as TabKey)} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-4">
          <TabsTrigger value="licences"><FileText className="mr-2 h-4 w-4" /> Licences</TabsTrigger>
          <TabsTrigger value="credits"><Package className="mr-2 h-4 w-4" /> Crédits</TabsTrigger>
          <TabsTrigger value="subscriptions"><Repeat className="mr-2 h-4 w-4" /> Abonnements</TabsTrigger>
          <TabsTrigger value="sms"><BarChart className="mr-2 h-4 w-4" /> Consommation</TabsTrigger>
          <TabsTrigger value="invoices"><FolderOpen className="mr-2 h-4 w-4" /> Factures</TabsTrigger>
          <TabsTrigger value="feedback"><MessageSquare className="mr-2 h-4 w-4" /> Suggestions</TabsTrigger>
        </TabsList>

        {/* ===== Licences ===== */}
        <TabsContent value="licences">
          {showCreate && (
            <div className="mb-6 border rounded p-4">
              <h3 className="font-medium mb-2">Créer une licence</h3>
              <LicenceCreateForm />
              <div className="mt-3">
                <button
                  onClick={handleReloadClick}
                  className="text-sm border rounded px-3 py-1"
                  title="Recharger la liste après création"
                >
                  🔄 Recharger la liste
                </button>
              </div>
            </div>
          )}

          {editing !== null ? (
            <OpticienDetailsPage
              opticien={opticiens[editing]}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <LicencesTab
              opticiens={opticiens}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onChangeFormule={handleChangeFormule}
              onChangeCredits={handleChangeCredits}
            />
          )}
        </TabsContent>

        {/* ===== Crédits ===== */}
        <TabsContent value="credits">
          <CreditsTab opticiens={opticiens} onAddAchat={handleAddAchat} />
        </TabsContent>

        {/* ===== Abonnements ===== */}
        <TabsContent value="subscriptions">
          <SubscriptionsTab
            opticiens={opticiens}
            onUpdateAbonnement={handleUpdateAbonnement}
            onCancelAbonnement={handleCancelAbonnement}
          />
        </TabsContent>

        {/* ===== Consommation SMS ===== */}
        <TabsContent value="sms">
          <SmsUsageTab opticiens={opticiens} />
        </TabsContent>

        {/* ===== Factures ===== */}
        <TabsContent value="invoices">
          <InvoicesTab opticiens={opticiens as any} onAttachInvoice={handleAttachInvoice} />
        </TabsContent>

        {/* ===== Suggestions / Feedback ===== */}
        <TabsContent value="feedback">
          <div className="border rounded p-4">
            {/* Token admin */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm opacity-80">Token admin&nbsp;:</span>
              <input
                className="text-sm border rounded px-2 py-1 w-[340px]"
                placeholder="ADMIN_UPLOAD_TOKEN"
                value={adminTok}
                onChange={(e) => setAdminTok(e.target.value)}
              />
              <button
                className="text-sm border rounded px-3 py-1"
                onClick={() => { setAdminToken(adminTok); loadFeedback(); }}
              >Enregistrer</button>
              <button
                className="text-sm border rounded px-3 py-1"
                onClick={() => { localStorage.removeItem(ADMIN_TOKEN_KEY); setAdminTok(""); setFbItems([]); }}
              >Déconnecter</button>
              <div className="ml-auto text-sm opacity-70">
                Total: {fbTotal}
              </div>
            </div>

            {/* Filtres */}
            <div className="flex items-center gap-2 mb-3">
              <select
                className="text-sm border rounded px-2 py-1"
                value={fbStatus}
                onChange={(e) => setFbStatus(e.target.value as FeedbackStatus | "")}
              >
                <option value="open">Ouverts</option>
                <option value="in_progress">En cours</option>
                <option value="closed">Fermés</option>
                <option value="">Tous</option>
              </select>
              <input
                className="text-sm border rounded px-2 py-1 w-[320px]"
                placeholder="Rechercher (objet, message, email, licence)…"
                value={fbQuery}
                onChange={(e) => setFbQuery(e.target.value)}
              />
              <button
                className="text-sm border rounded px-3 py-1"
                onClick={loadFeedback}
                disabled={fbLoading}
              >{fbLoading ? "Chargement…" : "🔄 Rafraîchir"}</button>
            </div>

            {fbError && <div className="text-red-600 mb-2">{fbError}</div>}

            <div className="overflow-x-auto rounded border">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black/10">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Licence</th>
                    <th className="text-left p-2">Objet</th>
                    <th className="text-left p-2">Message</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Plateforme</th>
                    <th className="text-left p-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {fbItems.map((f) => (
                    <tr
                      key={f.id}
                      className="hover:bg-black/5 cursor-pointer"
                      onClick={() => setFbSelected(f)}
                    >
                      <td className="p-2">{new Date(f.createdAt).toLocaleString()}</td>
                      <td className="p-2">{f.licenceId || "—"}</td>
                      <td className="p-2">{f.subject || "—"}</td>
                      <td className="p-2" title={f.message}>
                        {f.message.length > 80 ? f.message.slice(0, 80) + "…" : f.message}
                      </td>
                      <td className="p-2">{f.email || "—"}</td>
                      <td className="p-2">{f.platform || "—"}</td>
                      <td className="p-2">
                        <span
                          className="text-white text-xs px-2 py-1 rounded-full"
                          style={{
                            background:
                              f.status === "open"
                                ? "#ffaf00"
                                : f.status === "in_progress"
                                ? "#1E90FF"
                                : "#2e7d32",
                          }}
                        >
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {fbItems.length === 0 && (
                    <tr><td className="p-3 text-center opacity-70" colSpan={7}>
                      {fbLoading ? "Chargement…" : "Aucun message"}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal détail */}
          {fbSelected && (
            <FeedbackModal
              item={fbSelected}
              onClose={() => setFbSelected(null)}
              onSaved={(u) => {
                setFbItems((prev) => prev.map((x) => (x.id === u.id ? u : x)));
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function FeedbackModal({
  item, onClose, onSaved,
}: { item: Feedback; onClose: () => void; onSaved: (u: Feedback) => void }) {
  const [status, setStatus] = useState<FeedbackStatus>(item.status);
  const [notes, setNotes] = useState(item.adminNotes || "");
  const [who, setWho] = useState(item.handledBy || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      const r = await patchFeedback(item.id, {
        status,
        adminNotes: notes,
        handledBy: who,
      });
      if (r?.item) onSaved(r.item);
      onClose();
    } catch (e: any) {
      alert("Erreur: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center z-50">
      <div className="bg-white rounded-lg p-4 w-[640px] max-w-[95vw]">
        <h3 className="text-lg font-semibold mb-2">Suggestion</h3>
        <p className="text-sm opacity-70 mb-1">
          Reçu le {new Date(item.createdAt).toLocaleString()}
        </p>
        <p className="text-sm mb-2">
          <b>Licence:</b> {item.licenceId || "—"} &nbsp; | &nbsp;
          <b>Email:</b> {item.email || "—"} &nbsp; | &nbsp;
          <b>Plateforme:</b> {item.platform || "—"}
        </p>
        <p className="mb-2"><b>Objet:</b> {item.subject || "—"}</p>
        <div className="bg-gray-100 rounded p-3 whitespace-pre-wrap text-sm mb-3">
          {item.message}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="text-sm">Statut
            <select
              className="w-full border rounded px-2 py-1"
              value={status}
              onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
            >
              <option value="open">open</option>
              <option value="in_progress">in_progress</option>
              <option value="closed">closed</option>
            </select>
          </label>
          <label className="text-sm">Pris en charge par
            <input
              className="w-full border rounded px-2 py-1"
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="Prénom / initiales"
            />
          </label>
        </div>

        <label className="text-sm block mb-2">Notes internes
          <textarea
            className="w-full border rounded px-2 py-1"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="flex gap-2 justify-end">
          <button className="border rounded px-3 py-1" onClick={onClose} disabled={saving}>
            Fermer
          </button>
          <button
            className="border rounded px-3 py-1 text-white"
            style={{ background: "#1E90FF" }}
            onClick={save}
            disabled={saving}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OptiComAdmin;
