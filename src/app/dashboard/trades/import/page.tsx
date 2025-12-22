"use client"

import React, { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Search } from "lucide-react"
import { useNotification } from "@/hooks/use-notification"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { TradingPlatform } from "@/lib/parsers/trade-parser"
import {
  isProjectXCompatible,
  PROJECT_X_COMPATIBLE_LIST,
} from "@/lib/constants/project-x-compatible"
import { Info } from "lucide-react"

interface ExtendedError extends Error {
  errorCode?: string
  status?: number
}

interface PropfirmAccount {
  id: string
  name: string
  propfirm: string
  accountType: string
  status: string
}

interface ImportPreview {
  date: string
  totalPnl: number
  pnlToAdd: number // PnL à ajouter (seulement les nouveaux trades)
  totalFees?: number
  totalCommissions?: number
  tradeCount: number // Nombre total de trades dans le CSV
  newTradesCount: number // Nombre de nouveaux trades (non doublons)
  duplicateTradesCount: number // Nombre de trades en doublon
  isDuplicate?: boolean
  existingAmount?: number
}

export default function TradesImportPage() {
  const router = useRouter()
  const notification = useNotification()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<TradingPlatform | "">("")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [allAccounts, setAllAccounts] = useState<PropfirmAccount[]>([])
  const [accounts, setAccounts] = useState<PropfirmAccount[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<ImportPreview[]>([])
  const [fileName, setFileName] = useState<string>("")
  const [accountSearch, setAccountSearch] = useState<string>("")

  // Charger les comptes au montage
  React.useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await fetch("/api/accounts")
        if (!res.ok) throw new Error("Erreur lors du chargement des comptes")
        const data = await res.json()
        // Filtrer uniquement les comptes ACTIVE
        const activeAccounts = data.filter((acc: PropfirmAccount) => acc.status === "ACTIVE")
        setAllAccounts(activeAccounts)
        setAccounts(activeAccounts)
      } catch (error) {
        notification.handleError(error, "Impossible de charger les comptes")
      } finally {
        setIsLoadingAccounts(false)
      }
    }
    loadAccounts()
  }, [notification])

  // Filtrer les comptes selon la plateforme sélectionnée et présélectionner le premier compte
  React.useEffect(() => {
    if (selectedPlatform === "PROJECT_X") {
      // Filtrer uniquement les comptes compatibles avec Project X
      const compatibleAccounts = allAccounts.filter((acc) => isProjectXCompatible(acc.propfirm))
      setAccounts(compatibleAccounts)
      // Vérifier si le compte actuel est compatible
      const currentAccountCompatible = compatibleAccounts.find(
        (acc) => acc.id === selectedAccountId
      )
      // Si le compte actuel n'est pas compatible ou si aucun compte n'est sélectionné, présélectionner le premier
      if (!currentAccountCompatible && compatibleAccounts.length > 0) {
        setSelectedAccountId(compatibleAccounts[0].id)
      }
    } else if (selectedPlatform === "TRADOVATE") {
      // Pour Tradovate, on affiche tous les comptes
      setAccounts(allAccounts)
      // Vérifier si le compte actuel existe toujours
      const currentAccountExists = allAccounts.find((acc) => acc.id === selectedAccountId)
      // Si le compte actuel n'existe pas ou si aucun compte n'est sélectionné, présélectionner le premier
      if (!currentAccountExists && allAccounts.length > 0) {
        setSelectedAccountId(allAccounts[0].id)
      }
    } else {
      // Aucune plateforme sélectionnée, afficher tous les comptes et réinitialiser la sélection
      setAccounts(allAccounts)
      if (selectedAccountId) {
        setSelectedAccountId("")
      }
    }
  }, [selectedPlatform, allAccounts, selectedAccountId])

  // Fonction pour charger la prévisualisation
  const loadPreview = React.useCallback(
    async (csvContent: string) => {
      if (!selectedPlatform || !csvContent) {
        return
      }

      try {
        const previewRes = await fetch("/api/trades/import/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: selectedPlatform,
            csvContent,
            accountId: selectedAccountId,
          }),
        })

        if (!previewRes.ok) {
          const errorData = await previewRes.json()
          const error = new Error(
            errorData.message || "Erreur lors de la prévisualisation"
          ) as ExtendedError
          error.errorCode = errorData.error
          error.status = previewRes.status
          throw error
        }

        const previewData = await previewRes.json()
        setPreview(previewData.preview)
      } catch (error) {
        notification.handleError(error, "Erreur lors de la prévisualisation")
      }
    },
    [selectedPlatform, selectedAccountId, notification]
  )

  // Recharger la prévisualisation quand le compte change (si un fichier est déjà chargé)
  React.useEffect(() => {
    if (selectedAccountId && fileName && fileInputRef.current?.files?.[0]) {
      const file = fileInputRef.current.files[0]
      const reader = new FileReader()
      reader.onload = async (e) => {
        const content = e.target?.result as string
        if (content) {
          await loadPreview(content)
        }
      }
      reader.readAsText(file)
    }
  }, [selectedAccountId, loadPreview, fileName])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!selectedPlatform) {
      notification.showError("Veuillez sélectionner une plateforme")
      return
    }

    setFileName(file.name)

    // Lire le fichier
    const reader = new FileReader()
    reader.onload = async (e) => {
      const content = e.target?.result as string
      if (!content) return

      try {
        // Vérifier que le contenu n'est pas vide
        if (!content || content.trim().length === 0) {
          throw new Error("Le fichier sélectionné est vide")
        }

        // Vérifier que c'est bien un CSV (au moins une virgule ou un point-virgule)
        const hasCsvDelimiter = content.includes(",") || content.includes(";")
        if (!hasCsvDelimiter) {
          throw new Error(
            "Le fichier ne semble pas être un fichier CSV valide (aucun délimiteur trouvé)"
          )
        }

        // Vérifier qu'il y a au moins 2 lignes non vides (en-tête + données)
        const lines = content
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
        if (lines.length < 2) {
          throw new Error(
            "Le fichier CSV ne contient que l'en-tête, aucune donnée de trade trouvée.\n\n" +
              "Vérifiez que votre fichier d'export contient bien des trades. " +
              "Le fichier doit contenir au moins une ligne de données après l'en-tête."
          )
        }

        // Prévisualiser les données
        await loadPreview(content)
      } catch (error) {
        notification.handleError(error, "Erreur lors de la lecture du fichier")
        setPreview([])
        setFileName("")
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }

    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!selectedPlatform || !selectedAccountId || !fileName) {
      notification.showError("Veuillez sélectionner une plateforme, un compte et un fichier")
      return
    }

    if (preview.length === 0) {
      notification.showError("Aucune donnée à importer")
      return
    }

    setIsUploading(true)

    try {
      // Relire le fichier pour l'envoyer
      const file = fileInputRef.current?.files?.[0]
      if (!file) {
        throw new Error("Fichier introuvable")
      }

      const reader = new FileReader()
      reader.onload = async (e) => {
        const content = e.target?.result as string
        if (!content) return

        try {
          const res = await fetch("/api/trades/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              platform: selectedPlatform,
              accountId: selectedAccountId,
              csvContent: content,
            }),
          })

          if (!res.ok) {
            const errorData = await res.json()
            const error = new Error(errorData.message || "Erreur lors de l'import") as ExtendedError
            // Préserver les informations d'erreur pour la détection de doublons
            error.errorCode = errorData.error
            error.status = res.status
            throw error
          }

          const result = await res.json()

          notification.showSuccess(
            `${result.created} entrée(s) PnL créée(s) avec succès${result.skipped > 0 ? `, ${result.skipped} mise(s) à jour` : ""}`
          )

          // Réinitialiser le formulaire
          setSelectedPlatform("")
          setSelectedAccountId("")
          setPreview([])
          setFileName("")
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }

          // Rediriger vers la page PnL
          router.push("/dashboard/pnl")
        } catch (error) {
          notification.handleError(error, "Erreur lors de l'import")
        } finally {
          setIsUploading(false)
        }
      }

      reader.readAsText(file)
    } catch (error) {
      notification.handleError(error, "Erreur lors de l'import")
      setIsUploading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Calculer le PnL total à ajouter (seulement les nouveaux trades, pas les doublons)
  const totalPnlToAdd = preview.reduce((sum, day) => sum + day.pnlToAdd, 0)
  const totalPnl = preview.reduce((sum, day) => sum + day.totalPnl, 0)
  const totalFees = preview.reduce((sum, day) => sum + (day.totalFees || 0), 0)
  const totalCommissions = preview.reduce((sum, day) => sum + (day.totalCommissions || 0), 0)
  const totalTrades = preview.reduce((sum, day) => sum + day.tradeCount, 0)
  const totalNewTrades = preview.reduce((sum, day) => sum + (day.newTradesCount || 0), 0)
  const duplicateCount = preview.filter((day) => day.isDuplicate).length
  const hasNewTrades = totalNewTrades > 0

  // Filtrer les comptes selon la recherche
  const filteredAccountsForSelect = React.useMemo(() => {
    if (!accountSearch.trim()) {
      return accounts
    }
    const searchLower = accountSearch.toLowerCase()
    return accounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(searchLower) ||
        acc.propfirm.toLowerCase().includes(searchLower)
    )
  }, [accounts, accountSearch])

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Import de trades</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base">
          Importez vos trades depuis Project X ou Tradovate pour créer automatiquement les entrées
          PnL journalières
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulaire d'import */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Configuration de l&apos;import</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Sélectionnez la plateforme et le compte, puis choisissez votre fichier CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sélection de la plateforme */}
            <div className="space-y-2">
              <Label htmlFor="platform" className="text-sm">
                Plateforme de trading
              </Label>
              <Select
                value={selectedPlatform}
                onValueChange={(value) => {
                  setSelectedPlatform(value as TradingPlatform)
                  setPreview([])
                  setFileName("")
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                  }
                }}
              >
                <SelectTrigger id="platform" className="min-h-[44px]">
                  <SelectValue placeholder="Sélectionner une plateforme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROJECT_X">Project X</SelectItem>
                  <SelectItem value="TRADOVATE">Tradovate</SelectItem>
                </SelectContent>
              </Select>
              {selectedPlatform === "PROJECT_X" && (
                <Alert className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertTitle className="text-xs sm:text-sm">Propfirms compatibles</AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    Project X est compatible avec :{" "}
                    {PROJECT_X_COMPATIBLE_LIST.slice(0, 5).join(", ")}
                    {PROJECT_X_COMPATIBLE_LIST.length > 5 &&
                      " et " + (PROJECT_X_COMPATIBLE_LIST.length - 5) + " autres"}
                    . Seuls les comptes compatibles sont affichés ci-dessous.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Sélection du compte */}
            <div className="space-y-2">
              <Label htmlFor="account" className="text-sm">
                Compte
              </Label>
              <Select
                value={selectedAccountId}
                onValueChange={(value) => {
                  setSelectedAccountId(value)
                  setAccountSearch("") // Réinitialiser la recherche après sélection
                }}
                disabled={isLoadingAccounts}
              >
                <SelectTrigger id="account" className="min-h-[44px]">
                  <SelectValue placeholder="Sélectionner un compte" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {/* Champ de recherche pour filtrer les comptes */}
                  {accounts.length > 5 && (
                    <div
                      className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-2"
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                        <Input
                          placeholder="Rechercher un compte..."
                          value={accountSearch}
                          onChange={(e) => {
                            e.stopPropagation()
                            setAccountSearch(e.target.value)
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            // Permettre Escape pour fermer le select
                            if (e.key === "Escape") {
                              e.preventDefault()
                            }
                          }}
                          onFocus={(e) => e.stopPropagation()}
                          className="pl-8 h-9 text-sm"
                          autoFocus={false}
                        />
                      </div>
                    </div>
                  )}
                  {accounts.length === 0 ? (
                    <SelectItem value="no-account" disabled>
                      {selectedPlatform === "PROJECT_X"
                        ? "Aucun compte compatible avec Project X"
                        : "Aucun compte disponible"}
                    </SelectItem>
                  ) : filteredAccountsForSelect.length === 0 ? (
                    <SelectItem value="no-match" disabled>
                      Aucun compte trouvé
                    </SelectItem>
                  ) : (
                    filteredAccountsForSelect.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.propfirm})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedPlatform === "PROJECT_X" && accounts.length === 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Vous n&apos;avez aucun compte compatible avec Project X. Les propfirms compatibles
                  sont : TopStep, Bulenox, et d&apos;autres (voir la liste complète ci-dessus).
                </p>
              )}
              {accounts.length > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {filteredAccountsForSelect.length} compte(s) disponible(s)
                  {accounts.length !== filteredAccountsForSelect.length &&
                    ` sur ${accounts.length}`}
                </p>
              )}
            </div>

            {/* Upload de fichier */}
            <div className="space-y-2">
              <Label htmlFor="file" className="text-sm">
                Fichier CSV
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  disabled={!selectedPlatform || isUploading}
                  className="min-h-[44px]"
                />
              </div>
              {fileName && (
                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <FileText className="h-4 w-4" />
                  <span className="truncate">{fileName}</span>
                </div>
              )}
            </div>

            {/* Bouton d'import */}
            {!hasNewTrades && preview.length > 0 ? (
              <div className="space-y-2">
                <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/30">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertTitle className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                    Aucun nouveau trade à importer
                  </AlertTitle>
                  <AlertDescription className="text-xs text-orange-800 dark:text-orange-200 mt-1">
                    Tous les trades de ce fichier sont déjà en base de données. L&apos;import sera
                    annulé.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={() => {
                    setSelectedPlatform("")
                    setSelectedAccountId("")
                    setPreview([])
                    setFileName("")
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                  variant="outline"
                  className="w-full min-h-[44px]"
                >
                  Annuler l&apos;import
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleImport}
                disabled={
                  !selectedPlatform ||
                  !selectedAccountId ||
                  preview.length === 0 ||
                  isUploading ||
                  !hasNewTrades
                }
                className="w-full min-h-[44px]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer les trades
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Aperçu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Aperçu de l&apos;import</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Vérifiez les données avant d&apos;importer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preview.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Aucun fichier sélectionné</p>
                <p className="text-xs mt-2">Sélectionnez un fichier CSV pour voir l&apos;aperçu</p>
                <div className="mt-4 text-left text-xs space-y-2 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Format attendu pour Project X:
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Le fichier CSV doit contenir l&apos;en-tête et au moins une ligne de données
                    avec les colonnes: Id, ContractName, EnteredAt, ExitedAt, EntryPrice, ExitPrice,
                    Fees, PnL, Size, Type, TradeDay, TradeDuration, Commissions
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Résumé */}
                <Alert
                  className={
                    duplicateCount > 0 ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" : ""
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Résumé</AlertTitle>
                  <AlertDescription className="mt-2">
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>{preview.length}</strong> jour(s) de trading
                      </p>
                      <p>
                        <strong>{totalTrades}</strong> trade(s) au total
                      </p>
                      <p>
                        PnL total à ajouter: <strong>{formatCurrency(totalPnlToAdd)}</strong>
                        {totalPnl !== totalPnlToAdd && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
                            (sur {formatCurrency(totalPnl)} total)
                          </span>
                        )}
                      </p>
                      {duplicateCount > 0 && (
                        <div className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-2 space-y-1">
                          <p>⚠️ {duplicateCount} jour(s) avec doublon détecté</p>
                          <p className="text-xs font-normal">
                            Les trades en doublon seront ignorés, seulement les nouveaux trades
                            seront ajoutés
                          </p>
                        </div>
                      )}
                      {totalFees > 0 && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Fees soustraits: {formatCurrency(totalFees)}
                        </p>
                      )}
                      {totalCommissions > 0 && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Commissions soustraites: {formatCurrency(totalCommissions)}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Liste des jours */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {preview.map((day) => (
                    <div
                      key={day.date}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        day.isDuplicate
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                          : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{day.date}</p>
                          {day.isDuplicate && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-500 text-white">
                              DOUBLON
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {day.tradeCount} trade(s) au total
                          {day.duplicateTradesCount > 0 && (
                            <span className="ml-1 text-orange-600 dark:text-orange-400">
                              ({day.duplicateTradesCount} en doublon, {day.newTradesCount} nouveau
                              {day.newTradesCount > 1 ? "x" : ""})
                            </span>
                          )}
                        </p>
                        {day.isDuplicate && (
                          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 space-y-1">
                            {day.existingAmount !== undefined && (
                              <p className="font-medium">
                                PnL existant: {formatCurrency(day.existingAmount)}
                                {day.pnlToAdd !== 0 && (
                                  <span>
                                    {" "}
                                    → +{formatCurrency(day.pnlToAdd)} ={" "}
                                    {formatCurrency((day.existingAmount || 0) + day.pnlToAdd)}
                                  </span>
                                )}
                              </p>
                            )}
                            {day.duplicateTradesCount > 0 && (
                              <p className="font-medium">
                                {day.duplicateTradesCount} trade(s) en doublon seront ignorés,{" "}
                                {day.newTradesCount} nouveau{day.newTradesCount > 1 ? "x" : ""}{" "}
                                seront ajoutés
                              </p>
                            )}
                          </div>
                        )}
                        {!day.isDuplicate && day.newTradesCount > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {day.newTradesCount} nouveau{day.newTradesCount > 1 ? "x" : ""} trade
                            {day.newTradesCount > 1 ? "s" : ""} à ajouter
                          </p>
                        )}
                        {(day.totalFees || day.totalCommissions) && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            {day.totalFees && `Fees: ${formatCurrency(day.totalFees)}`}
                            {day.totalFees && day.totalCommissions && " • "}
                            {day.totalCommissions &&
                              `Commissions: ${formatCurrency(day.totalCommissions)}`}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {day.isDuplicate && day.pnlToAdd !== 0 ? (
                          <>
                            <p
                              className={`font-semibold text-sm ${
                                day.pnlToAdd >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              +{formatCurrency(day.pnlToAdd)}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              PnL à ajouter
                            </p>
                          </>
                        ) : (
                          <>
                            <p
                              className={`font-semibold text-sm ${
                                day.totalPnl >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {formatCurrency(day.totalPnl)}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">PnL net</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
