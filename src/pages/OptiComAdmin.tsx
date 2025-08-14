import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { FileText, Package, Repeat, BarChart, FolderOpen } from "lucide-react";

import OpticienDetailsPage from "./OpticienDetailsPage";
import LicencesTab from "./tabs/LicencesTab";
import CreditsTab from "./tabs/CreditsTab";
import SubscriptionsTab from "./tabs/SubscriptionsTab";
import SmsUsageTab from "./tabs/SmsUsageTab";
import InvoicesTab from "./tabs/InvoicesTab";

// =============================
// Interfaces
// =============================
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

// =============================
// ENV + clients API
// =============================
const viteEnv = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};
const procEnv = (typeof process !== "undefined" && (process as any).env) || {};

const API_BASE: string =
  viteEnv.VITE_SERVER_BASE || procEnv.VITE_SERVER_BASE || "https://opticom-sms-server.onrender.com";

const JSONBIN_BASE: string =
  viteEnv.VITE_JSONBIN_BASE || procEnv.VITE_JSONBIN_BASE || "https://api.jsonbin.io/v3";
const JSONBIN_MASTER_KEY: string | undefined =
  viteEnv.VITE_JSONBIN_MASTER_KEY || procEnv.VITE_JSONBIN_MASTER_KEY;
const JSONBIN_OPTICOM_BIN_ID: string =
  viteEnv.VITE_JSONBIN_OPTICOM_BIN_ID || procEnv.VITE_JSONBIN_OPTICOM_BIN_ID || "";

// --- API serveur : /api/licences (fallback /licences.json)
async function fetchServerLicences(): Promise<any[]> {
  const urls = [`${API_BASE}/api/licences`, `${API_BASE}/licences.json`];
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        return Array.isArray(data) ? data : (data ? [data] : []);
      }
    } catch (_) {
      /* try next */
    }
  }
  throw new Error("Aucun endpoint de licences côté serveur");
}

// --- JSONBin helpers ---
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
  return j.record as T;
}
async function loadOpticiens(): Promise<any[]> {
  if (!JSONBIN_OPTICOM_BIN_ID) throw new Error("VITE_JSONBIN_OPTICOM_BIN_ID manquant");
  const record = await jsonbinGet<any>(JSONBIN_OPTICOM_BIN_ID);
  return Array.isArray(record) ? record : (record ? [record] : []);
}
async function saveOpticiens(list: any[]): Promise<any[]> {
  if (!JSONBIN_OPTICOM_BIN_ID) throw new Error("VITE_JSONBIN_OPTICOM_BIN_ID manquant");
  return jsonbinPut<any[]>(JSONBIN_OPTICOM_BIN_ID, list);
}

// =============================
// Composant principal
// =============================
const OptiComAdmin = () => {
  const [opticiens, setOpticiens] = useState<any[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [tab, setTab] = useState<"licences" | "credits" | "subscriptions" | "sms" | "invoices">("licences");

  // Charge d'abord le serveur (même source que l'app), sinon JSONBin, sinon localStorage
  useEffect(() => {
    (async () => {
      await reloadFromRemote(); // centralise la logique
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reloadFromRemote() {
    try {
      setLoading(true);
      setError(null);

      // 1) Serveur
      try {
        const fromApi = await fetchServerLicences();
        setOpticiens(fromApi);
        localStorage.setItem("opticom", JSON.stringify(fromApi));
        return; // on s'arrête ici si ok
      } catch {
        /* fallback */
      }

      // 2) JSONBin
      const remote = await loadOpticiens();
      setOpticiens(remote);
      localStorage.setItem("opticom", JSON.stringify(remote));
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

  // Bouton "Recharger"
  const handleReloadClick = async () => {
    setReloading(true);
    await reloadFromRemote();
    setReloading(false);
  };

  // Bouton "Vider cache + Recharger"
  const handleClearCacheAndReload = async () => {
    localStorage.removeItem("opticom");
    await handleReloadClick();
  };

  // Sauvegarde centralisée (JSONBin + cache local)
  const saveToStorage = async (list: any[]) => {
    setOpticiens(list);
    localStorage.setItem("opticom", JSON.stringify(list));
    try {
      await saveOpticiens(list);
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
    facture: { date: string; type: "Abonnement" | "Achat de crédits" | "Autre"; details?: string; montant?: number; urlPdf: string; numero?: string }
  ) => {
    const updated = opticiens.map((opt: any) => {
      if (opt.id !== opticienId) return opt;
      const factures = Array.isArray(opt.factures) ? opt.factures : [];
      const safeId =
        typeof crypto !== "undefined" && (crypto as any).randomUUID
          ? (crypto as any).randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      const rec: Facture = { id: safeId, ...facture };
      return { ...opt, factures: [rec, ...factures] };
    });
    saveToStorage(updated);
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
      </div>

      {loading && <div className="mb-4">Chargement des données…</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="licences"><FileText className="mr-2 h-4 w-4" /> Licences</TabsTrigger>
          <TabsTrigger value="credits"><Package className="mr-2 h-4 w-4" /> Crédits</TabsTrigger>
          <TabsTrigger value="subscriptions"><Repeat className="mr-2 h-4 w-4" /> Abonnements</TabsTrigger>
          <TabsTrigger value="sms"><BarChart className="mr-2 h-4 w-4" /> Consommation</TabsTrigger>
          <TabsTrigger value="invoices"><FolderOpen className="mr-2 h-4 w-4" /> Factures</TabsTrigger>
        </TabsList>

        <TabsContent value="licences">
          {editing !== null ? (
            <OpticienDetailsPage opticien={opticiens[editing]} onSave={handleSave} onCancel={handleCancel} />
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

        <TabsContent value="credits">
          <CreditsTab opticiens={opticiens} onAddAchat={handleAddAchat} />
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionsTab opticiens={opticiens} onUpdateAbonnement={handleUpdateAbonnement} onCancelAbonnement={handleCancelAbonnement} />
        </TabsContent>

        <TabsContent value="sms">
          <SmsUsageTab opticiens={opticiens} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab opticiens={opticiens as any} onAttachInvoice={handleAttachInvoice} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OptiComAdmin;
