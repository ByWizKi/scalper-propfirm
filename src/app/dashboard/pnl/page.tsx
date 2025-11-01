"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PnlFormDialog } from "@/components/pnl-form-dialog"
import { BulkPnlFormDialog } from "@/components/bulk-pnl-form-dialog"
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, Table } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface PnlEntry {
  id: string
  accountId: string
  date: string
  amount: number
  notes?: string
  account: {
    name: string
  }
}

interface PropfirmAccount {
  id: string
  name: string
  propfirm: string
  accountType: string
  size: number
}

export default function PnlPage() {
  const [entries, setEntries] = useState<PnlEntry[]>([])
  const [accounts, setAccounts] = useState<PropfirmAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<PnlEntry | null>(null)
  const [hideEvalAccounts, setHideEvalAccounts] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [entriesRes, accountsRes] = await Promise.all([
        fetch("/api/pnl", { cache: "no-store" }),
        fetch("/api/accounts", { cache: "no-store" }),
      ])

      if (entriesRes.ok && accountsRes.ok) {
        const entriesData = await entriesRes.json()
        const accountsData = await accountsRes.json()
        setEntries(entriesData)
        setAccounts(accountsData)
      }
    } catch (_error) {
      console.error("Erreur lors du chargement des données:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) {
      return
    }

    try {
      const response = await fetch(`/api/pnl/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Entrée supprimée",
          description: "L'entrée PnL a été supprimée avec succès",
        })
        fetchData()
      } else {
        throw new Error("Erreur lors de la suppression")
      }
    } catch (_error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entrée",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (entry: PnlEntry) => {
    setSelectedEntry(entry)
    setDialogOpen(true)
  }

  const handleAdd = () => {
    setSelectedEntry(null)
    setDialogOpen(true)
  }

  const handleBulkAdd = () => {
    setBulkDialogOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Filtrer les entrées selon l'option "Masquer comptes d'évaluation"
  const filteredEntries = hideEvalAccounts
    ? entries.filter((entry) => {
        const account = accounts.find((acc) => acc.id === entry.accountId)
        return account?.accountType !== "EVAL"
      })
    : entries

  const totalPnl = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0)

  // Regrouper les entrées par compte
  const entriesByAccount = filteredEntries.reduce(
    (acc, entry) => {
      const accountId = entry.accountId
      if (!acc[accountId]) {
        acc[accountId] = {
          accountName: entry.account.name,
          entries: [],
          total: 0,
        }
      }
      acc[accountId].entries.push(entry)
      acc[accountId].total += entry.amount
      return acc
    },
    {} as Record<string, { accountName: string; entries: PnlEntry[]; total: number }>
  )

  // Trier les entrées dans chaque compte par date (plus récent en premier)
  Object.values(entriesByAccount).forEach((account) => {
    account.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Chargement des PnL...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">PnL</h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1 sm:mt-2">
            Suivez vos profits et pertes
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleAdd} disabled={accounts.length === 0} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span>Ajouter un PnL</span>
          </Button>
          <Button
            onClick={handleBulkAdd}
            disabled={accounts.length === 0}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Table className="h-4 w-4 mr-2" />
            <span>Ajout groupé</span>
          </Button>
        </div>
      </div>

      {/* Filtre pour masquer les comptes d'évaluation */}
      {accounts.length > 0 && (
        <div className="flex items-center gap-2 mb-4 sm:mb-6 px-1">
          <input
            type="checkbox"
            id="hide-eval"
            checked={hideEvalAccounts}
            onChange={(e) => setHideEvalAccounts(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 cursor-pointer"
          />
          <label
            htmlFor="hide-eval"
            className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
          >
            Masquer les PnL des comptes d&apos;évaluation
          </label>
        </div>
      )}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Vous devez d&apos;abord créer un compte avant d&apos;ajouter des entrées PnL
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4 sm:mb-6">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                    PnL Total
                  </p>
                  <p
                    className={`text-2xl sm:text-3xl font-bold truncate ${totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(totalPnl)}
                  </p>
                </div>
                {totalPnl >= 0 ? (
                  <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 text-green-600 flex-shrink-0" />
                ) : (
                  <TrendingDown className="h-8 w-8 sm:h-12 sm:w-12 text-red-600 flex-shrink-0" />
                )}
              </div>
            </CardContent>
          </Card>

          {entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune entrée PnL</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Commencez par ajouter votre première entrée
                </p>
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un PnL
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {Object.entries(entriesByAccount).map(([accountId, accountData]) => (
                <Card key={accountId}>
                  <CardContent className="p-0">
                    {/* En-tête du compte */}
                    <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base sm:text-lg truncate">
                          {accountData.accountName}
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-500">
                          {accountData.entries.length} entrée
                          {accountData.entries.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right min-w-0">
                        <p className="text-[10px] sm:text-xs text-zinc-500 mb-1">Total</p>
                        <p
                          className={`text-base sm:text-xl font-bold truncate ${accountData.total >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {accountData.total >= 0 ? "+" : ""}
                          {formatCurrency(accountData.total)}
                        </p>
                      </div>
                    </div>

                    {/* Entrées PnL du compte */}
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {accountData.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <div
                              className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${entry.amount >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}
                            >
                              {entry.amount >= 0 ? (
                                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm text-zinc-500 truncate">
                                {format(new Date(entry.date), "d MMMM yyyy", { locale: fr })}
                              </p>
                              {entry.notes && (
                                <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 line-clamp-1">
                                  {entry.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                            <span
                              className={`text-base sm:text-lg font-bold truncate ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {entry.amount >= 0 ? "+" : ""}
                              {formatCurrency(entry.amount)}
                            </span>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(entry)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDelete(entry.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <PnlFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={selectedEntry}
        accounts={accounts}
        onSuccess={fetchData}
      />

      <BulkPnlFormDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        accounts={accounts}
        onSuccess={fetchData}
      />
    </div>
  )
}
