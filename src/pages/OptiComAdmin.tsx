/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from "react";
import {
  Tabs, TabsList, TabsTrigger, TabsContent
} from "../components/ui/tabs";
import {
  FileText, Package, Repeat, BarChart, FolderOpen, MessageSquare, Sparkles
} from "lucide-react";

import OpticienDetailsPage from "./OpticienDetailsPage";
import LicencesTab from "./tabs/LicencesTab";
import CreditsTab from "./tabs/CreditsTab";
import SubscriptionsTab from "./tabs/SubscriptionsTab";
import SmsUsageTab from "./tabs/SmsUsageTab";
import InvoicesTab from "./tabs/InvoicesTab";
import LicenceCreateForm, { NewLicenceInput } from "../components/LicenceCreateForm";

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
  adminNotes?: string;   // non persisté côté /support (local UI)
  handledBy?: string;    // non persisté côté /support (local UI)
};

/* Trial Requests */
type TrialStatus = "pending" | "processed";
type TrialRequest = {
  id: string;
  storeName: string;
  siret: string;
  phone: string;
  email: string;
  alias: string;
  source?: string;
  createdAt: string;
  status: TrialStatus;
};

type TabKey =
  | "licences"
  | "credits"
  | "subscriptions"
  | "sms"
  | "invoices"
  | "feedback"
  | "trials";

/* ====== ENV (Vite) ====== */
const V = (import.meta as any).env as Record<string, string | undefined>;
const API_BASE =
  (V.VITE_SERVER_URL ||
    V.VITE_SERVER_BASE ||
    "https://opticom-sms-server.onrender.com") as string;

const ADMIN_BASE = (
  V.VITE_ADMIN_BASE ||
  (typeof window !== "undefined" ? window.location.origin : "")
).replace(/\/$/, "");

const JSONBIN_BASE = "https://api.jsonbin.io/v3";
const JSONBIN_MASTER_KEY: string | undefined = V.VITE_JSONBIN_MASTER_KEY;
const JSONBIN_OPTICOM_BIN_ID: string = (V.VITE_JSONBIN_OPTICOM_BIN_ID || "") as string;

/* Admin token (pour endpoints protégés /support et /trial-requests) */
const ADMIN_TOKEN_KEY = "ADMIN_FEEDBACK_TOKEN";
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
    } catch { /* try next */ }
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

/* ====== Feedback helpers (support) ====== */
const mapClientToServerStatut = (s: FeedbackStatus): string =>
  s === "open" ? "nouveau" : s === "closed" ? "traite" : "en_cours";

const mapServerToClientStatus = (statut?: string): FeedbackStatus => {
  const v = String(statut || "").toLowerCase();
  if (v === "traite") return "closed";
  if (v === "en_cours") return "in_progress";
  return "open"; // "nouveau" ou défaut
};

function normalizeSupportItem(it: any): Feedback {
  return {
    id: String(it.id),
    licenceId: it.licenceId || it.licence || "",
    subject: it.subject || it.objet || "",
    message: it.message || "",
    email: it.email || it.emailLicence || "",
    platform: it.platform || "",
    createdAt: it.date || it.createdAt || new Date().toISOString(),
    status: mapServerToClientStatus(it.statut || it.status),
    adminNotes: it.adminNotes || "",
    handledBy: it.handledBy || "",
  };
}

async function fetchFeedbackList(params: {
  status?: "" | FeedbackStatus;
  limit?: number;
  q?: string;
}) {
  const t = getAdminToken();
  const status = params.status ?? "open";
  const serverStatus =
    status === "" ? "" : mapClientToServerStatut(status as FeedbackStatus);

  const url = `${API_BASE}/support/messages?status=${encodeURIComponent(
    serverStatus
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
  const raw = Array.isArray(j) ? j : Array.isArray(j.items) ? j.items : [];
  const items = (raw as any[]).map(normalizeSupportItem);
  return { items, total: Number(j.total || items.length) };
}

async function patchFeedback(item: Feedback, patch: Partial<Feedback>) {
  const t = getAdminToken();
  const statut = mapClientToServerStatut(patch.status || item.status);
  const body = {
    licenceId: item.licenceId || "",
    id: item.id,
    statut,
  };
  const r = await fetch(`${API_BASE}/support/messages/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${t}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`${r.status} ${txt}`);
  }
  return {
    ok: true,
    item: { ...item, status: patch.status || item.status } as Feedback,
  };
}

/* ====== Trial Requests helpers ====== */
function normalizeTrial(it: any): TrialRequest {
  return {
    id: String(it.id || it._id || it.key || Math.random().toString(36).slice(2)),
    storeName: it.storeName || it.magasin || it.nomMagasin || "",
    siret: String(it.siret || ""),
    phone: it.phone || it.telephone || "",
    email: it.email || "",
    alias: it.alias || it.emetteur || "",
    source: it.source || "",
    createdAt: it.createdAt || it.date || new Date().toISOString(),
    status: (it.status || it.statut || "pending") as TrialStatus,
  };
}

async function fetchTrialRequests(params: { status?: "" | TrialStatus; limit?: number; q?: string }) {
  const t = getAdminToken();
  const q = params.q || "";
  const status = params.status ?? "";

  // 1) même origine (Vercel /api/trial-requests)
  const sameOrigin =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/trial-requests?status=${encodeURIComponent(status)}&limit=${params.limit ?? 200}&q=${encodeURIComponent(q)}`
      : "";

  // 2) domaine Vercel (au cas où l’app est ouverte ailleurs)
  const vercelAdmin = `https://opti-admin.vercel.app/api/trial-requests?status=${encodeURIComponent(status)}&limit=${params.limit ?? 200}&q=${encodeURIComponent(q)}`;

  // 3) anciens endpoints Render (fallback)
  const render1 = `${API_BASE}/trial-requests?status=${encodeURIComponent(status)}&limit=${params.limit ?? 200}&q=${encodeURIComponent(q)}`;
  const render2 = `${API_BASE}/api/trial-requests?status=${encodeURIComponent(status)}&limit=${params.limit ?? 200}&q=${encodeURIComponent(q)}`;
  const staticJson = `${API_BASE}/trial-requests.json`;

  const urls = [sameOrigin, vercelAdmin, render1, render2, staticJson].filter(Boolean);

  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      if (!r.ok) continue;
      const j = await r.json();
      const raw = Array.isArray(j) ? j : Array.isArray((j as any).items) ? (j as any).items : [];
      return raw.map(normalizeTrial) as TrialRequest[];
    } catch {
      // try next
    }
  }
  return [];
}


async function updateTrialStatus(id: string, status: TrialStatus) {
  const t = getAdminToken();
  const bodies = [
    { url: `${API_BASE}/trial-requests/update`, method: "POST" as const },
    { url: `${API_BASE}/api/trial-requests/update`, method: "POST" as const },
    { url: `${API_BASE}/trial-requests/${encodeURIComponent(id)}`, method: "PATCH" as const },
  ];
  const body = JSON.stringify({ id, status });
  for (const x of bodies) {
    try {
      const r = await fetch(x.url, {
        method: x.method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body,
      });
      if (r.ok) return true;
    } catch { /* try next */ }
  }
  throw new Error("Impossible de mettre à jour le statut");
}

async function deleteTrial(id: string) {
  const t = getAdminToken();
  const tries = [
    { url: `${API_BASE}/trial-requests/${encodeURIComponent(id)}`, method: "DELETE" as const },
    { url: `${API_BASE}/trial-requests/delete`, method: "POST" as const, body: JSON.stringify({ id }) },
    { url: `${API_BASE}/api/trial-requests/delete`, method: "POST" as const, body: JSON.stringify({ id }) },
  ];
  for (const x of tries) {
    try {
      const r = await fetch(x.url, {
        method: x.method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: x.body,
      });
      if (r.ok) return true;
    } catch { /* try next */ }
  }
  throw new Error("Suppression impossible");
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

  // ---- Trials state
  const [trials, setTrials] = useState<TrialRequest[]>([]);
  const [trialStatus, setTrialStatus] = useState<"" | TrialStatus>("pending");
  const [trialQuery, setTrialQuery] = useState("");
  const [trialsLoading, setTrialsLoading] = useState(false);
  const [trialsError, setTrialsError] = useState<string | null>(null);
  const [trialSelected, setTrialSelected] = useState<TrialRequest | null>(null);

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
      } catch { /* fallback */ }

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

  /* ========= NOUVEAU : création locale d’une licence ========= */
  const planToFormule = (p: NewLicenceInput["plan"]): Opticien["formule"] =>
    p === "basic" ? "Starter" : p === "pro" ? "Pro" : "Premium";

  async function handleCreateLicenceLocal(input: NewLicenceInput) {
    const id =
      (typeof window !== "undefined" && window.crypto?.randomUUID?.()) ||
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    const record = {
      id,
      licence: id,
      nom: input.name,
      enseigne: input.name,
      siret: input.siret || "",
      email: input.contactEmail || "",
      telephone: input.contactPhone || "",
      libelleExpediteur: input.sender,
      formule: planToFormule(input.plan),
      credits: input.credits || 0,
      dateCreation: new Date().toISOString(),

      cgvAccepted: false,
      cgvAcceptedVersion: null as any,
      cgvCurrentVersion: null as any,
    };

    const newList = [record, ...opticiens];
    await saveToStorage(newList);
  }
  /* =========================================================== */

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
    const t = setInterval(loadFeedback, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, effectiveStatus, fbQuery]);

  /* -------- TRIALS: load quand l’onglet est actif -------- */
  const trialsActive = useMemo(() => tab === "trials", [tab]);
  async function loadTrials() {
    try {
      setTrialsLoading(true);
      setTrialsError(null);
      const items = await fetchTrialRequests({ status: trialsActive ? trialStatus : "", limit: 200, q: trialQuery });
      setTrials(items);
    } catch (e: any) {
      setTrials([]);
      setTrialsError(e.message || "Erreur de chargement");
    } finally {
      setTrialsLoading(false);
    }
  }
  useEffect(() => {
    if (!trialsActive) return;
    loadTrials();
    const t = setInterval(loadTrials, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialsActive, trialStatus, trialQuery]);

  /* -------- Helpers UI -------- */
  const copyText = async (text: string) => {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  };

  const handleCreateLicenceFromTrial = async (t: TrialRequest) => {
    // Ouvre l’onglet Licences + section création,
    // et copie les champs pour “coller” dans le formulaire existant.
    const payload = {
      nom: t.storeName,
      siret: t.siret,
      email: t.email,
      telephone: t.phone,
      libelleExpediteur: t.alias,
    };
    const ok = await copyText(JSON.stringify(payload, null, 2));
    setTab("licences");
    setShowCreate(true);
    alert(ok
      ? "Champs copiés dans le presse-papier. Collez-les dans le formulaire de création."
      : "Impossible de copier dans le presse-papier. Ouvrez le formulaire et saisissez les champs manuellement.");
  };

  const handleMarkTrialProcessed = async (t: TrialRequest) => {
    if (!confirm(`Marquer traité la demande d’essai pour « ${t.storeName} » ?`)) return;
    try {
      await updateTrialStatus(t.id, "processed");
      await loadTrials();
    } catch (e: any) {
      alert("Erreur: " + (e.message || "MAJ statut impossible"));
    }
  };

  const handleDeleteTrial = async (t: TrialRequest) => {
    if (!confirm(`Supprimer définitivement la demande d’essai de « ${t.storeName} » ?`)) return;
    try {
      await deleteTrial(t.id);
      await loadTrials();
    } catch (e: any) {
      alert("Erreur: " + (e.message || "Suppression impossible"));
    }
  };

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
        <TabsList className="grid w-full grid-cols-7 mb-4">
          <TabsTrigger value="licences"><FileText className="mr-2 h-4 w-4" /> Licences</TabsTrigger>
          <TabsTrigger value="credits"><Package className="mr-2 h-4 w-4" /> Crédits</TabsTrigger>
          <TabsTrigger value="subscriptions"><Repeat className="mr-2 h-4 w-4" /> Abonnements</TabsTrigger>
          <TabsTrigger value="sms"><BarChart className="mr-2 h-4 w-4" /> Consommation</TabsTrigger>
          <TabsTrigger value="invoices"><FolderOpen className="mr-2 h-4 w-4" /> Factures</TabsTrigger>
          <TabsTrigger value="feedback"><MessageSquare className="mr-2 h-4 w-4" /> Suggestions</TabsTrigger>
          <TabsTrigger value="trials"><Sparkles className="mr-2 h-4 w-4" /> Essais</TabsTrigger>
        </TabsList>

        {/* ===== Licences ===== */}
        <TabsContent value="licences">
          {showCreate && (
            <div className="mb-6 border rounded p-4">
              <h3 className="font-medium mb-2">Créer une licence</h3>
              <div className="text-sm mb-2 opacity-70">
                Astuce : après avoir cliqué “Créer licence” dans l’onglet <b>Essais</b>, les champs sont copiés dans le presse-papier.
                Collez-les ici si votre formulaire propose un coller rapide.
              </div>
              <LicenceCreateForm onCreate={handleCreateLicenceLocal} />
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
                placeholder="ADMIN_FEEDBACK_TOKEN"
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

        {/* ===== Essais (Trial Requests) ===== */}
        <TabsContent value="trials">
          <div className="border rounded p-4">
            {/* Token admin (réutilise le même) */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm opacity-80">Token admin&nbsp;:</span>
              <input
                className="text-sm border rounded px-2 py-1 w-[340px]"
                placeholder="ADMIN_FEEDBACK_TOKEN"
                value={adminTok}
                onChange={(e) => setAdminTok(e.target.value)}
              />
              <button
                className="text-sm border rounded px-3 py-1"
                onClick={() => { setAdminToken(adminTok); loadTrials(); }}
              >Enregistrer</button>
              <button
                className="text-sm border rounded px-3 py-1"
                onClick={() => { localStorage.removeItem(ADMIN_TOKEN_KEY); setAdminTok(""); setTrials([]); }}
              >Déconnecter</button>
              <div className="ml-auto text-sm opacity-70">
                Total: {trials.length}
              </div>
            </div>

            {/* Filtres */}
            <div className="flex items-center gap-2 mb-3">
              <select
                className="text-sm border rounded px-2 py-1"
                value={trialStatus}
                onChange={(e) => setTrialStatus(e.target.value as TrialStatus | "")}
              >
                <option value="pending">En attente</option>
                <option value="processed">Traitées</option>
                <option value="">Toutes</option>
              </select>
              <input
                className="text-sm border rounded px-2 py-1 w-[320px]"
                placeholder="Rechercher (magasin, siret, email, alias)…"
                value={trialQuery}
                onChange={(e) => setTrialQuery(e.target.value)}
              />
              <button
                className="text-sm border rounded px-3 py-1"
                onClick={loadTrials}
                disabled={trialsLoading}
              >{trialsLoading ? "Chargement…" : "🔄 Rafraîchir"}</button>
            </div>

            {trialsError && <div className="text-red-600 mb-2">{trialsError}</div>}

            <div className="overflow-x-auto rounded border">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black/10">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Magasin</th>
                    <th className="text-left p-2">SIRET</th>
                    <th className="text-left p-2">Téléphone</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Alias</th>
                    <th className="text-left p-2">Source</th>
                    <th className="text-left p-2">Statut</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trials.map((t) => (
                    <tr key={t.id} className="hover:bg-black/5">
                      <td className="p-2">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="p-2">{t.storeName}</td>
                      <td className="p-2">{t.siret}</td>
                      <td className="p-2">{t.phone}</td>
                      <td className="p-2">{t.email}</td>
                      <td className="p-2">{t.alias}</td>
                      <td className="p-2">{t.source || "—"}</td>
                      <td className="p-2">
                        <span
                          className="text-white text-xs px-2 py-1 rounded-full"
                          style={{ background: t.status === "pending" ? "#ffaf00" : "#2e7d32" }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            className="text-xs border rounded px-2 py-1"
                            onClick={() => setTrialSelected(t)}
                            title="Voir les détails"
                          >Détails</button>
                          <button
                            className="text-xs border rounded px-2 py-1"
                            onClick={() => handleCreateLicenceFromTrial(t)}
                            title="Préremplir la création de licence"
                          >Créer licence</button>
                          {t.status !== "processed" && (
                            <button
                              className="text-xs border rounded px-2 py-1"
                              onClick={() => handleMarkTrialProcessed(t)}
                            >Marquer traité</button>
                          )}
                          <button
                            className="text-xs border rounded px-2 py-1"
                            onClick={() => handleDeleteTrial(t)}
                          >Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {trials.length === 0 && (
                    <tr><td className="p-3 text-center opacity-70" colSpan={9}>
                      {trialsLoading ? "Chargement…" : "Aucune demande"}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal détail — Trial */}
          {trialSelected && (
            <TrialModal
              item={trialSelected}
              onClose={() => setTrialSelected(null)}
              onMarkProcessed={async (t) => { await handleMarkTrialProcessed(t); setTrialSelected(null); }}
              onDelete={async (t) => { await handleDeleteTrial(t); setTrialSelected(null); }}
              onCreateLicence={(t) => handleCreateLicenceFromTrial(t)}
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
      const r = await patchFeedback(item, {
        status,
        adminNotes: notes,
        handledBy: who,
      });
      if ((r as any)?.item) onSaved((r as any).item);
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

function TrialModal({
  item, onClose, onMarkProcessed, onDelete, onCreateLicence
}: {
  item: TrialRequest;
  onClose: () => void;
  onMarkProcessed: (t: TrialRequest) => void | Promise<void>;
  onDelete: (t: TrialRequest) => void | Promise<void>;
  onCreateLicence: (t: TrialRequest) => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center z-50">
      <div className="bg-white rounded-lg p-4 w-[620px] max-w-[95vw]">
        <h3 className="text-lg font-semibold mb-2">Demande d’essai</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><b>Magasin:</b> {item.storeName}</div>
          <div><b>SIRET:</b> {item.siret}</div>
          <div><b>Email:</b> {item.email}</div>
          <div><b>Téléphone:</b> {item.phone}</div>
          <div><b>Alias:</b> {item.alias}</div>
          <div><b>Source:</b> {item.source || "—"}</div>
          <div className="col-span-2"><b>Date:</b> {new Date(item.createdAt).toLocaleString()}</div>
          <div className="col-span-2">
            <b>Statut:</b> <span className="ml-1 text-white text-xs px-2 py-1 rounded-full" style={{ background: item.status === "pending" ? "#ffaf00" : "#2e7d32" }}>
              {item.status}
            </span>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          {item.status !== "processed" && (
            <button className="border rounded px-3 py-1" onClick={() => onMarkProcessed(item)}>
              Marquer traité
            </button>
          )}
          <button className="border rounded px-3 py-1" onClick={() => onCreateLicence(item)}>
            Créer licence
          </button>
          <button className="border rounded px-3 py-1" onClick={() => onDelete(item)}>
            Supprimer
          </button>
          <button className="border rounded px-3 py-1" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default OptiComAdmin;
