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
import { StatCard } from "@/components/stat-card"
import {
  Plus,
  Edit,
  Trash2,
  Wallet,
  Activity,
  Target,
  ChevronDown,
  ArrowUpRight,
  Eye,
  Filter,
  Layers,
  ShieldCheck,
  Percent,
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
  pnlEntries?: Array<{ amount: number }>
  linkedEval?: { pricePaid: number }
}

const PROPFIRM_LABELS: Record<string, string> = {
  TOPSTEP: "TopStep",
  TAKEPROFITTRADER: "Take Profit Trader",
  APEX: "Apex",
  FTMO: "FTMO",
  MYFUNDEDFUTURES: "My Funded Futures",
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
  const [selectedAccount, setSelectedAccount] = useState<PropfirmAccount | null>(null)
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc">("date-desc")
  const [filterPropfirm, setFilterPropfirm] = useState<string>("all")
  const [hideInactive, setHideInactive] = useState(false)
  const [hideEvalAccounts, setHideEvalAccounts] = useState(false)
  const [collapsedAccounts, setCollapsedAccounts] = useState<string[]>([])
  const [showOnlyActive, setShowOnlyActive] = useState(false)

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const toggleAccountCollapse = (accountId: string) => {
    setCollapsedAccounts((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    )
  }

  // Filtrer et trier les comptes
  const filteredAndSortedAccounts = accounts
    .filter((account: { propfirm: string; status: string; accountType: string }) => {
      // Filtre par propfirm
      if (filterPropfirm !== "all" && account.propfirm !== filterPropfirm) {
        return false
      }

      // Filtre pour cacher les comptes inactifs (validés ou cramés)
      if (
        hideInactive &&
        (account.status === "VALIDATED" ||
          account.status === "FAILED" ||
          account.status === "ARCHIVED")
      ) {
        return false
      }

      if (showOnlyActive && account.status !== "ACTIVE") {
        return false
      }

      if (hideEvalAccounts && account.accountType === "EVAL") {
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
    : "Ajoutez votre premier compte"

  const lastValidatedLabel = lastValidatedAccount
    ? format(new Date(lastValidatedAccount.createdAt), "d MMM yyyy", { locale: fr })
    : "—"
  const lastValidatedDescription = lastValidatedAccount
    ? `${PROPFIRM_LABELS[lastValidatedAccount.propfirm] ?? lastValidatedAccount.propfirm} • ${formatCurrency(lastValidatedAccount.size)}`
    : "Aucun compte validé pour l&apos;instant"

  const heroDescription = `${filteredActiveCount} actif${filteredActiveCount > 1 ? "s" : ""} visible${filteredActiveCount > 1 ? "s" : ""}`
  const heroSecondary = `${filteredEvalCount} éval · ${filteredFundedCount} financé${filteredFundedCount > 1 ? "s" : ""}`

  const includeEvaluationAccounts = !hideEvalAccounts
  const showInactiveAccounts = !hideInactive
  const onlyActiveAccounts = showOnlyActive

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
              Gestion des comptes
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 max-w-3xl">
              Centralisez vos comptes de prop firm, visualisez leur progression et retrouvez
              rapidement les informations clés, dans un style cohérent avec la page PnL.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Button
              onClick={handleAdd}
              className="w-full sm:w-auto flex items-center gap-2 text-xs sm:text-sm md:text-base"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline whitespace-nowrap">Ajouter un compte</span>
              <span className="sm:hidden whitespace-nowrap">Ajouter</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Comptes suivis"
            value={filteredCount}
            icon={Activity}
            description={heroDescription}
            secondaryText={heroSecondary}
          />
          <StatCard
            title="Investissement total"
            value={formatCurrency(totalInvestment)}
            icon={Wallet}
            variant="warning"
            description={"Frais engagés sur l'ensemble des comptes"}
          />
          <StatCard
            title="Dernier compte validé"
            value={lastValidatedAccount ? lastValidatedAccount.name : "—"}
            icon={ShieldCheck}
            description={lastValidatedDescription}
            secondaryText={lastValidatedLabel}
            variant={lastValidatedAccount ? "success" : "neutral"}
          />
          <StatCard
            title="Dernier compte ajouté"
            value={lastAccount ? lastAccount.name : "—"}
            icon={Target}
            description={lastAccountDescription}
            secondaryText={lastAccountDateLabel}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100/80 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300">
                <Filter className="h-3.5 w-3.5" />
                Paramètres d&apos;affichage
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 max-w-2xl">
                Ajustez les filtres pour n&apos;afficher que les comptes pertinents. Les cartes et
                métriques reflètent instantanément vos préférences.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200">
                {filteredCount} compte{filteredCount > 1 ? "s" : ""} affiché
                {filteredCount > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200">
                {filteredActiveCount} actif{filteredActiveCount > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setHideEvalAccounts((prev) => !prev)}
              className={`group flex items-start gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:hover:shadow-none ${
                includeEvaluationAccounts
                  ? "border-emerald-500/40 bg-emerald-50/80 dark:border-emerald-400/40 dark:bg-emerald-500/10"
                  : "border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-800/60 dark:bg-zinc-900/40"
              }`}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full transition ${
                  includeEvaluationAccounts
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                }`}
              >
                <Eye className="h-4 w-4" />
              </span>
              <span className="space-y-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {includeEvaluationAccounts
                    ? "Comptes d'évaluation inclus"
                    : "Comptes d'évaluation masqués"}
                  <span
                    className={`inline-flex h-5 min-w-[44px] items-center justify-center rounded-full text-[11px] font-medium ${
                      includeEvaluationAccounts
                        ? "bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-blue-500/20 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                    }`}
                  >
                    {includeEvaluationAccounts ? "On" : "Off"}
                  </span>
                </span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {includeEvaluationAccounts
                    ? "Les comptes d'évaluation restent visibles et comptabilisés."
                    : "Les comptes d'évaluation sont cachés des listes."}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setHideInactive((prev) => !prev)}
              className={`group flex items-start gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:hover:shadow-none ${
                showInactiveAccounts
                  ? "border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-800/60 dark:bg-zinc-900/40"
                  : "border-amber-500/40 bg-amber-50/80 dark:border-amber-400/40 dark:bg-amber-500/10"
              }`}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full transition ${
                  showInactiveAccounts
                    ? "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                    : "bg-amber-500 text-white"
                }`}
              >
                <Layers className="h-4 w-4" />
              </span>
              <span className="space-y-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {showInactiveAccounts ? "Inactifs visibles" : "Inactifs masqués"}
                  <span
                    className={`inline-flex h-5 min-w-[44px] items-center justify-center rounded-full text-[11px] font-medium ${
                      showInactiveAccounts
                        ? "bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-amber-500/20 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
                    }`}
                  >
                    {showInactiveAccounts ? "On" : "Off"}
                  </span>
                </span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {showInactiveAccounts
                    ? "Tous les statuts restent visibles, y compris les comptes clôturés."
                    : "Les comptes validés, cramés et archivés sont retirés de la liste."}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowOnlyActive((prev) => !prev)}
              className={`group flex items-start gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:hover:shadow-none ${
                onlyActiveAccounts
                  ? "border-emerald-500/40 bg-emerald-50/80 dark:border-emerald-400/40 dark:bg-emerald-500/10"
                  : "border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-800/60 dark:bg-zinc-900/40"
              }`}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full transition ${
                  onlyActiveAccounts
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                }`}
              >
                <Activity className="h-4 w-4" />
              </span>
              <span className="space-y-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {onlyActiveAccounts ? "Seuls les actifs" : "Tous les statuts"}
                  <span
                    className={`inline-flex h-5 min-w-[44px] items-center justify-center rounded-full text-[11px] font-medium ${
                      onlyActiveAccounts
                        ? "bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-blue-500/20 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                    }`}
                  >
                    {onlyActiveAccounts ? "On" : "Off"}
                  </span>
                </span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {onlyActiveAccounts
                    ? "Les listes n'affichent plus que les comptes au statut actif."
                    : "Les comptes inactifs et historiques restent affichés."}
                </span>
              </span>
            </button>
          </div>

          {accounts.length > 0 && (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Propfirm
                </span>
                <Select value={filterPropfirm} onValueChange={setFilterPropfirm}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Toutes les propfirms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les propfirms</SelectItem>
                    {availablePropfirms.map((propfirm) => (
                      <SelectItem key={propfirm} value={propfirm}>
                        {PROPFIRM_LABELS[propfirm as keyof typeof PROPFIRM_LABELS] ?? propfirm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Ordre d&apos;affichage
                </span>
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as "date-desc" | "date-asc")}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Ordre d'affichage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Plus récents d&apos;abord</SelectItem>
                    <SelectItem value="date-asc">Plus anciens d&apos;abord</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </section>

      {accounts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 p-10 text-center space-y-4">
          <Wallet className="mx-auto h-12 w-12 text-zinc-400" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Aucun compte pour le moment
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
              Commencez par ajouter votre premier compte prop firm pour suivre vos performances et
              vos frais.
            </p>
          </div>
          <Button onClick={handleAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un compte
          </Button>
        </div>
      ) : filteredAndSortedAccounts.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/60 p-10 text-center space-y-4">
          <Wallet className="mx-auto h-12 w-12 text-zinc-400" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Aucun compte ne correspond aux filtres
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
              Ajustez les filtres ci-dessus pour élargir la sélection ou réafficher les comptes
              cachés.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
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
              pnlEntries?: Array<{ amount: number }>
              linkedEval?: { pricePaid: number }
            }) => {
              const isCollapsed = collapsedAccounts.includes(account.id)
              const gradient =
                STATUS_GRADIENTS[account.status] ?? "from-zinc-500/10 via-zinc-500/5 to-transparent"
              const createdAtLabel = format(new Date(account.createdAt), "d MMM yyyy", {
                locale: fr,
              })

              // Calculer le ROI pour ce compte
              const totalPnl = (account.pnlEntries || []).reduce(
                (sum, entry) => sum + entry.amount,
                0
              )
              const totalInvested = account.pricePaid + (account.linkedEval?.pricePaid || 0)
              const netProfit = totalPnl - totalInvested
              const accountRoi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0

              return (
                <Card key={account.id} className="border-none bg-transparent shadow-none">
                  <CardContent className="p-0">
                    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/80 shadow-sm">
                      <div
                        className={`flex flex-col gap-4 border-b border-zinc-200/70 dark:border-zinc-800/60 bg-linear-to-r ${gradient} p-4 sm:p-6`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-2 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                                {account.name}
                              </h3>
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200">
                                {PROPFIRM_LABELS[account.propfirm] ?? account.propfirm}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
                              Ouvert le {createdAtLabel} • Taille {formatCurrency(account.size)}
                            </p>
                          </div>
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                              onClick={() => toggleAccountCollapse(account.id)}
                              aria-label={
                                isCollapsed
                                  ? "Déplier les détails du compte"
                                  : "Réduire les détails du compte"
                              }
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleEdit({
                                  ...account,
                                  notes: account.notes ?? undefined,
                                } as PropfirmAccount)
                              }
                              aria-label="Modifier le compte"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-500 hover:text-rose-600 dark:text-rose-400"
                              onClick={() => handleDelete(account.id)}
                              aria-label="Supprimer le compte"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="p-4 sm:p-6 space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50 dark:bg-zinc-900/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                Type de compte
                              </p>
                              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                {ACCOUNT_TYPE_LABELS[account.accountType]}
                              </p>
                            </div>
                            <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50 dark:bg-zinc-900/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                Statut
                              </p>
                              <span
                                className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                  STATUS_COLORS[account.status]
                                }`}
                              >
                                {STATUS_LABELS[account.status]}
                              </span>
                            </div>
                            <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50 dark:bg-zinc-900/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                Frais engagés
                              </p>
                              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                {formatCurrency(account.pricePaid)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50 dark:bg-zinc-900/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                Capital nominal
                              </p>
                              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                {formatCurrency(account.size)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50 dark:bg-zinc-900/70 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                ROI
                              </p>
                              <p
                                className={`text-sm font-semibold ${
                                  accountRoi >= 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {accountRoi >= 0 ? "+" : ""}
                                {accountRoi.toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          {/* Note explicative pour le ROI */}
                          <div className="rounded-xl border border-blue-200/70 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/30 p-3 sm:p-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                              <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                              <div className="space-y-1 min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-100">
                                  À propos du ROI par compte
                                </p>
                                <p className="text-[11px] sm:text-xs text-blue-700 dark:text-blue-300">
                                  Le ROI (Retour sur Investissement) mesure la rentabilité de ce
                                  compte spécifique. Il compare le profit net (PnL total -
                                  investissement total, incluant l&apos;évaluation liée si
                                  applicable) à votre investissement initial. Un ROI positif indique
                                  que le compte est rentable.
                                </p>
                              </div>
                            </div>
                          </div>

                          {account.notes && (
                            <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50 dark:bg-zinc-900/60 p-4">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
                                Notes
                              </p>
                              <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                                {account.notes}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                              Créé le {createdAtLabel} •{" "}
                              {PROPFIRM_LABELS[account.propfirm] ?? account.propfirm}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs sm:text-sm"
                                onClick={() => router.push(`/dashboard/accounts/${account.id}`)}
                              >
                                Voir la fiche
                                <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
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
    </div>
  )
}
