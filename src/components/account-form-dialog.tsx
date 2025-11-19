"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateAccountMutation, useUpdateAccountMutation } from "@/hooks/use-mutation"
import { PROPFIRM_LABELS, ACCOUNT_SIZES_BY_PROPFIRM, AVAILABLE_PROPFIRMS } from "@/lib/constants"
import { PropfirmType } from "@/types/account.types"

interface PropfirmAccount {
  id: string
  name: string
  propfirm: string
  size: number
  accountType: string
  status: string
  pricePaid: number
  linkedEvalId?: string
  notes?: string
}

interface AccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: PropfirmAccount | null
  onSuccess: () => void
}

// Générer la liste des propfirms disponibles depuis les constantes
const PROPFIRM_TYPES = AVAILABLE_PROPFIRMS.map((key) => ({
  value: key,
  label: PROPFIRM_LABELS[key],
}))

const ACCOUNT_TYPES = [
  { value: "EVAL", label: "Évaluation" },
  { value: "FUNDED", label: "Financé" },
]

// Types de comptes Phidias pour les comptes financés
const PHIDIAS_FUNDED_TYPES = [
  { value: "CASH", label: "CASH" },
  { value: "LIVE", label: "LIVE" },
]

const ACCOUNT_STATUSES = [
  { value: "ACTIVE", label: "Actif" },
  { value: "VALIDATED", label: "Validé" },
  { value: "FAILED", label: "Échoué" },
  { value: "ARCHIVED", label: "Archivé" },
]

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  onSuccess,
}: AccountFormDialogProps) {
  // Utiliser les mutations
  const { mutate: createAccount, isLoading: isCreating } = useCreateAccountMutation()
  const { mutate: updateAccount, isLoading: isUpdating } = useUpdateAccountMutation()

  const [evalAccounts, setEvalAccounts] = useState<PropfirmAccount[]>([])
  const [phidiasFundedType, setPhidiasFundedType] = useState<"CASH" | "LIVE">("CASH")
  const [formData, setFormData] = useState({
    name: "",
    propfirm: "TOPSTEP",
    size: "",
    accountType: "EVAL",
    status: "ACTIVE",
    pricePaid: "",
    linkedEvalId: "",
    notes: "",
  })

  const isLoading = isCreating || isUpdating

  useEffect(() => {
    if (account) {
      // Détecter le type Phidias (CASH ou LIVE) depuis le nom ou les notes
      const isPhidias = account.propfirm === "PHIDIAS"
      const nameLower = (account.name || "").toLowerCase()
      const notesLower = (account.notes || "").toLowerCase()
      const isLive = isPhidias && (nameLower.includes("live") || notesLower.includes("live"))

      setFormData({
        name: account.name,
        propfirm: account.propfirm,
        size: account.size.toString(),
        accountType: account.accountType,
        status: account.status,
        pricePaid: account.pricePaid.toString(),
        linkedEvalId: account.linkedEvalId || "",
        notes: account.notes || "",
      })

      if (isPhidias && account.accountType === "FUNDED") {
        setPhidiasFundedType(isLive ? "LIVE" : "CASH")
      }
    } else {
      setFormData({
        name: "",
        propfirm: "TOPSTEP",
        size: "",
        accountType: "EVAL",
        status: "ACTIVE",
        pricePaid: "",
        linkedEvalId: "",
        notes: "",
      })
      setPhidiasFundedType("CASH")
    }
  }, [account, open])

  // Charger les comptes d&apos;évaluation pour la liaison
  const fetchEvalAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        // Filtrer uniquement les comptes EVAL validés, de la même propfirm et de la même taille
        const evalOnly = data.filter(
          (acc: PropfirmAccount) =>
            acc.accountType === "EVAL" &&
            acc.status === "VALIDATED" &&
            acc.propfirm === formData.propfirm &&
            acc.size.toString() === formData.size
        )
        setEvalAccounts(evalOnly)
      }
    } catch (_error) {
      console.error("Erreur lors du chargement des comptes d&apos;évaluation:")
    }
  }

  useEffect(() => {
    if (open && formData.accountType === "FUNDED") {
      fetchEvalAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, formData.accountType, formData.propfirm, formData.size])

  // Récupérer les tailles disponibles pour la propfirm sélectionnée
  const availableSizes = ACCOUNT_SIZES_BY_PROPFIRM[formData.propfirm as PropfirmType] || []

  // Réinitialiser la taille si elle n'est pas disponible pour la propfirm sélectionnée
  const handlePropfirmChange = (value: string) => {
    const newAvailableSizes = ACCOUNT_SIZES_BY_PROPFIRM[value as PropfirmType] || []
    const currentSizeAvailable = newAvailableSizes.some((s) => s.value === formData.size)

    setFormData({
      ...formData,
      propfirm: value,
      size: currentSizeAvailable ? formData.size : "",
    })

    // Réinitialiser le type Phidias si on change de propfirm
    if (value !== "PHIDIAS") {
      setPhidiasFundedType("CASH")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Pour Phidias, ajouter le type CASH/LIVE dans le nom ou les notes
      const finalFormData: {
        name: string
        propfirm: string
        size: string | number
        accountType: string
        status: string
        pricePaid: string | number
        linkedEvalId: string | null
        notes: string
      } = { ...formData }

      // Convertir size et pricePaid en nombres
      if (finalFormData.size && finalFormData.size !== "") {
        const sizeNum = Number(finalFormData.size)
        if (!isNaN(sizeNum) && sizeNum > 0) {
          finalFormData.size = sizeNum
        }
      }
      if (finalFormData.pricePaid && finalFormData.pricePaid !== "") {
        const priceNum = Number(finalFormData.pricePaid)
        if (!isNaN(priceNum) && priceNum >= 0) {
          finalFormData.pricePaid = priceNum
        }
      }

      // Gérer linkedEvalId : convertir chaîne vide en null
      if (finalFormData.linkedEvalId === "") {
        finalFormData.linkedEvalId = null
      }

      if (formData.propfirm === "PHIDIAS" && formData.accountType === "FUNDED") {
        // Ajouter le type dans le nom si pas déjà présent
        const nameLower = formData.name.toLowerCase()
        const hasTypeInName = nameLower.includes("cash") || nameLower.includes("live")

        if (!hasTypeInName) {
          finalFormData.name = `${formData.name} ${phidiasFundedType}`
        }

        // S'assurer que les notes contiennent le type si nécessaire
        if (phidiasFundedType === "LIVE" && !formData.notes.toLowerCase().includes("live")) {
          finalFormData.notes = formData.notes
            ? `${formData.notes} - Compte ${phidiasFundedType}`
            : `Compte ${phidiasFundedType}`
        }
      }

      if (account) {
        // Mode édition - construire le payload avec seulement les champs valides
        const updatePayload: Record<string, unknown> = {}

        // Inclure tous les champs modifiables seulement s'ils sont définis et valides
        if (finalFormData.name !== undefined && finalFormData.name !== "") {
          updatePayload.name = finalFormData.name
        }
        if (finalFormData.propfirm !== undefined) {
          updatePayload.propfirm = finalFormData.propfirm
        }
        if (
          finalFormData.size !== undefined &&
          typeof finalFormData.size === "number" &&
          finalFormData.size > 0
        ) {
          updatePayload.size = finalFormData.size
        }
        if (finalFormData.accountType !== undefined) {
          updatePayload.accountType = finalFormData.accountType
        }
        if (finalFormData.status !== undefined) {
          updatePayload.status = finalFormData.status
        }
        if (
          finalFormData.pricePaid !== undefined &&
          typeof finalFormData.pricePaid === "number" &&
          finalFormData.pricePaid >= 0
        ) {
          updatePayload.pricePaid = finalFormData.pricePaid
        }
        // Pour linkedEvalId, inclure null si vide ou null, sinon la valeur
        if (finalFormData.linkedEvalId !== undefined) {
          updatePayload.linkedEvalId = finalFormData.linkedEvalId
        }
        // Pour notes, toujours l'inclure (peut être null ou string)
        if (finalFormData.notes !== undefined) {
          updatePayload.notes = finalFormData.notes || null
        }

        await updateAccount({
          id: account.id,
          data: updatePayload,
        })
      } else {
        // Mode création - convertir les types pour la création
        const createPayload = {
          name: finalFormData.name,
          propfirm: finalFormData.propfirm,
          size:
            typeof finalFormData.size === "number"
              ? finalFormData.size
              : Number(finalFormData.size),
          accountType: finalFormData.accountType,
          status: finalFormData.status || "ACTIVE",
          pricePaid:
            typeof finalFormData.pricePaid === "number"
              ? finalFormData.pricePaid
              : Number(finalFormData.pricePaid),
          linkedEvalId:
            finalFormData.linkedEvalId && finalFormData.linkedEvalId !== ""
              ? finalFormData.linkedEvalId
              : undefined,
          notes: finalFormData.notes || null,
        }
        await createAccount(createPayload)
      }

      onSuccess()
      onOpenChange(false)
    } catch (_error) {
      // Les erreurs sont déjà gérées par les mutations
      console.error(_error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {account ? "Modifier le compte" : "Ajouter un compte"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {account
              ? "Modifiez les informations du compte propfirm"
              : "Ajoutez un nouveau compte propfirm à votre portfolio"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:gap-4 py-3 sm:py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-xs sm:text-sm">
                Nom du compte *
              </Label>
              <Input
                id="name"
                placeholder="Mon compte TopStep 50K"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="propfirm" className="text-xs sm:text-sm">
                Propfirm *
              </Label>
              <Select value={formData.propfirm} onValueChange={handlePropfirmChange}>
                <SelectTrigger id="propfirm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPFIRM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="size" className="text-xs sm:text-sm">
                Taille du compte *
              </Label>
              <Select
                value={formData.size}
                onValueChange={(value) => setFormData({ ...formData, size: value })}
              >
                <SelectTrigger id="size">
                  <SelectValue placeholder="Sélectionner la taille" />
                </SelectTrigger>
                <SelectContent>
                  {availableSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="accountType" className="text-xs sm:text-sm">
                  Type de compte *
                </Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(value) => {
                    setFormData({ ...formData, accountType: value })
                    // Réinitialiser le type Phidias si on passe de FUNDED à EVAL
                    if (value === "EVAL" && formData.propfirm === "PHIDIAS") {
                      setPhidiasFundedType("CASH")
                    }
                  }}
                >
                  <SelectTrigger id="accountType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status" className="text-xs sm:text-sm">
                  Statut *
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Choix CASH/LIVE pour Phidias FUNDED */}
            {formData.propfirm === "PHIDIAS" && formData.accountType === "FUNDED" && (
              <div className="grid gap-2">
                <Label htmlFor="phidiasFundedType" className="text-xs sm:text-sm">
                  Type de compte Phidias *
                </Label>
                <Select
                  value={phidiasFundedType}
                  onValueChange={(value) => setPhidiasFundedType(value as "CASH" | "LIVE")}
                >
                  <SelectTrigger id="phidiasFundedType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHIDIAS_FUNDED_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {phidiasFundedType === "CASH"
                    ? "Compte CASH : retraits selon les règles de votre taille de compte"
                    : "Compte LIVE : retraits quotidiens (min 500$), solde min = initial + 100$"}
                </p>
              </div>
            )}

            {/* Compte d&apos;évaluation lié (seulement pour FUNDED) */}
            {formData.accountType === "FUNDED" && (
              <div className="grid gap-2">
                <Label htmlFor="linkedEvalId" className="text-xs sm:text-sm">
                  Compte d&apos;évaluation lié (optionnel)
                </Label>
                <Select
                  value={formData.linkedEvalId || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, linkedEvalId: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger id="linkedEvalId">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {evalAccounts.map((evalAcc) => (
                      <SelectItem key={evalAcc.id} value={evalAcc.id}>
                        {evalAcc.name} ({evalAcc.status === "VALIDATED" ? "✓ " : ""}
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "USD",
                        }).format(evalAcc.size)}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="pricePaid" className="text-xs sm:text-sm">
                Prix payé (USD) *
              </Label>
              <Input
                id="pricePaid"
                type="number"
                step="0.01"
                placeholder="150.00"
                value={formData.pricePaid}
                onChange={(e) => setFormData({ ...formData, pricePaid: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-xs sm:text-sm">
                Notes
              </Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-300"
                placeholder="Notes supplémentaires..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto text-sm"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto text-sm">
              {isLoading ? "En cours..." : account ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
