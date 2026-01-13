/* eslint-disable */
"use client"

import { useState, useMemo, useCallback, use, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ArrowLeft,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react"
import { StatCard, useStatVariant } from "@/components/stat-card"
import { useAccountCache } from "@/hooks/use-data-cache"
import {
  useDeleteAccountMutation,
  useUpdateAccountMutation,
  useDeletePnlMutation,
  useDeleteWithdrawalMutation,
} from "@/hooks/use-mutation"
import { useConfirm } from "@/hooks/use-confirm"
import { useNotification } from "@/hooks/use-notification"
import { eventBus, AppEvents } from "@/lib/events/event-bus"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { MonthlyCalendar } from "@/components/monthly-calendar"
import { AccountRulesTracker } from "@/components/account-rules-tracker"
import { TradingCyclesTracker } from "@/components/trading-cycles-tracker"
import { ApexPaRulesTracker } from "@/components/apex-pa-rules-tracker"
import { PhidiasFundedTracker } from "@/components/phidias-funded-tracker"
import { PropfirmStrategyFactory } from "@/lib/strategies/propfirm-strategy.factory"
import { Gift, CreditCard, Info, BarChart3, Target } from "lucide-react"
import { getPhidiasAccountSubType, getPhidiasAccountSubTypeLabel } from "@/lib/phidias-account-type"
// ⚡ CODE SPLITTING: Lazy load dialogs only (opened on user action)
const AccountFormDialog = dynamic(() =>
  import("@/components/account-form-dialog").then((m) => ({ default: m.AccountFormDialog }))
)
const PnlFormDialog = dynamic(() =>
  import("@/components/pnl-form-dialog").then((m) => ({ default: m.PnlFormDialog }))
)
const WithdrawalFormDialog = dynamic(() =>
  import("@/components/withdrawal-form-dialog").then((m) => ({ default: m.WithdrawalFormDialog }))
)
const TradingStatsComponent = dynamic(() =>
  import("@/components/trading-stats").then((m) => ({ default: m.TradingStatsComponent }))
)

const PROPFIRM_LABELS: Record<string, string> = {
  TOPSTEP: "TopStep",
  TAKEPROFITTRADER: "Take Profit Trader",
  APEX: "Apex",
  BULENOX: "Bulenox",
  PHIDIAS: "Phidias",
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
  ACTIVE: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
  VALIDATED: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300",
  FAILED: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300",
  ARCHIVED: "bg-zinc-100 text-zinc-600 dark:bg-[#1e293b] dark:text-slate-300",
}

export default function AccountDetailPage() {
  const router = useRouter()
  const params = useParams()
  // Dans les client components, useParams() retourne toujours un objet synchrone
  // Les Promises sont uniquement pour les Server Components
  const accountId = params.id as string

  // Utiliser le cache avec invalidation automatique
  // Le cache se met à jour automatiquement via les événements, pas besoin de refetch manuel
  // useAccountCache écoute automatiquement PNL_CREATED, PNL_UPDATED, PNL_DELETED, etc.
  // et invalide le cache pour mettre à jour l'affichage sans rechargement de page
  const { data: account, isLoading, refetch } = useAccountCache(accountId)

  // Log pour déboguer les changements de données et forcer un re-render si nécessaire
  useEffect(() => {
    console.log("[AccountDetailPage] Component rendered")
    console.log("[AccountDetailPage] Account data:", account)
    console.log("[AccountDetailPage] Account ID:", account?.id)
    const pnlCount = account?.pnlEntries?.length || 0
    console.log("[AccountDetailPage] PnL entries count:", pnlCount)
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/db8eeb53-5cb0-4ca6-b69a-c9171cec64a1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "accounts/[id]/page.tsx:95",
        message: "HYP-E: Component rendered with account data",
        data: { accountId: account?.id, pnlEntriesCount: pnlCount, hasAccount: !!account },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "E",
      }),
    }).catch(() => {})
    // #endregion
    if (account?.pnlEntries) {
      const pnlIds = account.pnlEntries.map((e: any) => e.id)
      console.log("[AccountDetailPage] PnL entries IDs:", pnlIds)
      console.log(
        "[AccountDetailPage] PnL entries:",
        account.pnlEntries.map((e: any) => ({ id: e.id, date: e.date, amount: e.amount }))
      )
      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/db8eeb53-5cb0-4ca6-b69a-c9171cec64a1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "accounts/[id]/page.tsx:99",
          message: "HYP-E: PnL entries details",
          data: { pnlIds, pnlCount },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "E",
        }),
      }).catch(() => {})
      // #endregion
    }
  }, [account])

  // Utiliser les mutations
  const { mutate: deleteAccount } = useDeleteAccountMutation()
  const { mutate: updateAccount } = useUpdateAccountMutation()
  const { mutate: deletePnl } = useDeletePnlMutation()
  const { mutate: deleteWithdrawal } = useDeleteWithdrawalMutation()

  // Hook de confirmation
  const { confirm, ConfirmDialog } = useConfirm()

  // Hook pour les notifications unifiées
  const notification = useNotification()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [pnlDialogOpen, setPnlDialogOpen] = useState(false)
  const [selectedPnl, setSelectedPnl] = useState<{
    id: string
    date: string
    amount: number
    notes?: string
    accountId: string
  } | null>(null)
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<{
    id: string
    date: string
    amount: number
    notes?: string
    accountId: string
  } | null>(null)
  const [isEligibleForValidation, setIsEligibleForValidation] = useState(false)
  const [isTradingStatsOpen, setIsTradingStatsOpen] = useState(false)
  const [isRulesOpen, setIsRulesOpen] = useState(false)
  const [isPnlHistoryOpen, setIsPnlHistoryOpen] = useState(false)
  const [isWithdrawalHistoryOpen, setIsWithdrawalHistoryOpen] = useState(false)

  // Calculer l'éligibilité pour la validation (même si la section n'est pas ouverte)
  const calculatedEligibility = useMemo(() => {
    if (!account || account.accountType !== "EVAL" || account.status !== "ACTIVE") {
      return false
    }

    try {
      const strategy = PropfirmStrategyFactory.getStrategy(account.propfirm)
      const normalizedPnlEntries = account.pnlEntries.map(
        (entry: { date: string; amount: number }) => ({
          date: new Date(entry.date),
          amount: entry.amount,
        })
      )
      return strategy.isEligibleForValidation(
        account.size,
        normalizedPnlEntries,
        account.accountType,
        account.name,
        account.notes
      )
    } catch (error) {
      console.error("Erreur lors du calcul de l'éligibilité:", error)
      return false
    }
  }, [account])

  // Utiliser l'éligibilité calculée ou celle du tracker (si la section est ouverte)
  const finalEligibility = isRulesOpen ? isEligibleForValidation : calculatedEligibility

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) {
      return
    }

    try {
      await deleteAccount(accountId)
      router.push("/dashboard/accounts")
    } catch (_error) {
      // L'erreur est déjà gérée par la mutation
    }
  }

  const handleValidate = async () => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir valider ce compte ? Il passera en statut VALIDATED."
      )
    ) {
      return
    }

    if (!account) return

    try {
      await updateAccount({
        id: accountId,
        data: {
          ...account,
          status: "VALIDATED",
        },
      })
    } catch (_error) {
      // L'erreur est déjà gérée par la mutation
    }
  }

  // ⚡ MEMOIZATION: Format functions
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }, [])

  const formatCurrencyEUR = useCallback((amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }, [])

  // Taux de change USD vers EUR (à ajuster selon vos besoins)
  const USD_TO_EUR = 0.92

  // ⚡ MEMOIZATION: Heavy calculations (AVANT les early returns pour respecter les règles des Hooks)
  // Utiliser account complet comme dépendance pour garantir la mise à jour
  const totalPnl = useMemo(
    () =>
      account?.pnlEntries?.reduce(
        (sum: number, entry: { amount: number }) => sum + entry.amount,
        0
      ) || 0,
    [account] // Utiliser account complet pour détecter tous les changements
  )

  const totalWithdrawals = useMemo(
    () =>
      account?.withdrawals?.reduce((sum: number, w: { amount: number }) => sum + w.amount, 0) || 0,
    [account] // Utiliser account complet pour détecter tous les changements
  )

  // Détecter si le compte est "cramé" (drawdown dépassé) - AVANT les early returns pour respecter les règles des hooks
  const isBurned = useMemo(() => {
    if (!account || account.status !== "ACTIVE") return false

    try {
      const strategy = PropfirmStrategyFactory.getStrategy(account.propfirm)
      const accountRules = strategy.getAccountRules(
        account.size,
        account.accountType,
        account.name,
        account.notes
      )

      if (!accountRules) return false

      // Calculer le trailing drawdown
      let highestBalance = account.size
      let currentBalanceCalc = account.size
      let maxDrawdownExceeded = false

      const normalizedPnlEntries = account.pnlEntries.map(
        (entry: { date: string; amount: number }) => ({
          date: new Date(entry.date),
          amount: entry.amount,
        })
      )

      normalizedPnlEntries
        .sort(
          (a: { date: Date; amount: number }, b: { date: Date; amount: number }) =>
            a.date.getTime() - b.date.getTime()
        )
        .forEach((entry: { date: Date; amount: number }) => {
          currentBalanceCalc += entry.amount
          if (currentBalanceCalc > highestBalance) {
            highestBalance = currentBalanceCalc
          }
          const trailingDrawdown = highestBalance - currentBalanceCalc
          if (trailingDrawdown > accountRules.maxDrawdown) {
            maxDrawdownExceeded = true
          }
        })

      return maxDrawdownExceeded
    } catch (error) {
      console.error("Erreur lors de la détection du compte cramé:", error)
      return false
    }
  }, [account])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-slate-50 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!account) {
    return null
  }

  // Fonction pour obtenir le maxDrawdown selon la propfirm et la taille
  const getMaxDrawdown = (propfirm: string, size: number): number => {
    const drawdownConfig: Record<string, Record<number, number>> = {
      TOPSTEP: {
        50000: 2000,
        100000: 3000,
        150000: 4500,
      },
      TAKEPROFITTRADER: {
        25000: 1500,
        50000: 2000,
        75000: 2500,
        100000: 3000,
        150000: 4500,
      },
      APEX: {
        25000: 1500,
        50000: 2500,
        100000: 3000,
        150000: 5000,
        250000: 6500,
        300000: 7500,
      },
      BULENOX: {
        25000: 1500,
        50000: 2500,
        100000: 3000,
        150000: 4500,
        250000: 5500,
      },
      PHIDIAS: {
        25000: 500, // Perte statique de 500$ pour le 25K Static
      },
    }
    return drawdownConfig[propfirm]?.[size] || 0
  }

  // Obtenir la stratégie Phidias pour les informations spécifiques
  const phidiasStrategy =
    account.propfirm === "PHIDIAS" ? PropfirmStrategyFactory.getStrategy(account.propfirm) : null

  // Déterminer le sous-type de compte Phidias
  const phidiasSubType =
    account.propfirm === "PHIDIAS"
      ? getPhidiasAccountSubType(account.accountType, account.name, account.notes)
      : null

  // Calculer le bonus et crédit LIVE pour Phidias 25K Static CASH
  const validationBonus =
    phidiasStrategy &&
    account.size === 25000 &&
    account.status === "VALIDATED" &&
    phidiasSubType === "CASH"
      ? (phidiasStrategy as any).getValidationBonus?.(
          account.size,
          account.accountType,
          account.name,
          account.notes
        ) || 0
      : 0

  const liveCredit =
    phidiasStrategy &&
    account.size === 25000 &&
    account.status === "VALIDATED" &&
    phidiasSubType === "CASH"
      ? (phidiasStrategy as any).getLiveCredit?.(
          account.size,
          account.accountType,
          account.name,
          account.notes
        ) || 0
      : 0

  const isPhidias25KStatic = account.propfirm === "PHIDIAS" && account.size === 25000

  // Calculer le total des dépenses (incluant le compte d'évaluation lié si applicable)
  const totalInvested = account.pricePaid + (account.linkedEval?.pricePaid || 0)

  // Statistiques de trading avancées
  const dailyPnlMap = account.pnlEntries.reduce(
    (acc: Record<string, number>, entry: { date: string; amount: number }) => {
      const dateKey = entry.date.split("T")[0]
      acc[dateKey] = (acc[dateKey] || 0) + entry.amount
      return acc
    },
    {} as Record<string, number>
  )

  const dailyPnlValues = Object.values(dailyPnlMap) as number[]
  const tradingDays = dailyPnlValues.length
  const bestDay = dailyPnlValues.length > 0 ? Math.max(...dailyPnlValues) : 0
  const avgPerDay = tradingDays > 0 ? totalPnl / tradingDays : 0

  // Calculer le PnL par mois
  const monthlyPnl = account.pnlEntries.reduce(
    (
      acc: Record<string, { month: string; amount: number; count: number }>,
      entry: { date: string; amount: number }
    ) => {
      const date = new Date(entry.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          amount: 0,
          count: 0,
        }
      }

      acc[monthKey].amount += entry.amount
      acc[monthKey].count += 1

      return acc
    },
    {} as Record<string, { month: string; amount: number; count: number }>
  )

  // Convertir en tableau et trier par date
  const monthlyPnlArray = (
    Object.values(monthlyPnl) as Array<{ month: string; amount: number; count: number }>
  ).sort((a, b) => b.month.localeCompare(a.month))

  // Obtenir les 6 derniers mois
  const _last6Months = monthlyPnlArray.slice(0, 6)

  // Calculer la balance actuelle
  const currentBalance = account.size + totalPnl - totalWithdrawals

  const handleFailed = async () => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir marquer ce compte comme échoué ? Il passera en statut FAILED."
      )
    ) {
      return
    }

    if (!account) return

    try {
      await updateAccount({
        id: accountId,
        data: {
          ...account,
          status: "FAILED",
        },
      })
      notification.showSuccess("Compte marqué comme échoué", {
        duration: 2500,
      })
    } catch (error) {
      notification.handleError(error, "Erreur lors de la mise à jour du statut")
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      {/* ============================================
          SECTION 1: HEADER ET INFORMATIONS PRINCIPALES
          ============================================ */}
      <section className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col gap-4 sm:gap-5 p-4 sm:p-5 lg:p-6">
          {/* En-tête : Bouton retour et titre */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard/accounts")}
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help touch-manipulation">
                        {account.name}
                      </h1>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="max-w-[calc(100vw-2rem)] sm:max-w-xs z-50"
                      sideOffset={8}
                    >
                      <p className="break-words text-xs sm:text-sm">{account.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {PROPFIRM_LABELS[account.propfirm]} • {formatCurrency(account.size)}
                </p>
              </div>
            </div>
          </div>

          {/* Cartes de statistiques principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {/* Carte 1: Balance actuelle */}
            <StatCard
              title="Balance actuelle"
              value={formatCurrency(currentBalance)}
              icon={DollarSign}
              variant={currentBalance >= account.size ? "success" : "default"}
              description={
                currentBalance >= account.size
                  ? `+${formatCurrency(currentBalance - account.size)}`
                  : formatCurrency(currentBalance - account.size)
              }
              size="md"
              className="min-w-0"
            />

            {/* Carte 2: PnL Total */}
            <StatCard
              title="PnL Total"
              value={formatCurrency(totalPnl)}
              icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
              variant={useStatVariant(totalPnl)}
              description={`${tradingDays} jour${tradingDays > 1 ? "s" : ""} de trading`}
              size="md"
              className="min-w-0"
            />

            {/* Carte 3: Retraits (comptes financés uniquement) */}
            {account.accountType === "FUNDED" && (
              <StatCard
                title="Retraits"
                value={formatCurrency(totalWithdrawals)}
                icon={DollarSign}
                variant="neutral"
                description={`${account.withdrawals.length} retrait${account.withdrawals.length > 1 ? "s" : ""}`}
                size="md"
                className="min-w-0"
              />
            )}

            {/* Carte 4: Type et Statut */}
            <div className="bg-slate-50 dark:bg-[#151b2e]/60 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-[#1e293b] flex flex-col justify-between min-h-full">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Type
                </p>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {ACCOUNT_TYPE_LABELS[account.accountType]}
                  </p>
                  {phidiasSubType && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 w-fit">
                      {getPhidiasAccountSubTypeLabel(phidiasSubType)}
                    </span>
                  )}
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold w-fit ${STATUS_COLORS[account.status]}`}
                  >
                    {STATUS_LABELS[account.status]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Barre d'actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-200/70 dark:border-[#1e293b]/70">
            {account.accountType === "EVAL" && account.status === "ACTIVE" && finalEligibility && (
              <Button
                onClick={handleValidate}
                size="default"
                className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-xs sm:text-sm font-semibold h-9 sm:h-10 px-3 sm:px-4"
              >
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                <span className="hidden sm:inline">Valider le compte</span>
                <span className="sm:hidden">Valider</span>
              </Button>
            )}
            {isBurned && account.status === "ACTIVE" && (
              <Button
                onClick={handleFailed}
                size="default"
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-xs sm:text-sm font-semibold h-9 sm:h-10 px-3 sm:px-4"
              >
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                <span className="hidden sm:inline">Marquer comme échoué</span>
                <span className="sm:hidden">Échoué</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="default"
              onClick={() => setEditDialogOpen(true)}
              className="text-xs sm:text-sm font-semibold h-9 sm:h-10 px-3 sm:px-4"
            >
              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
              <span className="hidden sm:inline">Modifier</span>
              <span className="sm:hidden">Éditer</span>
            </Button>
            <Button
              variant="destructive"
              size="default"
              onClick={handleDelete}
              className="text-xs sm:text-sm font-semibold h-9 sm:h-10 px-3 sm:px-4"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
              Supprimer
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================
          SECTION 2: INFORMATIONS COMPLÉMENTAIRES
          ============================================ */}
      <section className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
        <div className="px-4 sm:px-5 lg:px-6 py-3 sm:py-4 border-b border-slate-200/70 dark:border-[#1e293b]/70">
          <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Info className="h-4 w-4 sm:h-5 sm:w-5" />
            Informations complémentaires
          </h2>
        </div>
        <div className="p-4 sm:p-5 lg:p-6">
          {/* Grille d'informations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Colonne 1: Investissement total */}
            <div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-2 font-medium">
                Investissement total
              </p>
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalInvested)}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-1">
                {formatCurrencyEUR(totalInvested * USD_TO_EUR)}
              </p>
              {account.linkedEval && (
                <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-[#1e293b]/50">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">
                    Compte: {formatCurrency(account.pricePaid)}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">
                    Évaluation: {formatCurrency(account.linkedEval.pricePaid)}
                  </p>
                </div>
              )}
            </div>

            {/* Colonne 2: Date de création */}
            <div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-2 font-medium">
                Date de création
              </p>
              <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {format(new Date(account.createdAt), "d MMMM yyyy", { locale: fr })}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-1">
                {format(new Date(account.createdAt), "HH:mm", { locale: fr })}
              </p>
            </div>

            {/* Colonne 3: Compte d'évaluation lié (si applicable) */}
            {account.linkedEval && (
              <div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-2 font-medium">
                  Compte d&apos;évaluation lié
                </p>
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 wrap-break-word">
                  {account.linkedEval.name}
                </p>
                <p className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 mt-1">
                  {formatCurrency(account.linkedEval.pricePaid)}
                </p>
              </div>
            )}
          </div>

          {/* Notes (si présentes) */}
          {account.notes && (
            <div className="mt-6 pt-6 border-t border-slate-200/70 dark:border-[#1e293b]/70">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-2 font-medium">
                Notes
              </p>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap wrap-break-word bg-slate-50 dark:bg-[#1e293b]/50 rounded-lg p-3 sm:p-4">
                {account.notes}
              </p>
            </div>
          )}

          {/* Récapitulatif des règles */}
          {(() => {
            const strategy = PropfirmStrategyFactory.getStrategy(account.propfirm)
            const accountRules = strategy.getAccountRules(
              account.size,
              account.accountType,
              account.name,
              account.notes
            )
            const withdrawalRules = strategy.getWithdrawalRules(
              account.size,
              account.accountType,
              account.name,
              account.notes
            )

            // Ne pas afficher si pas de règles
            if (!accountRules && account.accountType === "EVAL") return null
            if (account.accountType === "FUNDED" && !withdrawalRules) return null

            // Ne pas afficher dailyLossLimit si égal au maxDrawdown (redondant)
            const showDailyLossLimit =
              accountRules &&
              accountRules.dailyLossLimit > 0 &&
              accountRules.dailyLossLimit !== accountRules.maxDrawdown

            return (
              <div className="mt-6 pt-6 border-t border-slate-200/70 dark:border-[#1e293b]/70">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4">
                  Récapitulatif des règles
                </h3>
                {/* Grille des règles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {/* ===== RÈGLES DU COMPTE (ÉVALUATION) ===== */}
                  {accountRules && account.accountType === "EVAL" && (
                    <>
                      {/* Règle 1: Objectif de profit */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 dark:bg-[#1e293b]/50 border border-slate-200/50 dark:border-[#1e293b]/50">
                        <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                          Objectif de profit
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 ml-2 shrink-0">
                          {formatCurrency(accountRules.profitTarget)}
                        </span>
                      </div>
                      {/* Règle 2: Drawdown maximum */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 dark:bg-[#1e293b]/50 border border-slate-200/50 dark:border-[#1e293b]/50">
                        <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                          Drawdown max
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 ml-2 shrink-0">
                          {formatCurrency(accountRules.maxDrawdown)}
                        </span>
                      </div>
                      {/* Règle 3: Perte journalière max (si différente du drawdown) */}
                      {showDailyLossLimit && (
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 dark:bg-[#1e293b]/50 border border-slate-200/50 dark:border-[#1e293b]/50">
                          <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                            Perte journalière max
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 ml-2 shrink-0">
                            {formatCurrency(accountRules.dailyLossLimit)}
                          </span>
                        </div>
                      )}
                      {/* Règle 4: Règle de cohérence (si applicable) */}
                      {accountRules.consistencyRule > 0 && (
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 dark:bg-[#1e293b]/50 border border-slate-200/50 dark:border-[#1e293b]/50">
                          <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                            Cohérence
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 ml-2 shrink-0">
                            {accountRules.consistencyRule}%
                          </span>
                        </div>
                      )}
                      {/* Règle 5: Jours de trading minimum (si applicable) */}
                      {accountRules.minTradingDays && accountRules.minTradingDays > 0 && (
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 dark:bg-[#1e293b]/50 border border-slate-200/50 dark:border-[#1e293b]/50">
                          <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                            Jours min
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 ml-2 shrink-0">
                            {accountRules.minTradingDays}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* ===== RÈGLES DE RETRAIT (COMPTES FINANCÉS) ===== */}
                  {account.accountType === "FUNDED" && withdrawalRules && (
                    <>
                      {/* Règle 1: Taxe sur les retraits */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 dark:bg-[#1e293b]/50 border border-slate-200/50 dark:border-[#1e293b]/50">
                        <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                          Taxe
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 ml-2 shrink-0">
                          {Math.round(withdrawalRules.taxRate * 100)}%
                        </span>
                      </div>
                      {/* Règles de cycles (si requis) */}
                      {withdrawalRules.requiresCycles && withdrawalRules.cycleRequirements && (
                        <>
                          {/* Règle 2: Cycles requis */}
                          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 dark:bg-[#1e293b]/50 border border-slate-200/50 dark:border-[#1e293b]/50">
                            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                              Cycles requis
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 ml-2 shrink-0">
                              {withdrawalRules.cycleRequirements.daysPerCycle} jours
                            </span>
                          </div>
                          {/* Règle 3: PnL minimum par jour (si requis) */}
                          {withdrawalRules.cycleRequirements.minDailyProfit > 0 && (
                            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 dark:bg-[#1e293b]/50 border border-slate-200/50 dark:border-[#1e293b]/50">
                              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                                PnL min/jour
                              </span>
                              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 ml-2 shrink-0">
                                {formatCurrency(withdrawalRules.cycleRequirements.minDailyProfit)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {/* Règle 4: Buffer requis (si applicable) */}
                      {withdrawalRules.hasBuffer && (
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 dark:bg-[#1e293b]/50 border border-slate-200/50 dark:border-[#1e293b]/50">
                          <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                            Buffer requis
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-500 ml-2 shrink-0">
                            Oui
                          </span>
                        </div>
                      )}
                      {/* Règle 5: Retrait libre (si pas de cycles ni buffer) */}
                      {!withdrawalRules.requiresCycles && !withdrawalRules.hasBuffer && (
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 dark:bg-[#1e293b]/50 border border-slate-200/50 dark:border-[#1e293b]/50">
                          <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                            Retrait
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-500 ml-2 shrink-0">
                            Libre
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </section>

      {/* ============================================
          SECTION 3: RÈGLES DE VALIDATION (COMPTES ÉVALUATION)
          ============================================ */}
      {account.accountType === "EVAL" && (
        <section className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
          <button
            onClick={() => setIsRulesOpen(!isRulesOpen)}
            className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-4 border-b border-slate-200/50 dark:border-[#1e293b]/30 hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors rounded-t-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 text-left">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                  Règles de validation
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-zinc-400" />
                {finalEligibility && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-500">
                      Éligible
                    </span>
                  </div>
                )}
                {isRulesOpen ? (
                  <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
                ) : (
                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 text-left">
              Suivez votre progression pour valider votre compte
            </p>
          </button>
          {isRulesOpen && (
            <div className="p-4 sm:p-6">
              <AccountRulesTracker
                accountSize={account.size}
                accountType={account.accountType}
                propfirm={account.propfirm}
                pnlEntries={account.pnlEntries}
                accountName={account.name}
                notes={account.notes}
                onEligibilityChange={setIsEligibleForValidation}
              />
            </div>
          )}
        </section>
      )}

      {/* ============================================
          SECTION 4: TRACKERS SPÉCIFIQUES PAR PROPFIRM
          ============================================ */}

      {/* Tableau de bord Phidias (comptes financés uniquement) */}
      {account.accountType === "FUNDED" && account.propfirm === "PHIDIAS" && (
        <section className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
          <PhidiasFundedTracker
            accountSize={account.size}
            accountType={account.accountType}
            accountName={account.name}
            notes={account.notes}
            pnlEntries={account.pnlEntries}
            withdrawals={account.withdrawals}
          />
        </section>
      )}

      {/* Cycles de trading (comptes financés sauf Apex et Phidias) */}
      {account.accountType === "FUNDED" &&
        account.propfirm !== "APEX" &&
        account.propfirm !== "PHIDIAS" && (
          <TradingCyclesTracker
            pnlEntries={account.pnlEntries}
            withdrawals={account.withdrawals}
            accountSize={account.size}
            propfirm={account.propfirm}
            maxDrawdown={getMaxDrawdown(account.propfirm, account.size)}
            accountType={account.accountType}
            accountName={account.name}
            notes={account.notes}
          />
        )}

      {/* Règles PA (comptes financés Apex uniquement) */}
      {account.accountType === "FUNDED" && account.propfirm === "APEX" && (
        <section className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
          <ApexPaRulesTracker
            accountSize={account.size}
            pnlEntries={account.pnlEntries}
            totalWithdrawals={totalWithdrawals}
          />
        </section>
      )}

      {/* ============================================
          SECTION 5: STATISTIQUES DE TRADING
          ============================================ */}

      {/* Statistiques de Trading */}
      <section className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
        <button
          onClick={() => setIsTradingStatsOpen(!isTradingStatsOpen)}
          className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-4 border-b border-slate-200/70 dark:border-[#1e293b]/70 hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors rounded-t-2xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 text-left">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                Statistiques de Trading
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-zinc-400" />
              {isTradingStatsOpen ? (
                <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
              ) : (
                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 text-left">
            Statistiques détaillées calculées à partir des trades importés depuis Project X ou
            Tradovate
          </p>
        </button>
        {isTradingStatsOpen && (
          <div className="p-4 sm:p-6">
            <TradingStatsComponent accountId={accountId} />
          </div>
        )}
      </section>

      {/* ============================================
          SECTION 6: HISTORIQUES
          ============================================ */}
      <div className="space-y-4 sm:space-y-6">
        {/* Historique PnL */}
        <section className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
          <button
            onClick={() => setIsPnlHistoryOpen(!isPnlHistoryOpen)}
            className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-4 border-b border-slate-200/50 dark:border-[#1e293b]/30 hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors rounded-t-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 text-left">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  Historique PnL
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-zinc-400" />
                {isPnlHistoryOpen ? (
                  <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
                ) : (
                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 text-left">
              Les dernières entrées de profit et perte
            </p>
          </button>
          {isPnlHistoryOpen && (
            <div>
              {/* Barre d'action avec bouton Ajouter */}
              <div className="px-3 sm:px-4 md:px-5 lg:px-6 py-2.5 sm:py-3 md:py-4 border-b border-slate-200/70 dark:border-[#1e293b]/70 flex items-center justify-end">
                <Button
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPnlDialogOpen(true)
                  }}
                  disabled={account.status !== "ACTIVE"}
                  className="w-full sm:w-auto text-sm sm:text-base font-semibold h-9 sm:h-10 px-3 sm:px-4"
                  title={
                    account.status !== "ACTIVE"
                      ? "Impossible d'ajouter un PNL à un compte non actif"
                      : ""
                  }
                >
                  Ajouter
                </Button>
              </div>
              {/* Liste des entrées PnL */}
              <div className="p-3 sm:p-4 md:p-5 lg:p-6">
                {account.pnlEntries.length === 0 ? (
                  <p className="text-xs sm:text-sm text-zinc-500 text-center py-8">
                    Aucune entrée PnL pour le moment
                  </p>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {/* Afficher les 5 dernières entrées */}
                    {account.pnlEntries
                      .slice(0, 5)
                      .map(
                        (entry: {
                          id: string
                          date: string
                          amount: number
                          notes?: string | null
                        }) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-slate-50/50 dark:bg-[#1e293b]/50 border border-slate-200/50 dark:border-[#1e293b]/50"
                          >
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <div
                                className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${entry.amount >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}
                              >
                                {entry.amount >= 0 ? (
                                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-500" />
                                ) : (
                                  <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 dark:text-red-500" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {format(new Date(entry.date), "d MMM yyyy", { locale: fr })}
                                </p>
                                {entry.notes && (
                                  <p className="hidden sm:block text-[10px] sm:text-xs text-slate-500 dark:text-slate-300 mt-0.5 truncate">
                                    {entry.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                              <span
                                className={`text-sm sm:text-base font-bold whitespace-nowrap ${entry.amount >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}
                              >
                                {entry.amount >= 0 ? "+" : ""}
                                {formatCurrency(entry.amount)}
                              </span>
                              <div className="flex gap-0.5 sm:gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedPnl({
                                      id: entry.id,
                                      date: entry.date,
                                      amount: entry.amount,
                                      notes: entry.notes || undefined,
                                      accountId: account.id || "",
                                    })
                                    setPnlDialogOpen(true)
                                  }}
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                >
                                  <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async () => {
                                    const confirmed = await confirm({
                                      title: "Supprimer cette entrée PnL ?",
                                      description: `Êtes-vous sûr de vouloir supprimer cette entrée PnL du ${format(new Date(entry.date), "dd/MM/yyyy", { locale: fr })} ?`,
                                      confirmText: "Supprimer",
                                      cancelText: "Annuler",
                                      variant: "destructive",
                                    })
                                    if (confirmed) {
                                      try {
                                        await deletePnl({ id: entry.id, accountId: account.id })

                                        notification.showDelete("PnL supprimé avec succès", {
                                          duration: 2500,
                                        })
                                      } catch (deleteError) {
                                        notification.handleError(
                                          deleteError,
                                          "Erreur lors de la suppression"
                                        )
                                      }
                                    }
                                  }}
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    {account.pnlEntries.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                        onClick={() => router.push("/dashboard/pnl")}
                      >
                        Voir tout ({account.pnlEntries.length})
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Historique Retraits (comptes financés uniquement) */}
        {account.accountType !== "EVAL" && (
          <section className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
            <button
              onClick={() => setIsWithdrawalHistoryOpen(!isWithdrawalHistoryOpen)}
              className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-4 border-b border-slate-200/50 dark:border-[#1e293b]/30 hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors rounded-t-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 text-left">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                    Historique Retraits
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-zinc-400" />
                  {isWithdrawalHistoryOpen ? (
                    <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
                  ) : (
                    <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
                  )}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 text-left">
                Les derniers retraits effectués
              </p>
            </button>
            {isWithdrawalHistoryOpen && (
              <div>
                {/* Barre d'action avec bouton Ajouter */}
                <div className="px-4 sm:px-5 lg:px-6 py-3 sm:py-4 border-b border-slate-200/70 dark:border-[#1e293b]/70 flex items-center justify-end">
                  <Button
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      setWithdrawalDialogOpen(true)
                    }}
                    className="w-full sm:w-auto text-sm sm:text-base font-semibold h-9 sm:h-10 px-3 sm:px-4"
                  >
                    Ajouter
                  </Button>
                </div>
                {/* Liste des retraits */}
                <div className="p-4 sm:p-5 lg:p-6">
                  {account.withdrawals.length === 0 ? (
                    <p className="text-xs sm:text-sm text-zinc-500 text-center py-8">
                      Aucun retrait pour le moment
                    </p>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {/* Afficher les 5 derniers retraits */}
                      {account.withdrawals
                        .slice(0, 5)
                        .map(
                          (withdrawal: {
                            id: string
                            date: string
                            amount: number
                            notes?: string | null
                          }) => {
                            // Calculer le montant net reçu (avec taxes pour TakeProfitTrader)
                            const isTakeProfitTrader = account.propfirm === "TAKEPROFITTRADER"
                            const netAmount = isTakeProfitTrader
                              ? withdrawal.amount * 0.8
                              : withdrawal.amount

                            return (
                              <div
                                key={withdrawal.id}
                                className="flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-slate-50/50 dark:bg-[#1e293b]/50 border border-slate-200/50 dark:border-[#1e293b]/50"
                              >
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                  <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-900 shrink-0">
                                    <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-500" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {format(new Date(withdrawal.date), "d MMM yyyy", {
                                        locale: fr,
                                      })}
                                    </p>
                                    {withdrawal.notes && (
                                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-300 mt-0.5 truncate">
                                        {withdrawal.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                  <div className="text-right">
                                    <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-500 whitespace-nowrap">
                                      {formatCurrency(withdrawal.amount)}
                                    </p>
                                    {isTakeProfitTrader && (
                                      <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-500 whitespace-nowrap">
                                        Net: {formatCurrency(netAmount)} (20% taxe)
                                      </p>
                                    )}
                                    <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-500 whitespace-nowrap">
                                      {formatCurrencyEUR(netAmount * USD_TO_EUR)}
                                    </p>
                                  </div>
                                  <div className="flex gap-0.5 sm:gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedWithdrawal({
                                          id: withdrawal.id,
                                          date: withdrawal.date,
                                          amount: withdrawal.amount,
                                          notes: withdrawal.notes || undefined,
                                          accountId: account.id || "",
                                        })
                                        setWithdrawalDialogOpen(true)
                                      }}
                                      className="h-7 w-7 sm:h-8 sm:w-8"
                                    >
                                      <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        // Suppression silencieuse sans confirmation pour une meilleure UX
                                        deleteWithdrawal({
                                          id: withdrawal.id,
                                          accountId: account.id,
                                        })
                                        // Le cache se met à jour automatiquement via l'événement WITHDRAWAL_DELETED
                                      }}
                                      className="h-7 w-7 sm:h-8 sm:w-8"
                                    >
                                      <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                        )}
                      {account.withdrawals.length > 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                          onClick={() => router.push("/dashboard/withdrawals")}
                        >
                          Voir tout ({account.withdrawals.length})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* ============================================
          SECTION 7: CALENDRIER MENSUEL
          ============================================ */}
      {account.pnlEntries.length > 0 && <MonthlyCalendar pnlEntries={account.pnlEntries} />}

      {/* ============================================
          SECTION 8: DIALOGS (MODALES)
          ============================================ */}
      <AccountFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        account={account}
        onSuccess={() => {}}
      />

      <PnlFormDialog
        open={pnlDialogOpen}
        onOpenChange={(open) => {
          setPnlDialogOpen(open)
          if (!open) setSelectedPnl(null)
        }}
        entry={selectedPnl}
        accounts={[
          {
            id: account.id,
            name: account.name,
            propfirm: account.propfirm,
            accountType: account.accountType,
            size: account.size,
            status: account.status,
          },
        ]}
        disableMultipleMode={true}
        onSuccess={() => {
          // L'événement PNL_CREATED sera émis par la mutation et déclenchera le rechargement
          // Pas besoin de faire quoi que ce soit ici, l'écouteur d'événement s'en charge
        }}
      />

      <ConfirmDialog />
      <WithdrawalFormDialog
        open={withdrawalDialogOpen}
        onOpenChange={(open) => {
          setWithdrawalDialogOpen(open)
          if (!open) setSelectedWithdrawal(null)
        }}
        withdrawal={selectedWithdrawal}
        accounts={[
          {
            id: account.id,
            name: account.name,
            accountType: account.accountType,
            propfirm: account.propfirm,
            size: account.size,
            status: account.status,
          },
        ]}
        onSuccess={() => {}}
      />
    </div>
  )
}
