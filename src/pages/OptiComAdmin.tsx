import React, { useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { FileText, Package, Repeat, BarChart, FolderOpen } from "lucide-react"

import OpticienDetailsPage from "./OpticienDetailsPage"
import LicencesTab from "./tabs/LicencesTab"
import CreditsTab from "./tabs/CreditsTab"
import SubscriptionsTab from "./tabs/SubscriptionsTab"
import SmsUsageTab from "./tabs/SmsUsageTab"
import InvoicesTab from "./tabs/InvoicesTab"

// =============================
// Interfaces
// =============================
export interface AchatCredit {
  date: string
  montant: number
  credits: number
  modePaiement: string
}

export interface Abonnement {
  dateDebut: string
  dateFin: string
  statut: "Actif" | "Suspendu" | "Annulé"
  gocardlessMandateId?: string
}

export interface SmsEnvoye {
  date: string
  type: string
  message: string
  credits: number
}

// ✅ Facture compatible ancien (fichierPdf) + nouveau (urlPdf, numero)
export interface Facture {
  id: string
  date: string
  type: "Abonnement" | "Achat de crédits" | "Autre"
  details?: string
  montant?: number
  urlPdf?: string
  numero?: string
  fichierPdf?: string
}

export interface Opticien {
  id: string
  nom: string
  siret: string
  email: string
  telephone: string
  formule: "Starter" | "Pro" | "Premium" | "À la carte"
  credits: number
  achats?: AchatCredit[]
  abonnement?: Abonnement
  historiqueSms?: SmsEnvoye[]
  factures?: Facture[]
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

// --- API serveur : /api/licences ---
async function fetchServerLicences(): Promise<Opticien[]> {
  const r = await fetch(`${API_BASE}/api/licences`, { cache: "no-store" });
  if (!r.ok) throw new Error(`API /api/licences ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : (data ? [data] : []);
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

async function loadOpticiens(): Promise<Opticien[]> {
  if (!JSONBIN_OPTICOM_BIN_ID) throw new Error("VITE_JSONBIN_OPTICOM_BIN_ID manquant");
  const record = await jsonbinGet<any>(JSONBIN_OPTICOM_BIN_ID);
  const list = Array.isArray(record) ? record : (record ? [record] : []);
  return list as Opticien[];
}

async function saveOpticiens(list: Opticien[]): Promise<Opticien[]> {
  if (!JSONBIN_OPTICOM_BIN_ID) throw new Error("VITE_JSONBIN_OPTICOM_BIN_ID manquant");
  return jsonbinPut<Opticien[]>(JSONBIN_OPTICOM_BIN_ID, list);
}

// =============================
// Composant principal
// =============================
const OptiComAdmin = () => {
  const [opticiens, setOpticiens] = useState<Opticien[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<"licences"|"credits"|"subscriptions"|"sms"|"invoices">("licences")

  // Chargement initial : API serveur → JSONBin → localStorage
  useEffect(() => {
    (async () => {
      try {
        setLoading(true)

        // 1) serveur (même source de vérité que l’app)
        try {
          const fromApi = await fetchServerLicences()
          if (fromApi && fromApi.length >= 0) {
            setOpticiens(fromApi)
            localStorage.setItem("opticom", JSON.stringify(fromApi))
            setError(null)
            return
          }
        } catch (_e) {
          // on tente JSONBin après
        }

        // 2) JSONBin direct
        const remote = await loadOpticiens()
        setOpticiens(remote)
        localStorage.setItem("opticom", JSON.stringify(remote))
        setError(null)
      } catch (e: any) {
        console.warn("Distant KO, fallback localStorage", e)
        const stored = localStorage.getItem("opticom")
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            setOpticiens(Array.isArray(parsed) ? parsed : [])
            setError(null)
          } catch {
            setOpticiens([])
            setError("Impossible de charger les données (distants & localStorage vides)")
          }
        } else {
          setOpticiens([])
          setError("Impossible de charger les données (distants & localStorage vides)")
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Sauvegarde centralisée : écrit localStorage + JSONBin
  const saveToStorage = async (list: Opticien[]) => {
    setOpticiens(list)
    localStorage.setItem("opticom", JSON.stringify(list))
    try {
      await saveOpticiens(list)
    } catch (e) {
      console.error("Sauvegarde JSONBin échouée (modifs gardées en localStorage)", e)
    }
  }

  const handleEdit = (index: number) => setEditing(index)

  const handleSave = (updated: Opticien) => {
    if (editing === null) return
    const newList = [...opticiens]
    newList[editing] = updated
    saveToStorage(newList)
    setEditing(null)
  }

  const handleCancel = () => setEditing(null)

  const handleDelete = (index: number) => {
    if (!confirm("Supprimer ce client ?")) return
    const newList = opticiens.filter((_, i) => i !== index)
    saveToStorage(newList)
  }

  // ✅ Achat de crédits : ajoute l’entrée ET incrémente le solde
  const handleAddAchat = (opticienId: string, achat: AchatCredit) => {
    const updated = opticiens.map((opt) => {
      if (opt.id === opticienId) {
        const achats = opt.achats || []
        return { ...opt, achats: [...achats, achat], credits: (opt.credits || 0) + (achat.credits || 0) }
      }
      return opt
    })
    saveToStorage(updated)
  }

  const handleUpdateAbonnement = (opticienId: string, abonnement: Abonnement) => {
    const updated = opticiens.map((opt) => (opt.id === opticienId ? { ...opt, abonnement } : opt))
    saveToStorage(updated)
  }

  const handleCancelAbonnement = async (opticienId: string, mandateId?: string) => {
    if (mandateId) {
      try {
        await fetch(`${API_BASE}/api/cancel-gocardless`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mandateId }),
        })
      } catch (error) {
        alert("Erreur lors de l’annulation GoCardless.")
      }
    }

    const updated = opticiens.map((opt) =>
      opt.id === opticienId
        ? {
            ...opt,
            abonnement: {
              ...opt.abonnement,
              statut: "Annulé",
              dateFin: "",
            },
          }
        : opt
    )
    saveToStorage(updated as Opticien[])
  }

  // =============================
  // ⭐️ Nouveaux helpers
  // =============================
  const handleChangeCredits = (opticienId: string, delta: number) => {
    const updated = opticiens.map((opt) =>
      opt.id === opticienId ? { ...opt, credits: Math.max(0, (opt.credits || 0) + delta) } : opt
    )
    saveToStorage(updated)
  }

  const handleChangeFormule = (opticienId: string, formule: Opticien["formule"]) => {
    const updated = opticiens.map((opt) => (opt.id === opticienId ? { ...opt, formule } : opt))
    saveToStorage(updated)
  }

  // Attacher une facture DÉJÀ GÉNÉRÉE (URL complète) — id auto sécurisé
  const handleAttachInvoice = (
    opticienId: string,
    facture: {
      date: string
      type: "Abonnement" | "Achat de crédits" | "Autre"
      details?: string
      montant?: number
      urlPdf: string
      numero?: string
    }
  ) => {
    const updated = opticiens.map((opt) => {
      if (opt.id !== opticienId) return opt
      const factures = Array.isArray(opt.factures) ? opt.factures : []
      const safeId =
        (typeof crypto !== "undefined" && (crypto as any).randomUUID)
          ? (crypto as any).randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36)
      const rec: Facture = { id: safeId, ...facture }
      return { ...opt, factures: [rec, ...factures] }
    })
    saveToStorage(updated)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📊 Tableau de bord OptiCOM</h1>

      {loading && <div className="mb-4">Chargement des données…</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <Tabs value={tab} onValueChange={(v)=>setTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="licences"><FileText className="mr-2 h-4 w-4" /> Licences</TabsTrigger>
          <TabsTrigger value="credits"><Package className="mr-2 h-4 w-4" /> Crédits</TabsTrigger>
          <TabsTrigger value="subscriptions"><Repeat className="mr-2 h-4 w-4" /> Abonnements</TabsTrigger>
          <TabsTrigger value="sms"><BarChart className="mr-2 h-4 w-4" /> Consommation</TabsTrigger>
          <TabsTrigger value="invoices"><FolderOpen className="mr-2 h-4 w-4" /> Factures</TabsTrigger>
        </TabsList>

        <TabsContent value="licences">
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

        <TabsContent value="credits">
          <CreditsTab opticiens={opticiens} onAddAchat={handleAddAchat} />
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionsTab
            opticiens={opticiens}
            onUpdateAbonnement={handleUpdateAbonnement}
            onCancelAbonnement={handleCancelAbonnement}
          />
        </TabsContent>

        <TabsContent value="sms">
          <SmsUsageTab opticiens={opticiens} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab
            opticiens={opticiens as any}
            onAttachInvoice={handleAttachInvoice}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default OptiComAdmin
