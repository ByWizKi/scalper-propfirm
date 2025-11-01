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

const PROPFIRM_TYPES = [
  { value: "TOPSTEP", label: "TopStep" },
  { value: "TAKEPROFITTRADER", label: "Take Profit Trader" },
]

const ACCOUNT_SIZES_BY_PROPFIRM: Record<string, Array<{ value: string, label: string }>> = {
  TOPSTEP: [
    { value: "50000", label: "50K" },
    { value: "100000", label: "100K" },
    { value: "150000", label: "150K" },
  ],
  TAKEPROFITTRADER: [
    { value: "25000", label: "25K" },
    { value: "50000", label: "50K" },
    { value: "75000", label: "75K" },
    { value: "100000", label: "100K" },
    { value: "150000", label: "150K" },
  ],
}

const ACCOUNT_TYPES = [
  { value: "EVAL", label: "Évaluation" },
  { value: "FUNDED", label: "Financé" },
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
    }
  }, [account, open])

  // Charger les comptes d&apos;évaluation pour la liaison
  const fetchEvalAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        // Filtrer uniquement les comptes EVAL validés, de la même propfirm et de la même taille
        const evalOnly = data.filter((acc: PropfirmAccount) =>
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
  const availableSizes = ACCOUNT_SIZES_BY_PROPFIRM[formData.propfirm] || []

  // Réinitialiser la taille si elle n'est pas disponible pour la propfirm sélectionnée
  const handlePropfirmChange = (value: string) => {
    const newAvailableSizes = ACCOUNT_SIZES_BY_PROPFIRM[value] || []
    const currentSizeAvailable = newAvailableSizes.some(s => s.value === formData.size)

    setFormData({
      ...formData,
      propfirm: value,
      size: currentSizeAvailable ? formData.size : "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (account) {
        // Mode édition
        await updateAccount({
          id: account.id,
          data: formData,
        })
      } else {
        // Mode création
        await createAccount(formData)
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
              <Label htmlFor="name" className="text-xs sm:text-sm">Nom du compte *</Label>
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
              <Label htmlFor="propfirm" className="text-xs sm:text-sm">Propfirm *</Label>
              <Select
                value={formData.propfirm}
                onValueChange={handlePropfirmChange}
              >
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
              <Label htmlFor="size" className="text-xs sm:text-sm">Taille du compte *</Label>
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
                <Label htmlFor="accountType" className="text-xs sm:text-sm">Type de compte *</Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(value) => setFormData({ ...formData, accountType: value })}
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
                <Label htmlFor="status" className="text-xs sm:text-sm">Statut *</Label>
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

            {/* Compte d&apos;évaluation lié (seulement pour FUNDED) */}
            {formData.accountType === "FUNDED" && (
              <div className="grid gap-2">
                <Label htmlFor="linkedEvalId" className="text-xs sm:text-sm">Compte d&apos;évaluation lié (optionnel)</Label>
                <Select
                  value={formData.linkedEvalId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, linkedEvalId: value === "none" ? "" : value })}
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
                        }).format(evalAcc.size)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="pricePaid" className="text-xs sm:text-sm">Prix payé (USD) *</Label>
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
              <Label htmlFor="notes" className="text-xs sm:text-sm">Notes</Label>
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
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto text-sm"
            >
              {isLoading ? "En cours..." : account ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


