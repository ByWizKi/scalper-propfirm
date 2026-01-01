"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { WithdrawalFormDialog } from "@/components/withdrawal-form-dialog"
import { BulkWithdrawalFormDialog } from "@/components/bulk-withdrawal-form-dialog"
import { WithdrawalFilterSection } from "@/components/withdrawal-filter-section"
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Table,
  Calendar,
  Wallet,
  Target,
  ShieldCheck,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { calculateWithdrawalTax, getNetWithdrawalAmount } from "@/lib/withdrawal-utils"

interface Withdrawal {
  id: string
  accountId: string
  date: string
  amount: number
  notes?: string
  account: {
    name: string
    propfirm: string
  }
}

interface PropfirmAccount {
  id: string
  name: string
  accountType: string
  propfirm: string
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

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [accounts, setAccounts] = useState<PropfirmAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)

  // Filtres
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [propfirmFilter, setPropfirmFilter] = useState<string>("all")
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all")
  const [accountFilter, setAccountFilter] = useState<string>("all")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [withdrawalsRes, accountsRes] = await Promise.all([
        fetch("/api/withdrawals", { cache: "no-store" }),
        fetch("/api/accounts", { cache: "no-store" }),
      ])

      if (withdrawalsRes.ok && accountsRes.ok) {
        const withdrawalsData = await withdrawalsRes.json()
        const accountsData = await accountsRes.json()
        setWithdrawals(withdrawalsData)
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
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce retrait ?")) {
      return
    }

    try {
      const response = await fetch(`/api/withdrawals/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Retrait supprimé",
          description: "Le retrait a été supprimé avec succès",
        })
        fetchData()
      } else {
        throw new Error("Erreur lors de la suppression")
      }
    } catch (_error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le retrait",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal)
    setDialogOpen(true)
  }

  const handleAdd = () => {
    setSelectedWithdrawal(null)
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

  const formatCurrencyEUR = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  // Taux de change USD vers EUR
  const USD_TO_EUR = 0.92

  // Filtrer les retraits
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((withdrawal) => {
      const account = accounts.find((acc) => acc.id === withdrawal.accountId)

      // Uniquement les comptes ACTIVE
      if (account?.status !== "ACTIVE") return false

      // Filtre par type de compte
      if (accountTypeFilter === "eval" && account?.accountType !== "EVAL") return false
      if (accountTypeFilter === "funded" && account?.accountType !== "FUNDED") return false

      // Filtre par propfirm
      if (propfirmFilter !== "all" && account?.propfirm !== propfirmFilter) return false

      // Filtre par compte spécifique
      if (accountFilter !== "all" && withdrawal.accountId !== accountFilter) return false

      // Filtre par date
      const withdrawalDate = new Date(withdrawal.date)
      const now = new Date()

      if (dateFilter === "7days") {
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        if (withdrawalDate < sevenDaysAgo) return false
      } else if (dateFilter === "30days") {
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        if (withdrawalDate < thirtyDaysAgo) return false
      } else if (dateFilter === "thisMonth") {
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        if (withdrawalDate < firstDayOfMonth) return false
      } else if (dateFilter === "custom") {
        if (startDate && withdrawalDate < new Date(startDate)) return false
        if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          if (withdrawalDate > end) return false
        }
      }

      return true
    })
  }, [
    withdrawals,
    accounts,
    dateFilter,
    startDate,
    endDate,
    propfirmFilter,
    accountTypeFilter,
    accountFilter,
  ])

  // Calculer les statistiques
  const totalWithdrawals = filteredWithdrawals.reduce((sum, w) => sum + w.amount, 0)
  const totalNetWithdrawals = filteredWithdrawals.reduce((sum, w) => {
    return sum + getNetWithdrawalAmount(w.amount, w.account.propfirm)
  }, 0)

  const uniqueAccountsCount = new Set(filteredWithdrawals.map((w) => w.accountId)).size

  // Calculer le retrait mensuel (30 derniers jours)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const monthlyWithdrawals = filteredWithdrawals
    .filter((w) => new Date(w.date) >= thirtyDaysAgo)
    .reduce((sum, w) => sum + w.amount, 0)
  const monthlyNetWithdrawals = filteredWithdrawals
    .filter((w) => new Date(w.date) >= thirtyDaysAgo)
    .reduce((sum, w) => sum + getNetWithdrawalAmount(w.amount, w.account.propfirm), 0)

  // Obtenir les comptes éligibles (FUNDED et ACTIVE uniquement)
  const eligibleAccounts = accounts.filter(
    (account) => account.accountType === "FUNDED" && account.status === "ACTIVE"
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-slate-50 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Chargement des retraits...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50">
              Mes retraits
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
              <span>Nouveau retrait</span>
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
            title="Total retraits"
            value={formatCurrency(totalWithdrawals)}
            icon={DollarSign}
            variant="success"
            description={`${uniqueAccountsCount} compte${uniqueAccountsCount > 1 ? "s" : ""}`}
            secondaryText={formatCurrencyEUR(totalWithdrawals * USD_TO_EUR)}
          />
          <StatCard
            title="Total net reçu"
            value={formatCurrency(totalNetWithdrawals)}
            icon={Wallet}
            variant="success"
            description="Après taxes"
            secondaryText={formatCurrencyEUR(totalNetWithdrawals * USD_TO_EUR)}
          />
          <StatCard
            title="Retraits mensuels"
            value={formatCurrency(monthlyWithdrawals)}
            icon={TrendingUp}
            variant="success"
            description="30 derniers jours"
            secondaryText={`Net: ${formatCurrency(monthlyNetWithdrawals)}`}
          />
          <StatCard
            title="Nombre de retraits"
            value={filteredWithdrawals.length}
            icon={Target}
            variant="neutral"
            description={`${uniqueAccountsCount} compte${uniqueAccountsCount > 1 ? "s" : ""}`}
          />
        </div>
      </section>

      <WithdrawalFilterSection
        dateFilter={dateFilter}
        startDate={startDate}
        endDate={endDate}
        propfirmFilter={propfirmFilter}
        accountTypeFilter={accountTypeFilter}
        accountFilter={accountFilter}
        availablePropfirms={Array.from(new Set(accounts.map((acc) => acc.propfirm)))}
        eligibleAccounts={eligibleAccounts}
        propfirmLabels={PROPFIRM_LABELS}
        filteredCount={filteredWithdrawals.length}
        onDateFilterChange={setDateFilter}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onPropfirmFilterChange={setPropfirmFilter}
        onAccountTypeFilterChange={setAccountTypeFilter}
        onAccountFilterChange={setAccountFilter}
        onReset={() => {
          setDateFilter("all")
          setStartDate("")
          setEndDate("")
          setPropfirmFilter("all")
          setAccountTypeFilter("all")
          setAccountFilter("all")
        }}
      />

      {eligibleAccounts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-[#1e293b] bg-white/60 dark:bg-[#151b2e]/60 p-10 text-center space-y-4">
          <Wallet className="mx-auto h-16 w-16 text-slate-400" />
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              Aucun compte
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Créez un compte financé et actif pour commencer
            </p>
          </div>
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-[#1e293b] bg-white/80 dark:bg-[#151b2e]/70 p-10 text-center space-y-4">
          <DollarSign className="mx-auto h-16 w-16 text-slate-400" />
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              Aucune donnée
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Enregistrez votre premier retrait
            </p>
          </div>
          <Button onClick={handleAdd} size="lg" className="mt-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nouveau retrait
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {(() => {
            // Regrouper les retraits par compte
            const withdrawalsByAccount = filteredWithdrawals.reduce(
              (acc, withdrawal) => {
                const accountId = withdrawal.accountId
                if (!acc[accountId]) {
                  acc[accountId] = []
                }
                acc[accountId].push(withdrawal)
                return acc
              },
              {} as Record<string, Withdrawal[]>
            )

            // Trier les retraits par date (plus récent en premier) pour chaque compte
            Object.keys(withdrawalsByAccount).forEach((accountId) => {
              withdrawalsByAccount[accountId].sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime()
              })
            })

            return Object.entries(withdrawalsByAccount).map(([accountId, accountWithdrawals]) => {
              const account = accounts.find((acc) => acc.id === accountId)
              if (!account) return null

              const accountTotalGross = accountWithdrawals.reduce((sum, w) => sum + w.amount, 0)
              const accountTotalNet = accountWithdrawals.reduce(
                (sum, w) => sum + getNetWithdrawalAmount(w.amount, w.account.propfirm),
                0
              )

              return (
                <WithdrawalAccountCard
                  key={accountId}
                  account={account}
                  accountWithdrawals={accountWithdrawals}
                  accountTotalGross={accountTotalGross}
                  accountTotalNet={accountTotalNet}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )
            })
          })()}
        </div>
      )}

      <WithdrawalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        withdrawal={selectedWithdrawal}
        accounts={eligibleAccounts}
        onSuccess={fetchData}
      />

      <BulkWithdrawalFormDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        accounts={eligibleAccounts}
        onSuccess={fetchData}
      />
    </div>
  )
}

// Composant pour la carte de retrait par compte
function WithdrawalAccountCard({
  account,
  accountWithdrawals,
  accountTotalGross,
  accountTotalNet,
  onEdit,
  onDelete,
}: {
  account: PropfirmAccount
  accountWithdrawals: Withdrawal[]
  accountTotalGross: number
  accountTotalNet: number
  onEdit: (withdrawal: Withdrawal) => void
  onDelete: (id: string) => void
}) {
  const [isWithdrawalsExpanded, setIsWithdrawalsExpanded] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatCurrencyEUR = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const USD_TO_EUR = 0.92

  return (
    <Card className="border-none bg-transparent shadow-none group overflow-hidden rounded-2xl h-full flex flex-col">
      <CardContent className="p-0 h-full flex flex-col">
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e] shadow-sm hover:shadow-md transition-all duration-200 w-full h-full flex flex-col">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:gap-3 border-b border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#1e293b]/50 p-3 sm:p-4 rounded-t-2xl">
            <div className="flex items-start justify-between gap-2 min-w-0 w-full">
              <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2 overflow-hidden">
                <div className="flex items-start gap-1.5 sm:gap-2 min-w-0 w-full">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <h3
                      className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate min-w-0 flex-1"
                      title={account.name}
                    >
                      {account.name.length > 20
                        ? `${account.name.substring(0, 20)}...`
                        : account.name}
                    </h3>
                  </div>
                  <span className="inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold shrink-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                    Retrait
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-[#1e293b] px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 border border-slate-200 dark:border-[#334155]">
                    {account.accountType === "EVAL" ? (
                      <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    )}
                    <span className="truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
                      {account.propfirm
                        ? (PROPFIRM_LABELS[account.propfirm] ?? account.propfirm)
                        : "—"}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Total des retraits du compte */}
            <div className="flex items-center justify-between gap-2 sm:gap-3 pt-2 border-t border-slate-200 dark:border-[#1e293b] min-w-0 w-full">
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 min-w-0 flex-1">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="font-semibold truncate">
                  Total ({accountWithdrawals.length} retrait
                  {accountWithdrawals.length > 1 ? "s" : ""})
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-bold text-xs sm:text-sm shrink-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="whitespace-nowrap">{formatCurrency(accountTotalGross)}</span>
              </div>
            </div>
            {accountTotalNet !== accountTotalGross && (
              <div className="flex items-center justify-end gap-2 sm:gap-3 min-w-0 w-full">
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-bold text-xs sm:text-sm shrink-0 bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                  <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="whitespace-nowrap">Net: {formatCurrency(accountTotalNet)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Infos du compte */}
          <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 bg-white dark:bg-[#151b2e] rounded-b-2xl flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <div className="rounded-lg border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#1e293b]/50 p-2 sm:p-3 transition-colors hover:bg-slate-100 dark:hover:bg-[#1e293b]">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                  {account.accountType === "EVAL" ? (
                    <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500 shrink-0" />
                  ) : (
                    <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500 shrink-0" />
                  )}
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide truncate">
                    Type
                  </p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 wrap-break-word">
                  {ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#1e293b]/50 p-2 sm:p-3 transition-colors hover:bg-slate-100 dark:hover:bg-[#1e293b]">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                  <Wallet className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 shrink-0" />
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide truncate">
                    Capital
                  </p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 text-right wrap-break-word">
                  {formatCurrencyCompact(account.size)}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#1e293b]/50 p-2 sm:p-3">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-500 shrink-0" />
                <p className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide truncate">
                  Propfirm
                </p>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 wrap-break-word">
                {account.propfirm ? (PROPFIRM_LABELS[account.propfirm] ?? account.propfirm) : "—"}
              </p>
            </div>
          </div>

          {/* Liste des retraits */}
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2 sm:space-y-3 bg-white dark:bg-[#151b2e] flex-1 flex flex-col">
            <button
              onClick={() => setIsWithdrawalsExpanded(!isWithdrawalsExpanded)}
              className="w-full flex items-center justify-between gap-2 p-2 hover:bg-slate-50 dark:hover:bg-[#1e293b]/50 rounded-lg transition-colors cursor-pointer"
            >
              <h4 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                Retraits ({accountWithdrawals.length})
              </h4>
              {isWithdrawalsExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              )}
            </button>
            {isWithdrawalsExpanded && (
              <div className="space-y-2">
                {accountWithdrawals.map((withdrawal) => {
                  const taxInfo = calculateWithdrawalTax(withdrawal.amount, account.propfirm)

                  return (
                    <div
                      key={withdrawal.id}
                      className="rounded-lg border border-slate-200/70 dark:border-[#1e293b]/70 bg-slate-50/50 dark:bg-[#1e293b]/50 p-2 sm:p-3 hover:bg-slate-100/50 dark:hover:bg-[#1e293b]/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-500 shrink-0" />
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {format(new Date(withdrawal.date), "d MMM yyyy", {
                                locale: fr,
                              })}
                            </span>
                          </div>
                          {withdrawal.notes && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 wrap-break-word mt-1">
                              {withdrawal.notes}
                            </p>
                          )}
                          {taxInfo.hasTax && (
                            <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-1">
                              Taxe: {(taxInfo.taxRate * 100).toFixed(0)}%
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-xs sm:text-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                              <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                              <span className="whitespace-nowrap">
                                {formatCurrency(withdrawal.amount)}
                              </span>
                            </div>
                            {taxInfo.hasTax && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                                <span className="whitespace-nowrap">
                                  Net: {formatCurrency(taxInfo.netAmount)}
                                </span>
                              </div>
                            )}
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              {formatCurrencyEUR(taxInfo.netAmount * USD_TO_EUR)}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-[#1e293b]"
                              onClick={() => onEdit(withdrawal)}
                              aria-label="Modifier"
                              title="Modifier"
                            >
                              <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-[#1e293b]"
                              onClick={() => onDelete(withdrawal.id)}
                              aria-label="Supprimer"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
