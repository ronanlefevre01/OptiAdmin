import React, { useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { FileText, Package, Repeat, BarChart, FolderOpen } from "lucide-react"

import OpticienDetailsPage from "./OpticienDetailsPage"
import LicencesTab from "./tabs/LicencesTab"
import CreditsTab from "./tabs/CreditsTab"
import SubscriptionsTab from "./tabs/SubscriptionsTab"
import SmsUsageTab from "./tabs/SmsUsageTab"
import InvoicesTab from "./tabs/InvoicesTab"
// import { Opticien as OpticienModel } from '../../types/opticien' // si besoin

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
  montant?: number      // HT (affichage)
  // nouveau schéma recommandé :
  urlPdf?: string
  numero?: string
  // ancien schéma (pour compat) :
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
// JSONBin client (UNE SEULE BIN)
// =============================
const JSONBIN_BASE = (import.meta as any).env?.VITE_JSONBIN_BASE || "https://api.jsonbin.io/v3"
const JSONBIN_MASTER_KEY = (import.meta as any).env?.VITE_JSONBIN_MASTER_KEY
const JSONBIN_OPTICOM_BIN_ID = (import.meta as any).env?.VITE_JSONBIN_OPTICOM_BIN_ID // ⬅️ ton bin existant

async function jsonbinGet<T>(binId: string): Promise<T> {
  const r = await fetch(`${JSONBIN_BASE}/b/${binId}/latest`, {
    headers: { "X-Master-Key": JSONBIN_MASTER_KEY, "X-Bin-Meta": "false" },
    cache: "no-store",
  })
  if (!r.ok) throw new Error(`JSONBin GET ${r.status}`)
  const j = await r.json()
  return j.record as T
}

async function jsonbinPut<T>(binId: string, record: T): Promise<T> {
  const r = await fetch(`${JSONBIN_BASE}/b/${binId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": JSONBIN_MASTER_KEY,
    },
    body: JSON.stringify(record),
  })
  if (!r.ok) throw new Error(`JSONBin PUT ${r.status}`)
  const j = await r.json()
  return j.record as T
}

async function loadOpticiens(): Promise<Opticien[]> {
  if (!JSONBIN_OPTICOM_BIN_ID) throw new Error("VITE_JSONBIN_OPTICOM_BIN_ID manquant")
  return jsonbinGet<Opticien[]>(JSONBIN_OPTICOM_BIN_ID)
}

async function saveOpticiens(list: Opticien[]): Promise<Opticien[]> {
  if (!JSONBIN_OPTICOM_BIN_ID) throw new Error("VITE_JSONBIN_OPTICOM_BIN_ID manquant")
  return jsonbinPut<Opticien[]>(JSONBIN_OPTICOM_BIN_ID, list)
}

// =============================
// Composant principal
// =============================
const OptiComAdmin = () => {
  const [opticiens, setOpticiens] = useState<Opticien[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Chargement initial : JSONBin puis fallback localStorage
  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const remote = await loadOpticiens()
        setOpticiens(remote)
        localStorage.setItem("opticom", JSON.stringify(remote))
        setError(null)
      } catch (e: any) {
        console.warn("JSONBin indisponible, fallback localStorage", e)
        const stored = localStorage.getItem("opticom")
        if (stored) {
          setOpticiens(JSON.parse(stored))
          setError(null)
        } else {
          setError("Impossible de charger les données (JSONBin et localStorage vides)")
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
        await fetch("https://opticom-sms-server.onrender.com/api/cancel-gocardless", {
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
  // ± Crédits (ex: –100 / +100)
  const handleChangeCredits = (opticienId: string, delta: number) => {
    const updated = opticiens.map((opt) =>
      opt.id === opticienId ? { ...opt, credits: Math.max(0, (opt.credits || 0) + delta) } : opt
    )
    saveToStorage(updated)
  }

  // Changer la formule
  const handleChangeFormule = (opticienId: string, formule: Opticien["formule"]) => {
    const updated = opticiens.map((opt) => (opt.id === opticienId ? { ...opt, formule } : opt))
    saveToStorage(updated)
  }

  // Attacher une facture DÉJÀ GÉNÉRÉE (URL complète) — id auto
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
      const factures = opt.factures || []
      const rec: Facture = { id: crypto.randomUUID(), ...facture } // stocke urlPdf/numero (et garde compat fichierPdf si ancien)
      return { ...opt, factures: [rec, ...factures] }
    })
    saveToStorage(updated)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📊 Tableau de bord OptiCOM</h1>

      {loading && <div className="mb-4">Chargement des données…</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <Tabs defaultValue="licences" className="w-full">
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
              onChangeFormule={handleChangeFormule}  // ← ajout
              onChangeCredits={handleChangeCredits}  // ← ajout
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
            opticiens={opticiens as any}           // TS structurally compatible
            onAttachInvoice={handleAttachInvoice}  // ← pousse l’URL du PDF
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default OptiComAdmin
