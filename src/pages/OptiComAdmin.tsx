import React, { useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { FileText, Package, Repeat, BarChart, FolderOpen } from "lucide-react"

import OpticienDetailsPage from "./OpticienDetailsPage"
import LicencesTab from "./tabs/LicencesTab"
import CreditsTab from "./tabs/CreditsTab"
import SubscriptionsTab from "./tabs/SubscriptionsTab"
import SmsUsageTab from "./tabs/SmsUsageTab"
import InvoicesTab from "./tabs/InvoicesTab"

// --- Interfaces ---

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

export interface Facture {
  id: string
  date: string
  type: "Abonnement" | "Achat de crédits"
  details: string
  montant: number
  fichierPdf: string
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

// --- Composant principal ---

const OptiComAdmin = () => {
  const [opticiens, setOpticiens] = useState<Opticien[]>([])
  const [editing, setEditing] = useState<number | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("opticom")
    if (stored) {
      setOpticiens(JSON.parse(stored))
    }
  }, [])

  const saveToStorage = (list: Opticien[]) => {
    setOpticiens(list)
    localStorage.setItem("opticom", JSON.stringify(list))
  }

  const handleEdit = (index: number) => {
    setEditing(index)
  }

  const handleSave = (updated: Opticien) => {
    if (editing === null) return
    const newList = [...opticiens]
    newList[editing] = updated
    saveToStorage(newList)
    setEditing(null)
  }

  const handleCancel = () => {
    setEditing(null)
  }

  const handleDelete = (index: number) => {
    if (confirm("Supprimer ce client ?")) {
      const newList = opticiens.filter((_, i) => i !== index)
      saveToStorage(newList)
    }
  }

  const handleAddAchat = (opticienId: string, achat: AchatCredit) => {
    const updated = opticiens.map((opt) => {
      if (opt.id === opticienId) {
        const achats = opt.achats || []
        return { ...opt, achats: [...achats, achat] }
      }
      return opt
    })
    saveToStorage(updated)
  }

  const handleUpdateAbonnement = (opticienId: string, abonnement: Abonnement) => {
    const updated = opticiens.map((opt) =>
      opt.id === opticienId ? { ...opt, abonnement } : opt
    )
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
    saveToStorage(updated)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📊 Tableau de bord OptiCOM</h1>

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
          <InvoicesTab opticiens={opticiens} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default OptiComAdmin
