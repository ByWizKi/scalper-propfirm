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
import { Check, Upload, FileText, AlertCircle, Loader2 } from "lucide-react"
import { useCreatePnlMutation, useCreateMultiplePnlMutation, useUpdatePnlMutation } from "@/hooks/use-mutation"
import { useNotification } from "@/hooks/use-notification"
import type { TradingPlatform } from "@/lib/parsers/trade-parser"
import { isProjectXCompatible } from "@/lib/constants/project-x-compatible"
import { emitEvent, AppEvents } from "@/lib/events/event-bus"

interface PnlEntry {
  id: string
  accountId: string
  date: string
  amount: number
  notes?: string
}

interface PropfirmAccount {
  id: string
  name: string
  propfirm: string
  accountType: string
  size: number
  status?: string
}

interface PnlFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: PnlEntry | null
  accounts: PropfirmAccount[]
  onSuccess: () => void
  disableMultipleMode?: boolean // Désactive le mode "Plusieurs comptes" (utile sur la page de détail d'un compte)
}

export function PnlFormDialog({
  open,
  onOpenChange,
  entry,
  accounts,
  onSuccess,
  disableMultipleMode = false,
}: PnlFormDialogProps) {
  // Utiliser les mutations
  const { mutate: createPnl, isLoading: isCreating } = useCreatePnlMutation()
  const { mutate: createMultiplePnl, isLoading: isCreatingMultiple } =
    useCreateMultiplePnlMutation()
  const { mutate: updatePnl, isLoading: isUpdating } = useUpdatePnlMutation()

  // Hook pour les notifications unifiées
  const notification = useNotification()

  const [mode, setMode] = useState<"manual" | "import">("manual")
  const [multipleMode, setMultipleMode] = useState(false)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [filterPropfirm, setFilterPropfirm] = useState<string>("all")
  const [filterAccountType, setFilterAccountType] = useState<string>("all")
  const [formData, setFormData] = useState({
    accountId: "", // Pas de présélection par défaut
    date: new Date().toISOString().split("T")[0],
    amount: "",
    notes: "",
  })

  // États pour l'import
  const [importPlatform, setImportPlatform] = useState<TradingPlatform | "">("")
  const [importAccountId, setImportAccountId] = useState<string>("")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importFileDisplayName, setImportFileDisplayName] = useState<string>("")
  const [importPreview, setImportPreview] = useState<
    Array<{
      date: string
      tradeCount: number
      totalPnl: number
      pnlToAdd?: number
      newTradesCount?: number
      duplicateTradesCount?: number
      isDuplicate?: boolean
      existingAmount?: number
    }>
  >([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const isLoading = isCreating || isCreatingMultiple || isImporting || isUpdating

  // Détecter si l'entrée provient d'un import
  const isImportedEntry = entry?.notes?.includes("Import:")

  useEffect(() => {
    if (entry) {
      setFormData({
        accountId: entry.accountId,
        date: new Date(entry.date).toISOString().split("T")[0],
        amount: entry.amount.toString(),
        notes: entry.notes || "",
      })
      setMultipleMode(false)
      setSelectedAccountIds([])
      // Si c'est une entrée importée, permettre le mode import
      setMode(isImportedEntry ? "import" : "manual")
      // Pré-remplir la plateforme si détectable depuis les notes
      if (isImportedEntry) {
        const notes = entry.notes || ""
        if (notes.includes("PROJECT_X") || notes.includes("Project X")) {
          setImportPlatform("PROJECT_X")
        } else if (notes.includes("TRADOVATE") || notes.includes("Tradovate")) {
          setImportPlatform("TRADOVATE")
        }
        setImportAccountId(entry.accountId)
      }
    } else if (accounts.length > 0 && open) {
      setFormData({
        accountId: accounts[0].id,
        date: new Date().toISOString().split("T")[0],
        amount: "",
        notes: "",
      })
      // Si le mode multiple est désactivé, forcer le mode simple
      if (disableMultipleMode) {
        setMultipleMode(false)
      }
      setSelectedAccountIds([])
      setFilterPropfirm("all")
      setFilterAccountType("all")
      setMode("manual")
      // Réinitialiser l'import
      setImportPlatform("")
      setImportAccountId("")
      setImportFile(null)
      setImportFileDisplayName("")
      setImportPreview([])
    }
  }, [entry, accounts, open, isImportedEntry, disableMultipleMode])

  // Charger les dernières valeurs d'import depuis localStorage quand on passe en mode import
  useEffect(() => {
    if (mode === "import" && !entry && open && accounts.length > 0) {
      // Ne charger que si les valeurs ne sont pas déjà définies
      if (!importPlatform && !importAccountId) {
        try {
          const lastImport = localStorage.getItem("lastPnlImport")
          if (lastImport) {
            const { platform, accountId } = JSON.parse(lastImport)
            // Ne préremplir que si c'était Project X
            if (platform === "PROJECT_X") {
              // Vérifier que le compte existe toujours et est compatible
              const accountExists = accounts.find(
                (acc) => acc.id === accountId && acc.status === "ACTIVE"
              )
              if (accountExists && isProjectXCompatible(accountExists.propfirm)) {
                setImportPlatform(platform)
                setImportAccountId(accountId)
              }
            }
          }
        } catch (error) {
          console.error("Error loading last import settings:", error)
        }
      }
    }
  }, [mode, open, entry, accounts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Mode édition
      if (entry) {
        await updatePnl({
          id: entry.id,
          accountId: entry.accountId,
          date: formData.date,
          amount: parseFloat(formData.amount) || 0,
          notes: formData.notes || undefined,
        })

        notification.showUpdate("PnL modifié avec succès", 2500, () => {
          onSuccess()
          onOpenChange(false)
        })
      }
      // Mode multiple
      else if (multipleMode && selectedAccountIds.length > 0) {
        try {
          await createMultiplePnl({
            accountIds: selectedAccountIds,
            date: formData.date,
            amount: formData.amount,
            notes: formData.notes,
          })

          // Durée adaptée selon le nombre de comptes (plus de comptes = plus de temps pour lire)
          const duration = selectedAccountIds.length > 5 ? 3500 : selectedAccountIds.length > 2 ? 3000 : 2500
          notification.showCreate(
            `${selectedAccountIds.length} PnL ajouté(s) avec succès`,
            duration,
            () => {
              onSuccess()
              onOpenChange(false)
            }
          )
        } catch (multipleError) {
          // Si l'erreur vient de createMultiplePnl, elle sera gérée dans le catch global
          throw multipleError
        }
      }
      // Mode simple
      else {
        try {
          await createPnl(formData)

          notification.showCreate("PnL ajouté avec succès", 2500, () => {
            onSuccess()
            onOpenChange(false)
          })
        } catch (createError) {
          // Si l'erreur vient de createPnl, elle sera gérée dans le catch global
          throw createError
        }
      }
    } catch (_error) {
      notification.handleError(_error, "Erreur lors de l'opération")
      console.error(_error)
    }
  }

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    )
  }

  const selectAllFiltered = () => {
    setSelectedAccountIds(filteredAccounts.map((acc) => acc.id))
  }

  const deselectAll = () => {
    setSelectedAccountIds([])
  }

  // Get unique propfirms and account types
  const uniquePropfirms = Array.from(new Set(accounts.map((acc) => acc.propfirm)))
  const uniqueAccountTypes = Array.from(new Set(accounts.map((acc) => acc.accountType)))

  // Filter accounts - uniquement les comptes ACTIVE
  const filteredAccounts = accounts.filter((account) => {
    // Uniquement les comptes avec statut ACTIVE
    if (account.status !== "ACTIVE") return false
    if (filterPropfirm !== "all" && account.propfirm !== filterPropfirm) return false
    if (filterAccountType !== "all" && account.accountType !== filterAccountType) return false
    return true
  })

  // Group accounts by propfirm and type
  const groupedAccounts = filteredAccounts.reduce(
    (acc, account) => {
      const key = `${account.propfirm}-${account.accountType}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(account)
      return acc
    },
    {} as Record<string, PropfirmAccount[]>
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Gestion de l'import de trades
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setImportFileDisplayName("")
      return
    }

    setImportFile(file)
    setImportFileDisplayName(file.name)
    setIsLoadingPreview(true)

    try {
      const content = await file.text()

      // Vérifier que c'est un CSV
      const hasCsvDelimiter = content.includes(",") || content.includes(";")
      if (!hasCsvDelimiter) {
        notification.showError("Le fichier ne semble pas être un fichier CSV valide", 3500)
        setImportFile(null)
        setIsLoadingPreview(false)
        return
      }

      // Prévisualiser l'import (inclure accountId pour détecter les doublons)
      const previewRes = await fetch("/api/trades/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: importPlatform,
          csvContent: content,
          accountId: importAccountId, // Inclure accountId pour détecter les doublons
        }),
      })

      if (!previewRes.ok) {
        const error = await previewRes.json()
        throw new Error(error.message || "Erreur lors de la prévisualisation")
      }

      const previewData = await previewRes.json()
      setImportPreview(previewData.preview || [])
    } catch (error) {
      console.error("Error previewing import:", error)
      notification.handleError(
        error,
        error instanceof Error ? error.message : "Erreur lors de la prévisualisation"
      )
      setImportFile(null)
      setImportFileDisplayName("")
      setImportPreview([])
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleImport = async () => {
    if (!importFile || !importPlatform || !importAccountId) {
      notification.showError("Veuillez sélectionner une plateforme, un compte et un fichier CSV", 4000)
      return
    }

    setIsImporting(true)

    try {
      const content = await importFile.text()

      const res = await fetch("/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: importPlatform,
          accountId: importAccountId,
          csvContent: content,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Erreur lors de l'import")
      }

      const data = await res.json()

      // Sauvegarder les paramètres d'import pour la prochaine fois
      try {
        const importSettings = {
          platform: importPlatform,
          accountId: importAccountId,
        }
        localStorage.setItem("lastPnlImport", JSON.stringify(importSettings))
        console.log("[PnlFormDialog] Saved last import settings:", importSettings)
      } catch (error) {
        console.error("Error saving last import settings:", error)
      }

      // Émettre les événements pour mettre à jour le cache
      // L'API peut créer ou mettre à jour des PnL, on émet les événements appropriés
      if (data.created > 0) {
        // Émettre un événement PNL_CREATED pour chaque PnL créé
        // Comme on ne connaît pas les IDs exacts, on émet un événement avec l'accountId
        // qui forcera le refetch du compte
        emitEvent(AppEvents.PNL_CREATED, {
          accountId: importAccountId,
          pnlId: "import", // ID générique pour indiquer qu'il s'agit d'un import
        })
      }
      if (data.skipped > 0) {
        // Émettre un événement PNL_UPDATED pour chaque PnL mis à jour
        emitEvent(AppEvents.PNL_UPDATED, {
          accountId: importAccountId,
          pnlId: "import", // ID générique pour indiquer qu'il s'agit d'un import
        })
      }

      // Afficher le succès avec les détails mis à jour
      const createdCount = data.created || 0
      const updatedCount = data.skipped || 0
      const tradesCount = data.tradesStored || 0
      const duplicatesIgnored = data.duplicatesIgnored || 0

      // Construire le message de succès avec toutes les informations
      let message = ""
      if (createdCount > 0 && updatedCount > 0) {
        message = `${createdCount} PnL créé(s), ${updatedCount} mis à jour, ${tradesCount} trade(s) ajouté(s)`
      } else if (createdCount > 0) {
        message = `${createdCount} PnL créé(s) et ${tradesCount} trade(s) ajouté(s)`
      } else if (updatedCount > 0) {
        message = `${updatedCount} PnL mis à jour et ${tradesCount} trade(s) ajouté(s)`
      } else if (tradesCount > 0) {
        message = `${tradesCount} trade(s) ajouté(s)`
      } else {
        message = "Import terminé"
      }

      // Ajouter l'information sur les doublons ignorés si applicable
      if (duplicatesIgnored > 0) {
        message += ` (${duplicatesIgnored} trade(s) en doublon ignoré(s))`
      }

      // Durée adaptée selon la longueur et la complexité du message
      // Messages longs avec plusieurs informations nécessitent plus de temps
      let duration = 3000
      if (message.length > 80 || (createdCount > 0 && updatedCount > 0)) {
        duration = 4500 // Message complexe avec plusieurs infos
      } else if (message.length > 50 || tradesCount > 10) {
        duration = 4000 // Message moyen ou beaucoup de trades
      } else if (tradesCount > 0) {
        duration = 3500 // Au moins quelques trades
      }

      // Fermer le dialog immédiatement et appeler onSuccess
      onSuccess()
      onOpenChange(false)

      // Afficher la notification (se fermera automatiquement)
      notification.showCreate(message, duration)
    } catch (error) {
      console.error("Error importing trades:", error)
      notification.handleError(error, "Erreur lors de l'import")
    } finally {
      setIsImporting(false)
    }
  }

  // Filtrer les comptes selon la plateforme pour l'import
  const importFilteredAccounts = accounts.filter((account) => {
    if (account.status !== "ACTIVE") return false
    if (importPlatform === "PROJECT_X" && !isProjectXCompatible(account.propfirm)) return false
    return true
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl flex flex-col p-0 max-h-[95vh]">
        <DialogHeader className="space-y-1 pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 text-left border-b border-slate-200 dark:border-[#1e293b] shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-bold leading-tight pr-10 text-slate-900 dark:text-slate-50">
            {entry ? "Modifier le PnL" : "Ajouter un PnL"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {entry ? "Modifiez l'entrée PnL" : "Ajoutez une nouvelle entrée de profit ou perte"}
          </DialogDescription>
        </DialogHeader>

        {mode === "manual" ? (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-2.5 px-4 sm:px-5 lg:px-6 pb-3 pt-3 flex-1 overflow-y-auto">
              {/* Mode selector */}
              {!entry && (
                <div className="flex gap-1.5 p-1.5 bg-slate-50 dark:bg-[#1e293b]/50 rounded-lg border border-slate-200 dark:border-[#1e293b]">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => setMode("manual")}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    Manuel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMode("import")
                      // Charger les dernières valeurs d'import quand on passe en mode import
                      setTimeout(() => {
                        try {
                          const lastImport = localStorage.getItem("lastPnlImport")
                          console.log("[PnlFormDialog] Loading last import:", lastImport)
                          if (lastImport) {
                            const { platform, accountId } = JSON.parse(lastImport)
                            console.log("[PnlFormDialog] Parsed:", { platform, accountId })
                            // Ne préremplir que si c'était Project X
                            if (platform === "PROJECT_X") {
                              const accountExists = accounts.find(
                                (acc) => acc.id === accountId && acc.status === "ACTIVE"
                              )
                              console.log("[PnlFormDialog] Account exists:", accountExists)
                              if (accountExists && isProjectXCompatible(accountExists.propfirm)) {
                                console.log("[PnlFormDialog] Setting platform and account")
                                setImportPlatform(platform)
                                setImportAccountId(accountId)
                              }
                            }
                          }
                        } catch (error) {
                          console.error("Error loading last import settings:", error)
                        }
                      }, 100)
                    }}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    Import CSV
                  </Button>
                </div>
              )}

              {/* Mode selector pour compte unique/multiple */}
              {!entry && mode === "manual" && !disableMultipleMode && (
                <div className="flex gap-1.5 p-1.5 bg-slate-50 dark:bg-[#1e293b]/50 rounded-lg border border-slate-200 dark:border-[#1e293b]">
                  <Button
                    type="button"
                    variant={!multipleMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMultipleMode(false)}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    Compte unique
                  </Button>
                  <Button
                    type="button"
                    variant={multipleMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMultipleMode(true)}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    Plusieurs comptes
                  </Button>
                </div>
              )}

              {/* Single account selector */}
              {!entry && !multipleMode && (
                <div className="grid gap-2">
                  <Label htmlFor="accountId" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Compte *
                  </Label>
                  <Select
                    value={formData.accountId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, accountId: value })
                      // Retirer le focus après la sélection
                      setTimeout(() => {
                        const trigger = document.getElementById("accountId") as HTMLButtonElement
                        trigger?.blur()
                      }, 0)
                    }}
                    onOpenChange={(open) => {
                      if (!open) {
                        // Retirer le focus quand le select se ferme
                        setTimeout(() => {
                          const trigger = document.getElementById("accountId") as HTMLButtonElement
                          trigger?.blur()
                        }, 0)
                      }
                    }}
                    required
                  >
                    <SelectTrigger
                      id="accountId"
                      className="w-full text-sm min-w-0 [&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1 [&>span]:text-left [&>span]:block"
                    >
                      <SelectValue placeholder="Sélectionner un compte" />
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] sm:max-w-none">
                      {filteredAccounts.map((account) => (
                        <SelectItem
                          key={account.id}
                          value={account.id}
                          className="text-sm truncate block max-w-full"
                        >
                          {account.name} - {account.propfirm} ({account.accountType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Multiple accounts selector */}
              {!entry && multipleMode && (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                      Comptes sélectionnés ({selectedAccountIds.length})
                    </Label>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllFiltered}
                        disabled={filteredAccounts.length === 0}
                        className="text-xs h-7 px-2"
                      >
                        Tout sélectionner
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={deselectAll}
                        disabled={selectedAccountIds.length === 0}
                        className="text-xs h-7 px-2"
                      >
                        Tout désélectionner
                      </Button>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="filterPropfirm" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Propfirm
                      </Label>
                      <Select
                        value={filterPropfirm}
                        onValueChange={(value) => {
                          setFilterPropfirm(value)
                          setTimeout(() => {
                            const trigger = document.getElementById("filterPropfirm") as HTMLButtonElement
                            trigger?.blur()
                          }, 0)
                        }}
                        onOpenChange={(open) => {
                          if (!open) {
                            setTimeout(() => {
                              const trigger = document.getElementById("filterPropfirm") as HTMLButtonElement
                              trigger?.blur()
                            }, 0)
                          }
                        }}
                      >
                        <SelectTrigger id="filterPropfirm" className="h-8 text-xs min-w-0 [&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1 [&>span]:text-left [&>span]:block">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] sm:max-w-none">
                          <SelectItem value="all">Toutes</SelectItem>
                          {uniquePropfirms.map((propfirm) => (
                            <SelectItem key={propfirm} value={propfirm}>
                              {propfirm}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="filterAccountType" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Type
                      </Label>
                      <Select
                        value={filterAccountType}
                        onValueChange={(value) => {
                          setFilterAccountType(value)
                          setTimeout(() => {
                            const trigger = document.getElementById("filterAccountType") as HTMLButtonElement
                            trigger?.blur()
                          }, 0)
                        }}
                        onOpenChange={(open) => {
                          if (!open) {
                            setTimeout(() => {
                              const trigger = document.getElementById("filterAccountType") as HTMLButtonElement
                              trigger?.blur()
                            }, 0)
                          }
                        }}
                      >
                        <SelectTrigger id="filterAccountType" className="h-8 text-xs min-w-0 [&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1 [&>span]:text-left [&>span]:block">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] sm:max-w-none">
                          <SelectItem value="all">Tous</SelectItem>
                          {uniqueAccountTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type === "EVAL"
                                ? "Évaluation"
                                : type === "FUNDED"
                                  ? "Financé"
                                  : type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Account list */}
                  <div className="border border-slate-200/70 dark:border-[#1e293b]/70 rounded-lg max-h-[150px] overflow-y-auto bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
                    {filteredAccounts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                        Aucun compte trouvé
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200/70 dark:divide-[#1e293b]/70">
                        {Object.entries(groupedAccounts).map(([groupKey, groupAccounts]) => {
                          const [propfirm, accountType] = groupKey.split("-")
                          return (
                            <div key={groupKey}>
                              <div className="px-2.5 py-1.5 bg-slate-50/70 dark:bg-[#1e293b]/70 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate border-b border-slate-200/50 dark:border-[#1e293b]/50">
                                {propfirm} - {accountType === "EVAL" ? "Évaluation" : "Financé"}
                              </div>
                              {groupAccounts.map((account) => (
                                <div
                                  key={account.id}
                                  className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/30 cursor-pointer transition-colors"
                                  onClick={() => toggleAccountSelection(account.id)}
                                >
                                  <div
                                    className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                      selectedAccountIds.includes(account.id)
                                        ? "bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500"
                                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151b2e]"
                                    }`}
                                  >
                                    {selectedAccountIds.includes(account.id) && (
                                      <Check className="h-2 w-2 text-white" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate text-slate-900 dark:text-slate-50">{account.name}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                      {formatCurrency(account.size)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="date" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  disabled={isImportedEntry}
                  className="text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="amount" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Montant (USD) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="500.00 (positif pour profit, négatif pour perte)"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  disabled={isImportedEntry}
                  className="text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Utilisez un nombre positif pour un profit, négatif pour une perte
                </p>
                {isImportedEntry && mode === "manual" && (
                  <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Cette entrée provient d&apos;un import de trades. Basculez vers le mode
                      &quot;Import CSV&quot; pour ajouter un nouveau fichier qui recalculera
                      automatiquement le PnL pour cette date.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Notes
                </Label>
                <textarea
                  id="notes"
                  className="flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 cursor-text disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#1e293b] dark:bg-[#151b2e] dark:placeholder:text-slate-400 dark:focus-visible:ring-indigo-400"
                  placeholder="Notes supplémentaires..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={isImportedEntry}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3 px-4 sm:px-5 lg:px-6 pb-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading || (multipleMode && selectedAccountIds.length === 0) || isImportedEntry
                }
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                {isLoading
                  ? "En cours..."
                  : entry
                    ? isImportedEntry
                      ? "Non modifiable (import)"
                      : "Mettre à jour"
                    : multipleMode
                      ? `Ajouter (${selectedAccountIds.length})`
                      : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleImport(); }} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-3 px-4 sm:px-5 lg:px-6 pb-4 pt-3 overflow-y-auto flex-1">
              {/* Mode selector */}
              {(!entry || isImportedEntry) && (
                <div className="flex gap-2 p-2 bg-slate-50 dark:bg-[#1e293b]/50 rounded-xl border border-slate-200 dark:border-[#1e293b]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMode("manual")}
                    className="flex-1 text-sm h-9"
                    disabled={isImportedEntry}
                  >
                    Manuel
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setMode("import")
                      // Charger les dernières valeurs d'import quand on passe en mode import
                      setTimeout(() => {
                        try {
                          const lastImport = localStorage.getItem("lastPnlImport")
                          if (lastImport) {
                            const { platform, accountId } = JSON.parse(lastImport)
                            // Ne préremplir que si c'était Project X
                            if (platform === "PROJECT_X") {
                              const accountExists = accounts.find(
                                (acc) => acc.id === accountId && acc.status === "ACTIVE"
                              )
                              if (accountExists && isProjectXCompatible(accountExists.propfirm)) {
                                setImportPlatform(platform)
                                setImportAccountId(accountId)
                              }
                            }
                          }
                        } catch (error) {
                          console.error("Error loading last import settings:", error)
                        }
                      }, 100)
                    }}
                    className="flex-1 text-sm h-9"
                  >
                    Import CSV
                  </Button>
                </div>
              )}

              {isImportedEntry && (
                <div className="flex items-start gap-2.5 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                    Ajoutez un nouveau fichier CSV pour mettre à jour cette entrée. L&apos;import
                    recalculera automatiquement le PnL pour la date{" "}
                    <span className="font-semibold">
                      {new Date(entry?.date || "").toLocaleDateString("fr-FR")}
                    </span>
                    .
                  </p>
                </div>
              )}

              {/* Sélection de la plateforme */}
              <div className="grid gap-2">
                <Label htmlFor="importPlatform" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Plateforme *
                </Label>
                <Select
                  value={importPlatform}
                  onValueChange={(value) => {
                    setImportPlatform(value as TradingPlatform)
                    // Réinitialiser le compte et le fichier quand on change de plateforme
                    setImportAccountId("")
                    setImportFile(null)
                    setImportFileDisplayName("")
                    setImportPreview([])
                    setTimeout(() => {
                      const trigger = document.getElementById("importPlatform") as HTMLButtonElement
                      trigger?.blur()
                    }, 0)
                  }}
                  onOpenChange={(open) => {
                    if (!open) {
                      setTimeout(() => {
                        const trigger = document.getElementById("importPlatform") as HTMLButtonElement
                        trigger?.blur()
                      }, 0)
                    }
                  }}
                >
                  <SelectTrigger
                    id="importPlatform"
                    className="text-sm w-full min-w-0 [&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1 [&>span]:text-left [&>span]:block"
                  >
                    <SelectValue placeholder="Sélectionner une plateforme" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] sm:max-w-none">
                    <SelectItem value="PROJECT_X" className="text-sm py-2">
                      Project X
                    </SelectItem>
                    <SelectItem value="TRADOVATE" className="text-sm py-2">
                      Tradovate
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sélection du compte */}
              {importPlatform && (
                <div className="grid gap-2">
                  <Label htmlFor="importAccountId" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Compte *
                  </Label>
                  <Select
                    value={importAccountId}
                    onValueChange={(value) => {
                      setImportAccountId(value)
                      // Réinitialiser le fichier quand on change de compte
                      setImportFile(null)
                      setImportFileDisplayName("")
                      setImportPreview([])
                      setTimeout(() => {
                        const trigger = document.getElementById("importAccountId") as HTMLButtonElement
                        trigger?.blur()
                      }, 0)
                    }}
                    onOpenChange={(open) => {
                      if (!open) {
                        setTimeout(() => {
                          const trigger = document.getElementById("importAccountId") as HTMLButtonElement
                          trigger?.blur()
                        }, 0)
                      }
                    }}
                  >
                    <SelectTrigger
                      id="importAccountId"
                      className="text-sm w-full min-w-0 [&>span]:truncate [&>span]:min-w-0 [&>span]:flex-1 [&>span]:text-left [&>span]:block"
                    >
                      <SelectValue placeholder="Sélectionner un compte" />
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] sm:max-w-none max-h-[300px]">
                      {importFilteredAccounts.map((account) => (
                        <SelectItem
                          key={account.id}
                          value={account.id}
                          className="text-sm py-2 truncate block max-w-full"
                        >
                          {account.name} - {account.propfirm} ({account.accountType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {importPlatform === "PROJECT_X" && importFilteredAccounts.length === 0 && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Aucun compte compatible avec Project X trouvé. Seuls certains propfirms sont
                      compatibles.
                    </p>
                  )}
                </div>
              )}

              {/* Upload de fichier */}
              {importPlatform && importAccountId && (
                <div className="grid gap-2">
                  <Label htmlFor="importFile" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Fichier CSV *
                  </Label>
                  <div className="relative">
                    <Input
                      id="importFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("importFile")?.click()}
                      disabled={isLoadingPreview}
                      className="w-full justify-start text-sm h-10 px-3"
                    >
                      <Upload className="h-4 w-4 mr-2 shrink-0" />
                      <span className="truncate flex-1 text-left">
                        {importFileDisplayName || "Sélectionner un fichier CSV"}
                      </span>
                      {isLoadingPreview && (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-500 dark:text-slate-400 ml-2 shrink-0" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sélectionnez un fichier CSV exporté depuis{" "}
                    {importPlatform === "PROJECT_X" ? "Project X" : "Tradovate"}
                  </p>
                </div>
              )}

              {/* Aperçu de l'import */}
              {importPreview.length > 0 && (
                <div className="border border-slate-200 dark:border-[#1e293b] rounded-xl p-3 bg-slate-50 dark:bg-[#1e293b]/30">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0" />
                    <Label className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      Aperçu de l&apos;import
                    </Label>
                  </div>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto">
                    {importPreview.map((day, index) => {
                      const pnlToShow = day.isDuplicate && day.pnlToAdd !== undefined ? day.pnlToAdd : day.totalPnl
                      const tradesToShow = day.newTradesCount !== undefined ? day.newTradesCount : day.tradeCount

                      return (
                        <div
                          key={index}
                          className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                            day.isDuplicate
                              ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
                              : "bg-white dark:bg-[#151b2e] border-slate-200 dark:border-[#1e293b]"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-50">
                                {new Date(day.date).toLocaleDateString("fr-FR", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                              {day.isDuplicate && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-500 text-white shrink-0">
                                  DOUBLON
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {day.tradeCount} trade{day.tradeCount > 1 ? "s" : ""} au total
                              {day.duplicateTradesCount !== undefined && day.duplicateTradesCount > 0 && (
                                <span className="ml-1 text-orange-600 dark:text-orange-400">
                                  ({day.duplicateTradesCount} en doublon, {day.newTradesCount || 0} nouveau{day.newTradesCount && day.newTradesCount > 1 ? "x" : ""})
                                </span>
                              )}
                            </p>
                            {day.isDuplicate && day.existingAmount !== undefined && day.pnlToAdd !== undefined && day.pnlToAdd !== 0 && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                PnL existant: {formatCurrency(day.existingAmount)} → +{formatCurrency(day.pnlToAdd)} = {formatCurrency(day.existingAmount + day.pnlToAdd)}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {day.isDuplicate && day.pnlToAdd !== undefined ? (
                              <>
                                <p
                                  className={`text-sm font-bold whitespace-nowrap ${
                                    day.pnlToAdd >= 0
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  +{formatCurrency(day.pnlToAdd)}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">PnL à ajouter</p>
                              </>
                            ) : (
                              <>
                                <p
                                  className={`text-sm font-bold whitespace-nowrap ${
                                    day.totalPnl >= 0
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {day.totalPnl >= 0 ? "+" : ""}
                                  {formatCurrency(day.totalPnl)}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">PnL net</p>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-[#1e293b]">
                    <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                      Total: <span className="font-semibold">{importPreview.length}</span> jour{importPreview.length > 1 ? "s" : ""},{" "}
                      <span className="font-semibold">
                        {importPreview.reduce((sum, day) => sum + (day.newTradesCount || day.tradeCount), 0)}
                      </span>{" "}
                      nouveau{importPreview.reduce((sum, day) => sum + (day.newTradesCount || day.tradeCount), 0) > 1 ? "x" : ""} trade{importPreview.reduce((sum, day) => sum + (day.newTradesCount || day.tradeCount), 0) > 1 ? "s" : ""}
                      {importPreview.some(day => day.isDuplicate) && (
                        <span className="text-orange-600 dark:text-orange-400">
                          {" "}({importPreview.reduce((sum, day) => sum + (day.duplicateTradesCount || 0), 0)} doublon{importPreview.reduce((sum, day) => sum + (day.duplicateTradesCount || 0), 0) > 1 ? "s" : ""} ignoré{importPreview.reduce((sum, day) => sum + (day.duplicateTradesCount || 0), 0) > 1 ? "s" : ""})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      PnL total à ajouter: <span className="font-semibold">
                        {formatCurrency(importPreview.reduce((sum, day) => sum + (day.pnlToAdd !== undefined ? day.pnlToAdd : day.totalPnl), 0))}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* DialogFooter pour le mode import */}
            <DialogFooter className="gap-2 pt-3 px-4 sm:px-5 lg:px-6 pb-4 border-t border-slate-200 dark:border-[#1e293b] shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isImporting}
                className="w-full sm:w-auto text-sm h-10"
              >
                Annuler
              </Button>
              {(() => {
                const totalNewTrades = importPreview.reduce((sum, day) => sum + (day.newTradesCount || 0), 0)
                const hasNewTrades = totalNewTrades > 0

                if (!hasNewTrades && importPreview.length > 0) {
                  return (
                    <div className="w-full space-y-2">
                      <div className="flex items-start gap-2.5 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                            Aucun nouveau trade à importer
                          </p>
                          <p className="text-xs text-orange-800 dark:text-orange-200 mt-1">
                            Tous les trades de ce fichier sont déjà en base de données. L&apos;import sera annulé.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setImportFile(null)
                          setImportFileDisplayName("")
                          setImportPreview([])
                          if (document.getElementById("importFile")) {
                            ;(document.getElementById("importFile") as HTMLInputElement).value = ""
                          }
                        }}
                        className="w-full text-sm h-10"
                      >
                        Annuler l&apos;import
                      </Button>
                    </div>
                  )
                }

                return (
                  <Button
                    type="submit"
                    disabled={
                      isImporting ||
                      !importFile ||
                      !importPlatform ||
                      !importAccountId ||
                      importPreview.length === 0 ||
                      !hasNewTrades
                    }
                    className="w-full sm:w-auto text-sm h-10"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Import en cours...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Importer les trades
                      </>
                    )}
                  </Button>
                )
              })()}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
