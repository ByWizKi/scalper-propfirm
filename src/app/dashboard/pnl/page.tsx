"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { PnlFormDialog } from "@/components/pnl-form-dialog"
import { BulkPnlFormDialog } from "@/components/bulk-pnl-form-dialog"
import { MonthlyCalendar } from "@/components/monthly-calendar"
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Table,
  ChevronDown,
  Activity,
  BarChart2,
  Target,
  Filter,
} from "lucide-react"
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
  status?: string
}

export default function PnlPage() {
  const [entries, setEntries] = useState<PnlEntry[]>([])
  const [accounts, setAccounts] = useState<PropfirmAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<PnlEntry | null>(null)
  const [hideEvalAccounts, setHideEvalAccounts] = useState(false)
  const [calendarCollapsed, setCalendarCollapsed] = useState(false)
  const [collapsedAccounts, setCollapsedAccounts] = useState<string[]>([])

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
      console.error("Error:", _error)
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

  // Filtrer uniquement les comptes ACTIVE avant de les passer aux dialogs
  const eligibleAccounts = accounts.filter((account) => account.status === "ACTIVE")

  const toggleAccountCollapse = (accountId: string) => {
    setCollapsedAccounts((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    )
  }

  const calendarEntries = entries.reduce<PnlEntry[]>((acc, entry) => {
    const account = accounts.find((accAccount) => accAccount.id === entry.accountId)
    if (!account) return acc

    const isFundedBufferEntry =
      account.accountType === "FUNDED" && entry.notes?.toLowerCase().includes("buffer")
    if (isFundedBufferEntry) {
      return acc
    }

    if (account.status !== "ACTIVE") {
      return acc
    }

    if (hideEvalAccounts && account.accountType === "EVAL") {
      return acc
    }

    const enrichedNotes = entry.notes
      ? `[${entry.account.name}] ${entry.notes}`
      : `[${entry.account.name}]`

    acc.push({
      ...entry,
      notes: enrichedNotes,
    })

    return acc
  }, [])

  // Filtrer les entrées selon l'option "Masquer comptes d'évaluation" et uniquement les comptes ACTIVE
  const filteredEntries = entries.filter((entry) => {
    const account = accounts.find((acc) => acc.id === entry.accountId)
    // Uniquement les comptes ACTIVE
    if (account?.status !== "ACTIVE") return false
    // Optionnel : masquer les comptes d'évaluation si l'option est activée
    if (hideEvalAccounts && account?.accountType === "EVAL") return false
    return true
  })

  // Calculer le total PNL uniquement sur les comptes ACTIVE
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

  const positiveEntriesCount = filteredEntries.filter((entry) => entry.amount >= 0).length
  const successRate =
    filteredEntries.length > 0
      ? Math.round((positiveEntriesCount / filteredEntries.length) * 100)
      : 0

  const dailyAggregates = filteredEntries.reduce(
    (acc, entry) => {
      const key = format(new Date(entry.date), "yyyy-MM-dd")
      acc[key] = (acc[key] || 0) + entry.amount
      return acc
    },
    {} as Record<string, number>
  )

  const bestDayKey = Object.keys(dailyAggregates).reduce((best, key) => {
    if (!best) return key
    return dailyAggregates[key] > dailyAggregates[best] ? key : best
  }, "")

  const bestDayAmount = bestDayKey ? dailyAggregates[bestDayKey] : 0
  const bestDayLabel = bestDayKey ? format(new Date(bestDayKey), "d MMM", { locale: fr }) : "—"

  // Calculer le PnL mensuel (30 derniers jours) - uniquement comptes actifs financés hors buffer
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const monthlyPnl = entries
    .filter((entry) => {
      const account = accounts.find((acc) => acc.id === entry.accountId)
      if (!account) return false

      // Uniquement les comptes ACTIVE et FUNDED
      if (account.status !== "ACTIVE" || account.accountType !== "FUNDED") {
        return false
      }

      // Exclure les entrées buffer pour les comptes financés
      const isFundedBufferEntry =
        account.accountType === "FUNDED" && entry.notes?.toLowerCase().includes("buffer")
      if (isFundedBufferEntry) {
        return false
      }

      // Uniquement les 30 derniers jours
      return new Date(entry.date) >= thirtyDaysAgo
    })
    .reduce((sum, entry) => sum + entry.amount, 0)

  const accountsWithEntries = Object.keys(entriesByAccount).length

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
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              Mes performances
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Button
              onClick={handleAdd}
              disabled={eligibleAccounts.length === 0}
              size="lg"
              className="w-full sm:w-auto flex items-center gap-2 text-sm sm:text-base font-semibold h-11 sm:h-12"
            >
              <Plus className="h-5 w-5" />
              <span>Nouveau PnL</span>
            </Button>
            <Button
              onClick={handleBulkAdd}
              disabled={eligibleAccounts.length === 0}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto flex items-center gap-2 text-sm sm:text-base font-semibold h-11 sm:h-12"
            >
              <Table className="h-5 w-5" />
              <span>Ajout multiple</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="PnL total"
            value={formatCurrency(totalPnl)}
            icon={Activity}
            variant={totalPnl >= 0 ? "success" : "danger"}
            description={`${accountsWithEntries} compte${accountsWithEntries > 1 ? "s" : ""}`}
          />
          <StatCard
            title="PnL mensuel"
            value={formatCurrency(monthlyPnl)}
            icon={BarChart2}
            variant={monthlyPnl >= 0 ? "success" : "danger"}
            description="30 derniers jours"
          />
          <StatCard
            title="Réussite"
            value={`${successRate}%`}
            icon={TrendingUp}
            variant={successRate >= 50 ? "success" : "danger"}
            description={`${positiveEntriesCount} gain${positiveEntriesCount > 1 ? "s" : ""}`}
          />
          <StatCard
            title="Meilleur jour"
            value={bestDayKey ? formatCurrency(bestDayAmount) : "—"}
            icon={Target}
            variant={bestDayAmount >= 0 ? "success" : "danger"}
            description={bestDayKey ? bestDayLabel : "Aucune donnée"}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Filtres</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Activity className="h-4 w-4" />
              <span className="font-semibold">{filteredEntries.length}</span>
              <span>entrée{filteredEntries.length > 1 ? "s" : ""}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <label
              htmlFor="hide-eval-toggle"
              className="flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
            >
              <span>Inclure évaluations</span>
              <span className="relative inline-flex h-6 w-11 items-center">
                <input
                  id="hide-eval-toggle"
                  type="checkbox"
                  checked={!hideEvalAccounts}
                  onChange={(e) => setHideEvalAccounts(!e.target.checked)}
                  className="sr-only peer"
                />
                <span className="absolute inset-0 rounded-full bg-zinc-300 transition-colors peer-checked:bg-blue-600 dark:bg-zinc-700 dark:peer-checked:bg-blue-500" />
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Calendrier</h2>
          </div>
          <Button
            variant="ghost"
            size="lg"
            className="h-10 w-10 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => setCalendarCollapsed((prev) => !prev)}
            aria-label={calendarCollapsed ? "Ouvrir" : "Fermer"}
            title={calendarCollapsed ? "Ouvrir" : "Fermer"}
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform ${calendarCollapsed ? "-rotate-90" : "rotate-0"}`}
            />
          </Button>
        </div>
        {!calendarCollapsed && (
          <div className="p-4 sm:p-6">
            <MonthlyCalendar pnlEntries={calendarEntries} />
          </div>
        )}
      </section>

      {eligibleAccounts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 p-10 text-center">
          <Activity className="mx-auto h-16 w-16 text-zinc-400 mb-4" />
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Aucun compte</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Créez un compte pour commencer</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/70 p-10 text-center space-y-4">
          <TrendingUp className="mx-auto h-16 w-16 text-zinc-400" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Aucune donnée</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Enregistrez votre premier PnL
            </p>
          </div>
          <Button onClick={handleAdd} size="lg" className="mt-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nouveau PnL
          </Button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {Object.entries(entriesByAccount).map(([accountId, accountData]) => {
            const isCollapsed = collapsedAccounts.includes(accountId)
            const isPositive = accountData.total >= 0
            const latestEntry = accountData.entries[0]
            const accountPositiveTotal = accountData.entries.reduce(
              (sum, entry) => (entry.amount > 0 ? sum + entry.amount : sum),
              0
            )
            const accountNegativeTotal = accountData.entries.reduce(
              (sum, entry) => (entry.amount < 0 ? sum + entry.amount : sum),
              0
            )
            const accountSuccess =
              accountData.entries.length > 0
                ? Math.round(
                    (accountData.entries.filter((entry) => entry.amount >= 0).length /
                      accountData.entries.length) *
                      100
                  )
                : 0

            const lastEntryLabel = latestEntry
              ? format(new Date(latestEntry.date), "d MMM yyyy", { locale: fr })
              : "—"

            return (
              <Card key={accountId} className="border-none bg-transparent shadow-none">
                <CardContent className="p-0">
                  <div className="overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/80 shadow-sm">
                    <div
                      className={`flex flex-col gap-4 border-b border-zinc-200/70 dark:border-zinc-800/60 bg-linear-to-r ${
                        isPositive
                          ? "from-emerald-500/10 via-emerald-500/5 to-transparent"
                          : "from-rose-500/10 via-rose-500/5 to-transparent"
                      } p-4 sm:p-6`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2 min-w-0 flex-1">
                          <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 truncate">
                            {accountData.accountName}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                            <span className="flex items-center gap-1">
                              <Activity className="h-4 w-4" />
                              {accountData.entries.length} entrée
                              {accountData.entries.length > 1 ? "s" : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {lastEntryLabel}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                              Total
                            </p>
                            <p
                              className={`text-xl sm:text-2xl font-bold ${
                                isPositive
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {formatCurrency(accountData.total)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="lg"
                            onClick={() => toggleAccountCollapse(accountId)}
                            className="h-10 w-10 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                            aria-expanded={!isCollapsed}
                            aria-label={isCollapsed ? "Ouvrir" : "Fermer"}
                            title={isCollapsed ? "Ouvrir" : "Fermer"}
                          >
                            <ChevronDown
                              className={`h-5 w-5 transition-transform duration-200 ${
                                isCollapsed ? "-rotate-90" : "rotate-0"
                              }`}
                            />
                          </Button>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="grid gap-3 sm:grid-cols-3 pt-2">
                          <div className="rounded-xl border-2 border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/70 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                Gains
                              </p>
                            </div>
                            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                              {accountPositiveTotal > 0 ? "+" : ""}
                              {formatCurrency(accountPositiveTotal)}
                            </p>
                          </div>
                          <div className="rounded-xl border-2 border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/70 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingDown className="h-4 w-4 text-rose-500" />
                              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                Pertes
                              </p>
                            </div>
                            <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                              {formatCurrency(accountNegativeTotal)}
                            </p>
                          </div>
                          <div className="rounded-xl border-2 border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/70 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                Réussite
                              </p>
                            </div>
                            <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                              {accountSuccess}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="p-3 sm:p-5 space-y-3">
                        {accountData.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/70 bg-zinc-50/70 dark:bg-zinc-900/60 p-3 sm:p-4 transition hover:border-zinc-300 dark:hover:border-zinc-700"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div
                                className={`rounded-xl p-2 sm:p-2.5 ${
                                  entry.amount >= 0
                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
                                    : "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300"
                                }`}
                              >
                                {entry.amount >= 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                              </div>
                              <div className="space-y-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                                  {format(new Date(entry.date), "d MMMM yyyy", { locale: fr })}
                                </p>
                                {entry.notes && (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                                    {entry.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                              <span
                                className={`text-lg sm:text-xl font-bold ${
                                  entry.amount >= 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {entry.amount >= 0 ? "+" : ""}
                                {formatCurrency(entry.amount)}
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  className="h-10 w-10 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                                  onClick={() => handleEdit(entry)}
                                  aria-label="Modifier"
                                  title="Modifier"
                                >
                                  <Edit className="h-5 w-5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  className="h-10 w-10 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
                                  onClick={() => handleDelete(entry.id)}
                                  aria-label="Supprimer"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <PnlFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={selectedEntry}
        accounts={eligibleAccounts}
        onSuccess={fetchData}
      />

      <BulkPnlFormDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        accounts={eligibleAccounts}
        onSuccess={fetchData}
      />
    </div>
  )
}
