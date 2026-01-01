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
import { PROPFIRM_LABELS, ACCOUNT_SIZES_BY_PROPFIRM, getAccountPrice, AVAILABLE_PROPFIRMS } from "@/lib/constants"
import { PropfirmType, AccountType } from "@/types/account.types"
import { toast } from "@/hooks/use-toast"
import { Loader2, Plus } from "lucide-react"
import { emitEvent, AppEvents } from "@/lib/events/event-bus"

interface BulkAccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const PROPFIRM_TYPES = AVAILABLE_PROPFIRMS.map((key) => ({
  value: key,
  label: PROPFIRM_LABELS[key],
}))

const ACCOUNT_TYPES = [
  { value: "EVAL", label: "Évaluation" },
  { value: "FUNDED", label: "Financé" },
]

export function BulkAccountFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkAccountFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    count: "1",
    propfirm: "TOPSTEP" as PropfirmType,
    accountType: "EVAL" as AccountType,
    size: "",
    nameBase: "",
    customNames: [] as string[],
    useAutoName: true,
    pricePaid: "",
    useCustomPrice: false,
    status: "ACTIVE" as const,
    notes: "",
  })

  const availableSizes = ACCOUNT_SIZES_BY_PROPFIRM[formData.propfirm] || []
  const count = parseInt(formData.count) || 1
  const size = parseInt(formData.size) || 0
  const autoPrice = getAccountPrice(formData.propfirm, formData.accountType, size)
  const customPrice = parseFloat(formData.pricePaid) || 0
  const pricePerAccount = formData.useCustomPrice && customPrice > 0 ? customPrice : autoPrice
  const totalPrice = pricePerAccount * count

  // Mettre à jour le prix automatique quand les paramètres changent
  useEffect(() => {
    if (!formData.useCustomPrice && autoPrice > 0) {
      setFormData((prev) => ({ ...prev, pricePaid: autoPrice.toFixed(2) }))
    }
  }, [autoPrice, formData.useCustomPrice])

  // Générer un nom automatique
  const generateAccountName = (index: number): string => {
    if (!formData.useAutoName) {
      // Si on a des noms personnalisés pour chaque compte
      if (formData.customNames[index]?.trim()) {
        return formData.customNames[index].trim()
      }
      // Sinon, utiliser le nom de base avec numérotation
      const nameBase = formData.nameBase.trim() || "Compte"
      if (count > 1) {
        return `${nameBase} ${String(index + 1).padStart(2, "0")}`
      }
      return nameBase
    }

    const propfirmLabel = PROPFIRM_LABELS[formData.propfirm] || formData.propfirm
    const sizeLabel = availableSizes.find((s) => s.value === formData.size)?.label || size
    const typeLabel = formData.accountType === "EVAL" ? "EVAL" : "FUNDED"
    const timestamp = Date.now()

    return `${propfirmLabel.toUpperCase().replace(/\s+/g, "-")}-${sizeLabel}-${typeLabel}-${timestamp}-${String(index + 1).padStart(2, "0")}`
  }

  // Mettre à jour les noms personnalisés quand le nombre de comptes change
  useEffect(() => {
    if (!formData.useAutoName && count > 0) {
      setFormData((prev) => {
        const newCustomNames = [...prev.customNames]
        // Ajuster la taille du tableau
        while (newCustomNames.length < count) {
          newCustomNames.push("")
        }
        while (newCustomNames.length > count) {
          newCustomNames.pop()
        }
        return { ...prev, customNames: newCustomNames }
      })
    }
  }, [count, formData.useAutoName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.size) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une taille de compte",
        variant: "destructive",
      })
      return
    }

    if (count < 1 || count > 100) {
      toast({
        title: "Erreur",
        description: "Le nombre de comptes doit être entre 1 et 100",
        variant: "destructive",
      })
      return
    }

    if (!formData.useAutoName) {
      // Vérifier que tous les noms sont remplis
      const missingNames = formData.customNames
        .map((name, index) => (!name.trim() ? index + 1 : null))
        .filter((num) => num !== null)

      if (missingNames.length > 0) {
        toast({
          title: "Erreur",
          description: `Veuillez entrer un nom pour le${missingNames.length > 1 ? "s" : ""} compte${missingNames.length > 1 ? "s" : ""} ${missingNames.join(", ")}`,
          variant: "destructive",
        })
        return
      }
    }

    if (formData.useCustomPrice && (!formData.pricePaid || parseFloat(formData.pricePaid) <= 0)) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un prix valide",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const accounts = Array.from({ length: count }, (_, index) => ({
        name: generateAccountName(index),
        propfirm: formData.propfirm,
        size: parseInt(formData.size),
        accountType: formData.accountType,
        status: formData.status,
        pricePaid: pricePerAccount,
        notes: formData.notes || null,
      }))

      const response = await fetch("/api/accounts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Erreur lors de la création des comptes")
      }

      const result = await response.json()

      // Émettre l'événement pour invalider le cache
      // On émet ACCOUNT_CREATED pour chaque compte créé pour invalider le cache
      if (result.accounts && Array.isArray(result.accounts) && result.accounts.length > 0) {
        // Émettre l'événement pour chaque compte créé
        result.accounts.forEach((account: { id: string }) => {
          emitEvent(AppEvents.ACCOUNT_CREATED, { accountId: account.id })
        })
      } else {
        // Fallback : émettre une fois pour invalider le cache
        // Le hook useAccountsListCache écoute cet événement et invalide automatiquement
        emitEvent(AppEvents.ACCOUNT_CREATED, { accountId: "" })
      }

      toast({
        title: "Succès",
        description: `${count} compte${count > 1 ? "s" : ""} créé${count > 1 ? "s" : ""} avec succès`,
      })

      onSuccess()
      onOpenChange(false)
      // Réinitialiser le formulaire
      setFormData({
        count: "1",
        propfirm: PropfirmType.TOPSTEP,
        accountType: AccountType.EVAL,
        size: "",
        nameBase: "",
        customNames: [],
        useAutoName: true,
        pricePaid: "",
        useCustomPrice: false,
        status: "ACTIVE",
        notes: "",
      })
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Erreur lors de la création des comptes",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Réinitialiser la taille quand la propfirm change
  useEffect(() => {
    const newAvailableSizes = ACCOUNT_SIZES_BY_PROPFIRM[formData.propfirm] || []
    const currentSizeAvailable = newAvailableSizes.some((s) => s.value === formData.size)

    if (!currentSizeAvailable && newAvailableSizes.length > 0) {
      setFormData((prev) => ({ ...prev, size: "" }))
    }
  }, [formData.propfirm, formData.size])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Ajouter plusieurs comptes</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Créez plusieurs comptes en une seule fois avec les mêmes paramètres
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Nombre de comptes */}
            <div className="grid gap-2">
              <Label htmlFor="count" className="text-sm font-semibold">
                Nombre de comptes
              </Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="100"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                className="h-10"
                required
              />
            </div>

            {/* Propfirm */}
            <div className="grid gap-2">
              <Label htmlFor="propfirm" className="text-sm font-semibold">
                Propfirm
              </Label>
              <Select
                value={formData.propfirm}
                onValueChange={(value) =>
                  setFormData({ ...formData, propfirm: value as PropfirmType })
                }
              >
                <SelectTrigger id="propfirm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPFIRM_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type de compte */}
            <div className="grid gap-2">
              <Label htmlFor="accountType" className="text-sm font-semibold">
                Type
              </Label>
              <Select
                value={formData.accountType}
                onValueChange={(value) =>
                  setFormData({ ...formData, accountType: value as AccountType })
                }
              >
                <SelectTrigger id="accountType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Taille */}
            <div className="grid gap-2">
              <Label htmlFor="size" className="text-sm font-semibold">
                Taille
              </Label>
              <Select
                value={formData.size}
                onValueChange={(value) => setFormData({ ...formData, size: value })}
              >
                <SelectTrigger id="size">
                  <SelectValue placeholder="Sélectionnez une taille" />
                </SelectTrigger>
                <SelectContent>
                  {availableSizes.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prix */}
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Prix par compte</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.useCustomPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        useCustomPrice: e.target.checked,
                        pricePaid: e.target.checked ? formData.pricePaid : "",
                      })
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    Prix personnalisé
                  </span>
                </label>
              </div>

              {formData.useCustomPrice ? (
                <div className="grid gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pricePaid}
                    onChange={(e) => setFormData({ ...formData, pricePaid: e.target.value })}
                    placeholder="0.00"
                    className="h-10"
                    required={formData.useCustomPrice}
                  />
                  {autoPrice > 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Prix automatique: ${autoPrice.toFixed(2)}
                    </p>
                  )}
                  {customPrice > 0 && (
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-2 mt-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Total ({count} compte{count > 1 ? "s" : ""}):
                        </span>
                        <span className="font-bold text-lg">${totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3">
                  {autoPrice > 0 ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">Prix par compte:</span>
                        <span className="font-semibold">${pricePerAccount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Total ({count} compte{count > 1 ? "s" : ""}):
                        </span>
                        <span className="font-bold text-lg">${totalPrice.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Prix non défini pour cette combinaison. Activez le prix personnalisé pour
                      entrer un montant.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Nommage */}
            <div className="grid gap-3">
              <Label className="text-sm font-semibold">Nommage des comptes</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.useAutoName}
                    onChange={() => setFormData({ ...formData, useAutoName: true })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Génération automatique</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.useAutoName}
                    onChange={() => setFormData({ ...formData, useAutoName: false })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Nom personnalisé</span>
                </label>
              </div>

              {!formData.useAutoName && (
                <div className="grid gap-2">
                  {count === 1 ? (
                    <>
                      <Label
                        htmlFor="nameBase"
                        className="text-xs text-zinc-600 dark:text-zinc-400"
                      >
                        Nom du compte
                      </Label>
                      <Input
                        id="nameBase"
                        value={formData.nameBase}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            nameBase: e.target.value,
                            customNames: [e.target.value],
                          })
                        }}
                        placeholder="Mon compte"
                        className="h-10"
                        required={!formData.useAutoName}
                      />
                    </>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      <Label className="text-xs text-zinc-600 dark:text-zinc-400">
                        Entrez un nom pour chaque compte ({count} compte{count > 1 ? "s" : ""})
                      </Label>
                      {Array.from({ length: count }, (_, index) => (
                        <div key={index} className="grid gap-1">
                          <Label
                            htmlFor={`custom-name-${index}`}
                            className="text-xs text-zinc-500 dark:text-zinc-400"
                          >
                            Compte {index + 1}
                          </Label>
                          <Input
                            id={`custom-name-${index}`}
                            value={formData.customNames[index] || ""}
                            onChange={(e) => {
                              const newCustomNames = [...formData.customNames]
                              newCustomNames[index] = e.target.value
                              setFormData({ ...formData, customNames: newCustomNames })
                            }}
                            placeholder={`Nom du compte ${index + 1}`}
                            className="h-10"
                            required={!formData.useAutoName}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {formData.useAutoName && formData.size && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Exemple de nom généré:{" "}
                    <span className="font-mono font-semibold">{generateAccountName(0)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Notes (optionnel) */}
            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-sm font-semibold">
                Notes (optionnel)
              </Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes communes à tous les comptes"
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer {count} compte{count > 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
