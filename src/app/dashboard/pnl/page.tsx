"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { PnlFormDialog } from "@/components/pnl-form-dialog"
import { BulkPnlFormDialog } from "@/components/bulk-pnl-form-dialog"
import { MonthlyCalendar } from "@/components/monthly-calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  ShieldCheck,
  Calendar,
  Wallet,
  X,
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

const PROPFIRM_LABELS: Record<string, string> = {
  TOPSTEP: "TopStep",
  TAKEPROFITTRADER: "Take Profit Trader",
  APEX: "Apex",
  BULENOX: "Bulenox",
  OTHER: "Autre",
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  EVAL: "Évaluation",
  FUNDED: "Financé",
}

const formatCurrencyCompact = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M $US`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}k $US`
  }
  return `${amount.toFixed(0)} $US`
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

  // Nouveaux filtres
  const [dateFilter, setDateFilter] = useState<string>("all") // "all", "7days", "30days", "thisMonth", "custom"
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [propfirmFilter, setPropfirmFilter] = useState<string>("all")
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all") // "all", "eval", "funded"
  const [amountFilter, setAmountFilter] = useState<string>("all") // "all", "positive", "negative"
  const [accountFilter, setAccountFilter] = useState<string>("all")

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

  // Filtrer les entrées avec tous les filtres
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const account = accounts.find((acc) => acc.id === entry.accountId)

      // Uniquement les comptes ACTIVE
      if (account?.status !== "ACTIVE") return false

      // Filtre par type de compte (évaluation/financé)
      if (hideEvalAccounts && account?.accountType === "EVAL") return false
      if (accountTypeFilter === "eval" && account?.accountType !== "EVAL") return false
      if (accountTypeFilter === "funded" && account?.accountType !== "FUNDED") return false

      // Filtre par propfirm
      if (propfirmFilter !== "all" && account?.propfirm !== propfirmFilter) return false

      // Filtre par compte spécifique
      if (accountFilter !== "all" && entry.accountId !== accountFilter) return false

      // Filtre par montant
      if (amountFilter === "positive" && entry.amount < 0) return false
      if (amountFilter === "negative" && entry.amount >= 0) return false

      // Filtre par date
      const entryDate = new Date(entry.date)
      const now = new Date()

      if (dateFilter === "7days") {
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        if (entryDate < sevenDaysAgo) return false
      } else if (dateFilter === "30days") {
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        if (entryDate < thirtyDaysAgo) return false
      } else if (dateFilter === "thisMonth") {
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        if (entryDate < firstDayOfMonth) return false
      } else if (dateFilter === "custom") {
        if (startDate && entryDate < new Date(startDate)) return false
        if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999) // Inclure toute la journée
          if (entryDate > end) return false
        }
      }

      return true
    })
  }, [
    entries,
    accounts,
    hideEvalAccounts,
    accountTypeFilter,
    propfirmFilter,
    accountFilter,
    amountFilter,
    dateFilter,
    startDate,
    endDate,
  ])

  // Calculer le total PNL uniquement sur les comptes ACTIVE
  const totalPnl = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0)

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

  const uniqueAccountsCount = new Set(filteredEntries.map((entry) => entry.accountId)).size

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
            description={`${uniqueAccountsCount} compte${uniqueAccountsCount > 1 ? "s" : ""}`}
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

          <div className="grid gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            {/* Filtre par date */}
            <div className="grid gap-2">
              <Label className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Période
              </Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="7days">7 derniers jours</SelectItem>
                  <SelectItem value="30days">30 derniers jours</SelectItem>
                  <SelectItem value="thisMonth">Ce mois</SelectItem>
                  <SelectItem value="custom">Période personnalisée</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor="start-date"
                      className="text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      Du
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-date" className="text-xs text-zinc-600 dark:text-zinc-400">
                      Au
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Filtre par propfirm */}
            <div className="grid gap-2">
              <Label className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Propfirm
              </Label>
              <Select value={propfirmFilter} onValueChange={setPropfirmFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les propfirms</SelectItem>
                  {Array.from(new Set(accounts.map((acc) => acc.propfirm))).map((propfirm) => (
                    <SelectItem key={propfirm} value={propfirm}>
                      {PROPFIRM_LABELS[propfirm] ?? propfirm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par type de compte */}
            <div className="grid gap-2">
              <Label className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Type de compte
              </Label>
              <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="eval">Évaluation uniquement</SelectItem>
                  <SelectItem value="funded">Financé uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par compte spécifique */}
            <div className="grid gap-2">
              <Label className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" />
                Compte
              </Label>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les comptes</SelectItem>
                  {eligibleAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par montant */}
            <div className="grid gap-2">
              <Label className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Montant
              </Label>
              <Select value={amountFilter} onValueChange={setAmountFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les montants</SelectItem>
                  <SelectItem value="positive">Gains uniquement</SelectItem>
                  <SelectItem value="negative">Pertes uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bouton réinitialiser les filtres */}
            {(dateFilter !== "all" ||
              propfirmFilter !== "all" ||
              accountTypeFilter !== "all" ||
              accountFilter !== "all" ||
              amountFilter !== "all" ||
              hideEvalAccounts ||
              startDate ||
              endDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateFilter("all")
                  setStartDate("")
                  setEndDate("")
                  setPropfirmFilter("all")
                  setAccountTypeFilter("all")
                  setAccountFilter("all")
                  setAmountFilter("all")
                  setHideEvalAccounts(false)
                }}
                className="h-9 text-xs sm:text-sm"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Réinitialiser les filtres
              </Button>
            )}
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
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredEntries.map((entry) => {
            const account = accounts.find((acc) => acc.id === entry.accountId)
            const isPositive = entry.amount >= 0
            const gradient = isPositive
              ? "from-emerald-500/10 via-emerald-500/5 to-transparent"
              : "from-rose-500/10 via-rose-500/5 to-transparent"

            return (
              <Card key={entry.id} className="border-none bg-transparent shadow-none">
                <CardContent className="p-0">
                  <div className="overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/80 shadow-sm w-full">
                    <div
                      className={`flex flex-col gap-2 sm:gap-3 border-b border-zinc-200/70 dark:border-zinc-800/60 bg-linear-to-r ${gradient} p-3 sm:p-4 hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                        <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2 overflow-hidden">
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 w-full">
                            <h3 className="text-sm sm:text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                              {account?.name || "Compte inconnu"}
                            </h3>
                            <span
                              className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold shrink-0 ${
                                isPositive
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300"
                              }`}
                            >
                              {isPositive ? "Gain" : "Perte"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 shrink-0">
                              {account?.accountType === "EVAL" ? (
                                <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                              ) : (
                                <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                              )}
                              <span className="truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
                                {account?.propfirm
                                  ? (PROPFIRM_LABELS[account.propfirm] ?? account.propfirm)
                                  : "—"}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 sm:h-10 sm:w-10 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                            onClick={() => handleEdit(entry)}
                            aria-label="Modifier"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 sm:h-10 sm:w-10 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                            onClick={() => handleDelete(entry.id)}
                            aria-label="Supprimer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50 min-w-0 w-full">
                        <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 min-w-0 flex-1">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span className="font-semibold truncate">
                            {format(new Date(entry.date), "d MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-bold text-xs sm:text-sm shrink-0 ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          )}
                          <span className="whitespace-nowrap">
                            {isPositive ? "+" : ""}
                            {formatCurrency(entry.amount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                      {entry.notes && (
                        <div className="rounded-lg border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/50 p-2 sm:p-3">
                          <p className="text-[10px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 sm:mb-1.5 uppercase tracking-wide">
                            Notes
                          </p>
                          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap line-clamp-2 wrap-break-word">
                            {entry.notes}
                          </p>
                        </div>
                      )}
                      {account && (
                        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                          <div className="rounded-lg border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/50 p-2 sm:p-3">
                            <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                              {account.accountType === "EVAL" ? (
                                <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500 shrink-0" />
                              ) : (
                                <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500 shrink-0" />
                              )}
                              <p className="text-[10px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide truncate">
                                Type
                              </p>
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50 wrap-break-word">
                              {ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}
                            </p>
                          </div>
                          <div className="rounded-lg border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/50 p-2 sm:p-3">
                            <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                              <Wallet className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 shrink-0" />
                              <p className="text-[10px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide truncate">
                                Capital
                              </p>
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50 text-right wrap-break-word">
                              {formatCurrencyCompact(account.size)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
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
