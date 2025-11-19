"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AccountFormDialog } from "@/components/account-form-dialog"
import { BulkAccountFormDialog } from "@/components/bulk-account-form-dialog"
import { StatCard } from "@/components/stat-card"
import {
  Plus,
  Edit,
  Trash2,
  Wallet,
  Activity,
  Target,
  ArrowUpRight,
  Eye,
  Filter,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { useAccountsListCache } from "@/hooks/use-data-cache"
import { useDeleteAccountMutation } from "@/hooks/use-mutation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface PropfirmAccount {
  id: string
  name: string
  propfirm: string
  size: number
  accountType: string
  status: string
  pricePaid: number
  notes?: string
  createdAt: string
  pnlEntries?: Array<{ id?: string; date?: string; amount: number; notes?: string | null }>
  linkedEval?: { pricePaid: number }
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

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  VALIDATED: "Validé",
  FAILED: "Échoué",
  ARCHIVED: "Archivé",
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  VALIDATED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  ARCHIVED: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
}

const STATUS_GRADIENTS: Record<string, string> = {
  ACTIVE: "from-blue-500/15 via-blue-500/5 to-transparent",
  VALIDATED: "from-emerald-500/15 via-emerald-500/5 to-transparent",
  FAILED: "from-rose-500/15 via-rose-500/5 to-transparent",
  ARCHIVED: "from-zinc-500/10 via-zinc-500/5 to-transparent",
}

export default function AccountsPage() {
  const router = useRouter()

  // Utiliser le cache avec invalidation automatique
  const { data: accounts = [], isLoading } = useAccountsListCache()

  // Utiliser la mutation de suppression
  const { mutate: deleteAccount } = useDeleteAccountMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<PropfirmAccount | null>(null)
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc">("date-desc")
  const [filterPropfirm, setFilterPropfirm] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "validated" | "failed">("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "eval" | "funded">("all")

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) {
      return
    }

    await deleteAccount(id)
  }

  const handleEdit = (account: PropfirmAccount) => {
    setSelectedAccount(account)
    setDialogOpen(true)
  }

  const handleAdd = () => {
    setSelectedAccount(null)
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

  const formatCurrencyCompact = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k $US`
    }
    return formatCurrency(amount)
  }

  // Filtrer et trier les comptes
  const filteredAndSortedAccounts = accounts
    .filter((account: { propfirm: string; status: string; accountType: string }) => {
      // Filtre par propfirm
      if (filterPropfirm !== "all" && account.propfirm !== filterPropfirm) {
        return false
      }

      // Filtre par statut
      if (statusFilter === "active" && account.status !== "ACTIVE") {
        return false
      }
      if (statusFilter === "validated" && account.status !== "VALIDATED") {
        return false
      }
      if (statusFilter === "failed" && account.status !== "FAILED") {
        return false
      }

      // Filtre par type de compte
      if (typeFilter === "eval" && account.accountType !== "EVAL") {
        return false
      }
      if (typeFilter === "funded" && account.accountType !== "FUNDED") {
        return false
      }

      return true
    })
    .sort((a: { createdAt: string; status: string }, b: { createdAt: string; status: string }) => {
      // Trier d'abord par statut (actifs en premier)
      const statusPriority: Record<string, number> = {
        ACTIVE: 0,
        VALIDATED: 1,
        FAILED: 2,
        ARCHIVED: 3,
      }

      const aPriority = statusPriority[a.status] ?? 999
      const bPriority = statusPriority[b.status] ?? 999

      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }

      // Puis trier par date
      if (sortBy === "date-desc") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
    })

  const accountStats = useMemo(() => {
    const totalInvestment = accounts.reduce(
      (sum: number, acc: { pricePaid: number }) => sum + (acc.pricePaid ?? 0),
      0
    )

    const lastAccount = [...accounts].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })[0]

    const lastValidatedAccount = [...accounts]
      .filter((acc) => acc.status === "VALIDATED")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

    return {
      totalInvestment,
      lastAccount,
      lastValidatedAccount,
    }
  }, [accounts])

  const { totalInvestment, lastAccount, lastValidatedAccount } = accountStats

  const filteredStats = useMemo(() => {
    const count = filteredAndSortedAccounts.length
    const activeCount = filteredAndSortedAccounts.filter(
      (acc: { status: string }) => acc.status === "ACTIVE"
    ).length
    const evalCount = filteredAndSortedAccounts.filter(
      (acc: { accountType: string }) => acc.accountType === "EVAL"
    ).length
    const fundedCount = filteredAndSortedAccounts.filter(
      (acc: { accountType: string }) => acc.accountType === "FUNDED"
    ).length

    return {
      count,
      activeCount,
      evalCount,
      fundedCount,
    }
  }, [filteredAndSortedAccounts])

  const {
    count: filteredCount,
    activeCount: filteredActiveCount,
    evalCount: filteredEvalCount,
    fundedCount: filteredFundedCount,
  } = filteredStats

  const lastAccountDateLabel = lastAccount
    ? format(new Date(lastAccount.createdAt), "d MMM yyyy", { locale: fr })
    : "—"
  const lastAccountDescription = lastAccount
    ? `${PROPFIRM_LABELS[lastAccount.propfirm] ?? lastAccount.propfirm} • ${ACCOUNT_TYPE_LABELS[lastAccount.accountType]}`
    : "Aucun compte"

  // Tronquer le nom du compte si trop long
  const lastAccountName = lastAccount
    ? lastAccount.name.length > 20
      ? `${lastAccount.name.substring(0, 20)}...`
      : lastAccount.name
    : "—"

  const lastValidatedLabel = lastValidatedAccount
    ? format(new Date(lastValidatedAccount.createdAt), "d MMM yyyy", { locale: fr })
    : "—"
  const lastValidatedDescription = lastValidatedAccount
    ? `${PROPFIRM_LABELS[lastValidatedAccount.propfirm] ?? lastValidatedAccount.propfirm} • ${formatCurrency(lastValidatedAccount.size)}`
    : "Aucun compte validé"

  const heroDescription = `${filteredActiveCount} actif${filteredActiveCount > 1 ? "s" : ""}`
  const heroSecondary = `${filteredEvalCount} éval · ${filteredFundedCount} financé${filteredFundedCount > 1 ? "s" : ""}`

  // Obtenir la liste des propfirms disponibles
  const availablePropfirms: string[] = Array.from(
    new Set(accounts.map((acc: { propfirm: string }) => acc.propfirm))
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Chargement des comptes...</p>
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
              Mes comptes
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Button
              onClick={handleAdd}
              size="lg"
              variant="default"
              className="w-full sm:w-auto flex items-center gap-2 text-sm sm:text-base font-semibold h-11 sm:h-12"
            >
              <Plus className="h-5 w-5" />
              <span>Nouveau compte</span>
            </Button>
            <Button
              onClick={handleBulkAdd}
              size="lg"
              variant="outline"
              className="w-full sm:w-auto flex items-center gap-2 text-sm sm:text-base font-semibold h-11 sm:h-12"
            >
              <Plus className="h-5 w-5" />
              <span>Ajout groupé</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total comptes"
            value={filteredCount}
            icon={Activity}
            description={heroDescription}
            secondaryText={heroSecondary}
            className="min-w-0"
          />
          <StatCard
            title="Total investi"
            value={formatCurrency(totalInvestment)}
            icon={Wallet}
            variant="warning"
            description="Argent dépensé"
            className="min-w-0"
          />
          <StatCard
            title="Dernier validé"
            value={lastValidatedAccount ? lastValidatedAccount.name : "—"}
            icon={ShieldCheck}
            description={lastValidatedDescription}
            secondaryText={lastValidatedLabel}
            variant={lastValidatedAccount ? "success" : "neutral"}
            className="min-w-0"
          />
          <StatCard
            title="Dernier ajouté"
            value={lastAccountName}
            valueTooltip={lastAccount?.name}
            icon={Target}
            description={lastAccountDescription}
            secondaryText={lastAccountDateLabel}
            className="min-w-0"
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
              <span className="font-semibold">{filteredCount}</span>
              <span>compte{filteredCount > 1 ? "s" : ""}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Filtre par statut */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Activity className="h-4 w-4 shrink-0" />
                <span>Statut</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border-2 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer min-w-0 ${
                    statusFilter === "all"
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-300"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="truncate w-full text-center">Tous</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border-2 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer min-w-0 ${
                    statusFilter === "active"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="truncate min-w-0">Actifs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("validated")}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border-2 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer min-w-0 ${
                    statusFilter === "validated"
                      ? "border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-400 dark:bg-amber-950/50 dark:text-amber-300"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="truncate min-w-0">Validés</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("failed")}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border-2 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer min-w-0 ${
                    statusFilter === "failed"
                      ? "border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-400 dark:bg-rose-950/50 dark:text-rose-300"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="truncate min-w-0">Échoués</span>
                </button>
              </div>
            </div>

            {/* Filtre par type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Target className="h-4 w-4 shrink-0" />
                <span>Type</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTypeFilter("all")}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border-2 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer min-w-0 ${
                    typeFilter === "all"
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-300"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="truncate w-full text-center">Tous</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("eval")}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border-2 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer min-w-0 ${
                    typeFilter === "eval"
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-300"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="truncate min-w-0">Évaluations</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("funded")}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border-2 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer min-w-0 ${
                    typeFilter === "funded"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="truncate min-w-0">Financés</span>
                </button>
              </div>
            </div>

            {/* Filtres avancés */}
            {accounts.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <Wallet className="h-4 w-4 shrink-0" />
                    <span>Propfirm</span>
                  </label>
                  <Select value={filterPropfirm} onValueChange={setFilterPropfirm}>
                    <SelectTrigger className="h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {availablePropfirms.map((propfirm) => (
                        <SelectItem key={propfirm} value={propfirm}>
                          {PROPFIRM_LABELS[propfirm as keyof typeof PROPFIRM_LABELS] ?? propfirm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <Target className="h-4 w-4 shrink-0" />
                    <span>Ordre</span>
                  </label>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as "date-desc" | "date-asc")}
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Plus récents</SelectItem>
                      <SelectItem value="date-asc">Plus anciens</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {accounts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 p-10 text-center space-y-4">
          <Wallet className="mx-auto h-16 w-16 text-zinc-400" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Aucun compte</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Ajoutez votre premier compte</p>
          </div>
          <Button onClick={handleAdd} size="lg" className="flex items-center gap-2 mt-4">
            <Plus className="h-5 w-5" />
            Nouveau compte
          </Button>
        </div>
      ) : filteredAndSortedAccounts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/60 p-10 text-center space-y-4">
          <Filter className="mx-auto h-16 w-16 text-zinc-400" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Aucun résultat</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Changez les filtres pour voir vos comptes
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredAndSortedAccounts.map(
            (account: {
              id: string
              name: string
              propfirm: string
              size: number
              accountType: string
              status: string
              pricePaid: number
              notes?: string | null
              createdAt: string
              pnlEntries?: Array<{
                id?: string
                date?: string
                amount: number
                notes?: string | null
              }>
              linkedEval?: { pricePaid: number }
            }) => {
              const gradient =
                STATUS_GRADIENTS[account.status] ?? "from-zinc-500/10 via-zinc-500/5 to-transparent"

              // Obtenir le dernier PnL entré sur ce compte
              let lastPnlEntry = null
              let lastPnlAmount = 0

              try {
                if (
                  account.pnlEntries &&
                  Array.isArray(account.pnlEntries) &&
                  account.pnlEntries.length > 0
                ) {
                  const validEntries = account.pnlEntries.filter(
                    (entry) =>
                      entry && typeof entry === "object" && typeof entry.amount === "number"
                  )

                  if (validEntries.length > 0) {
                    lastPnlEntry = [...validEntries].sort((a, b) => {
                      // Trier par date décroissante (le plus récent en premier)
                      // Si pas de date, mettre à la fin
                      try {
                        const dateA = a.date ? new Date(a.date).getTime() : 0
                        const dateB = b.date ? new Date(b.date).getTime() : 0
                        if (dateA === 0 && dateB === 0) return 0 // Pas de date, garder l'ordre
                        if (dateA === 0) return 1 // Mettre les entrées sans date à la fin
                        if (dateB === 0) return -1
                        return dateB - dateA
                      } catch {
                        return 0
                      }
                    })[0]
                    lastPnlAmount = lastPnlEntry?.amount ?? 0
                  }
                }
              } catch {
                // En cas d'erreur, on continue sans afficher le dernier PnL
              }

              return (
                <Card key={account.id} className="border-none bg-transparent shadow-none">
                  <CardContent className="p-0">
                    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/80 shadow-sm w-full">
                      <div
                        className={`flex flex-col gap-2 sm:gap-3 border-b border-zinc-200/70 dark:border-zinc-800/60 bg-linear-to-r ${gradient} p-3 sm:p-4 hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                          <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2 overflow-hidden">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 w-full">
                              <h3
                                className="text-sm sm:text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate min-w-0 flex-1"
                                title={account.name}
                              >
                                {account.name.length > 20
                                  ? `${account.name.substring(0, 20)}...`
                                  : account.name}
                              </h3>
                              <span
                                className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold shrink-0 ${
                                  STATUS_COLORS[account.status]
                                }`}
                              >
                                {STATUS_LABELS[account.status]}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 shrink-0">
                                {account.accountType === "EVAL" ? (
                                  <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                                ) : (
                                  <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                                )}
                                <span className="truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
                                  {PROPFIRM_LABELS[account.propfirm] ?? account.propfirm}
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 sm:h-10 sm:w-10 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit({
                                  ...account,
                                  notes: account.notes ?? undefined,
                                } as PropfirmAccount)
                              }}
                              aria-label="Modifier"
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 sm:h-10 sm:w-10 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(account.id)
                              }}
                              aria-label="Supprimer"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50 min-w-0 w-full">
                          <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 min-w-0 flex-1">
                            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                            <span className="font-semibold truncate">
                              {formatCurrencyCompact(account.size)}
                            </span>
                          </div>
                          {lastPnlEntry ? (
                            <div
                              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-bold text-xs sm:text-sm shrink-0 ${
                                lastPnlAmount >= 0
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                              }`}
                            >
                              {lastPnlAmount >= 0 ? (
                                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                              )}
                              <span className="whitespace-nowrap">
                                {lastPnlAmount >= 0 ? "+" : ""}
                                {formatCurrencyCompact(lastPnlAmount)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-bold text-xs sm:text-sm shrink-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
                              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                              <span className="whitespace-nowrap">—</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
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
                              {ACCOUNT_TYPE_LABELS[account.accountType]}
                            </p>
                          </div>
                          <div className="rounded-lg border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/50 p-2 sm:p-3">
                            <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                              <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 shrink-0" />
                              <p className="text-[10px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide truncate">
                                Prix payé
                              </p>
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50 text-right wrap-break-word">
                              {formatCurrencyCompact(account.pricePaid)}
                            </p>
                          </div>
                        </div>

                        {account.notes && (
                          <div className="rounded-lg border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/50 p-2 sm:p-3">
                            <p className="text-[10px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 sm:mb-1.5 uppercase tracking-wide">
                              Notes
                            </p>
                            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap line-clamp-2 wrap-break-word">
                              {account.notes}
                            </p>
                          </div>
                        )}

                        <Button
                          variant="default"
                          size="sm"
                          className="w-full h-8 sm:h-9 text-xs sm:text-sm font-semibold"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/accounts/${account.id}`)
                          }}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                          Voir détails
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            }
          )}
        </div>
      )}

      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={selectedAccount}
        onSuccess={() => {
          setDialogOpen(false)
          router.refresh()
        }}
      />

      <BulkAccountFormDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onSuccess={() => {
          setBulkDialogOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
