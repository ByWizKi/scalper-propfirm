/* eslint-disable */
"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  CheckCircle2,
} from "lucide-react"
import { StatCard, useStatVariant } from "@/components/stat-card"
import { useAccountCache } from "@/hooks/use-data-cache"
import { useDeleteAccountMutation, useUpdateAccountMutation } from "@/hooks/use-mutation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { MonthlyCalendar } from "@/components/monthly-calendar"
import { AccountRulesTracker } from "@/components/account-rules-tracker"
import { TradingCyclesTracker } from "@/components/trading-cycles-tracker"
import { ApexPaRulesTracker } from "@/components/apex-pa-rules-tracker"
import { PhidiasFundedTracker } from "@/components/phidias-funded-tracker"
import { PropfirmStrategyFactory } from "@/lib/strategies/propfirm-strategy.factory"
import { Gift, CreditCard, Info } from "lucide-react"
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
  ACTIVE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  VALIDATED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  ARCHIVED: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
}

export default function AccountDetailPage() {
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string

  // Utiliser le cache avec invalidation automatique
  const { data: account, isLoading } = useAccountCache(accountId)

  // Utiliser les mutations
  const { mutate: deleteAccount } = useDeleteAccountMutation()
  const { mutate: updateAccount } = useUpdateAccountMutation()

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

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) {
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
    if (!confirm("Êtes-vous sûr de vouloir valider ce compte ? Il passera en statut VALIDATED.")) {
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
  const totalPnl = useMemo(
    () =>
      account?.pnlEntries?.reduce(
        (sum: number, entry: { amount: number }) => sum + entry.amount,
        0
      ) || 0,
    [account?.pnlEntries]
  )

  const totalWithdrawals = useMemo(
    () =>
      account?.withdrawals?.reduce((sum: number, w: { amount: number }) => sum + w.amount, 0) || 0,
    [account?.withdrawals]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Chargement...</p>
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

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header avec informations principales */}
      <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          {/* Bouton retour et titre */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/accounts")}
              className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate">
                {account.name}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {PROPFIRM_LABELS[account.propfirm]} • {formatCurrency(account.size)}
              </p>
            </div>
          </div>

          {/* Informations principales en cartes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Balance actuelle */}
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
              size="lg"
              className="min-w-0"
            />

            {/* PnL Total */}
            <StatCard
              title="PnL Total"
              value={formatCurrency(totalPnl)}
              icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
              variant={useStatVariant(totalPnl)}
              description={`${tradingDays} jour${tradingDays > 1 ? "s" : ""} de trading`}
              size="lg"
              className="min-w-0"
            />

            {/* Retraits (si financé) */}
            {account.accountType === "FUNDED" && (
              <StatCard
                title="Retraits"
                value={formatCurrency(totalWithdrawals)}
                icon={DollarSign}
                variant="neutral"
                description={`${account.withdrawals.length} retrait${account.withdrawals.length > 1 ? "s" : ""}`}
                size="lg"
                className="min-w-0"
              />
            )}

            {/* Type et Statut */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-2">Type</p>
              <div className="flex flex-col gap-1.5">
                <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {ACCOUNT_TYPE_LABELS[account.accountType]}
                </p>
                {phidiasSubType && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 w-fit">
                    {getPhidiasAccountSubTypeLabel(phidiasSubType)}
                  </span>
                )}
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold w-fit ${STATUS_COLORS[account.status]}`}
                >
                  {STATUS_LABELS[account.status]}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70">
            {account.accountType === "EVAL" &&
              account.status === "ACTIVE" &&
              isEligibleForValidation && (
                <Button
                  onClick={handleValidate}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-sm sm:text-base font-semibold h-11 sm:h-12"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Valider le compte</span>
                  <span className="sm:hidden">Valider</span>
                </Button>
              )}
            <Button
              variant="outline"
              size="lg"
              onClick={() => setEditDialogOpen(true)}
              className="text-sm sm:text-base font-semibold h-11 sm:h-12"
            >
              <Edit className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Modifier</span>
              <span className="sm:hidden">Éditer</span>
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={handleDelete}
              className="text-sm sm:text-base font-semibold h-11 sm:h-12"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Supprimer
            </Button>
          </div>
        </div>
      </section>

      {/* Informations complémentaires */}
      <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-200/70 dark:border-zinc-800/70">
          <h2 className="text-xs sm:text-sm md:text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Informations complémentaires
          </h2>
        </div>
        <div className="p-4 sm:p-5 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-2 font-medium">
                Investissement total
              </p>
              <p className="text-sm sm:text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {formatCurrency(totalInvested)}
              </p>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {formatCurrencyEUR(totalInvested * USD_TO_EUR)}
              </p>
              {account.linkedEval && (
                <div className="mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    Compte: {formatCurrency(account.pricePaid)}
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    Évaluation: {formatCurrency(account.linkedEval.pricePaid)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-2 font-medium">
                Date de création
              </p>
              <p className="text-xs sm:text-sm md:text-base font-bold text-zinc-900 dark:text-zinc-50">
                {format(new Date(account.createdAt), "d MMMM yyyy", { locale: fr })}
              </p>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {format(new Date(account.createdAt), "HH:mm", { locale: fr })}
              </p>
            </div>

            {account.linkedEval && (
              <div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-2 font-medium">
                  Compte d&apos;évaluation lié
                </p>
                <p className="text-xs sm:text-sm md:text-base font-semibold text-zinc-900 dark:text-zinc-50 wrap-break-word">
                  {account.linkedEval.name}
                </p>
                <p className="text-xs sm:text-sm md:text-base font-bold text-zinc-700 dark:text-zinc-300 mt-1">
                  {formatCurrency(account.linkedEval.pricePaid)}
                </p>
              </div>
            )}
          </div>

          {account.notes && (
            <div className="mt-6 pt-6 border-t border-zinc-200/70 dark:border-zinc-800/70">
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-2 font-medium">
                Notes
              </p>
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap wrap-break-word bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 sm:p-4">
                {account.notes}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Règles de validation */}
      {account.accountType === "EVAL" && (
        <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
          <AccountRulesTracker
            accountSize={account.size}
            accountType={account.accountType}
            propfirm={account.propfirm}
            pnlEntries={account.pnlEntries}
            onEligibilityChange={setIsEligibleForValidation}
          />
        </section>
      )}

      {/* Tableau de bord Phidias pour comptes financés */}
      {account.accountType === "FUNDED" && account.propfirm === "PHIDIAS" && (
        <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
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

      {/* Cycles de trading pour autres comptes financés */}
      {account.accountType === "FUNDED" &&
        account.propfirm !== "APEX" &&
        account.propfirm !== "PHIDIAS" && (
          <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
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
          </section>
        )}

      {/* Règles PA pour comptes financés Apex */}
      {account.accountType === "FUNDED" && account.propfirm === "APEX" && (
        <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
          <ApexPaRulesTracker accountSize={account.size} pnlEntries={account.pnlEntries} />
        </section>
      )}

      {/* Historique PnL et Retraits */}
      <div
        className={`grid gap-4 sm:gap-6 ${account.accountType === "EVAL" ? "md:grid-cols-1" : "md:grid-cols-2"}`}
      >
        {/* Historique PnL */}
        <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
          <div className="px-5 sm:px-6 py-4 border-b border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xs sm:text-sm md:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Historique PnL
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                Les dernières entrées de profit et perte
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setPnlDialogOpen(true)}
              disabled={account.status !== "ACTIVE"}
              className="text-sm sm:text-base font-semibold h-11 sm:h-12"
              title={
                account.status !== "ACTIVE"
                  ? "Impossible d'ajouter un PNL à un compte non actif"
                  : ""
              }
            >
              Ajouter
            </Button>
          </div>
          <div className="p-4 sm:p-5 lg:p-6">
            {account.pnlEntries.length === 0 ? (
              <p className="text-xs sm:text-sm text-zinc-500 text-center py-8">
                Aucune entrée PnL pour le moment
              </p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
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
                        className="flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div
                            className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${entry.amount >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}
                          >
                            {entry.amount >= 0 ? (
                              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                              {format(new Date(entry.date), "d MMM yyyy", { locale: fr })}
                            </p>
                            {entry.notes && (
                              <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <span
                            className={`text-xs sm:text-sm md:text-base font-bold whitespace-nowrap ${entry.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
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
                                if (confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) {
                                  try {
                                    const res = await fetch(`/api/pnl/${entry.id}`, {
                                      method: "DELETE",
                                    })
                                    if (!res.ok) throw new Error("Erreur lors de la suppression")
                                    window.location.reload()
                                  } catch (_error) {
                                    alert("Erreur lors de la suppression de l'entrée PnL")
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
        </section>

        {/* Historique Retraits - Seulement pour les comptes financés */}
        {account.accountType !== "EVAL" && (
          <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
            <div className="px-5 sm:px-6 py-4 border-b border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xs sm:text-sm md:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Historique Retraits
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Les derniers retraits effectués
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setWithdrawalDialogOpen(true)}
                className="text-sm sm:text-base font-semibold h-11 sm:h-12"
              >
                Ajouter
              </Button>
            </div>
            <div className="p-4 sm:p-5 lg:p-6">
              {account.withdrawals.length === 0 ? (
                <p className="text-xs sm:text-sm text-zinc-500 text-center py-8">
                  Aucun retrait pour le moment
                </p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
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
                            className="flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50"
                          >
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-900 shrink-0">
                                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                  {format(new Date(withdrawal.date), "d MMM yyyy", { locale: fr })}
                                </p>
                                {withdrawal.notes && (
                                  <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                                    {withdrawal.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                              <div className="text-right">
                                <p className="text-xs sm:text-sm md:text-base font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                                  {formatCurrency(withdrawal.amount)}
                                </p>
                                {isTakeProfitTrader && (
                                  <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 whitespace-nowrap">
                                    Net: {formatCurrency(netAmount)} (20% taxe)
                                  </p>
                                )}
                                <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 whitespace-nowrap">
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
                                  onClick={async () => {
                                    if (
                                      confirm("Êtes-vous sûr de vouloir supprimer ce retrait ?")
                                    ) {
                                      try {
                                        const res = await fetch(
                                          `/api/withdrawals/${withdrawal.id}`,
                                          {
                                            method: "DELETE",
                                          }
                                        )
                                        if (!res.ok)
                                          throw new Error("Erreur lors de la suppression")
                                        window.location.reload()
                                      } catch (_error) {
                                        alert("Erreur lors de la suppression du retrait")
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
          </section>
        )}
      </div>

      {/* Vue calendrier mensuelle */}
      {account.pnlEntries.length > 0 && (
        <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
          <MonthlyCalendar pnlEntries={account.pnlEntries} />
        </section>
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
          <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
            <div className="px-4 sm:px-5 py-3 sm:py-4">
              <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3 sm:mb-4">
                Récapitulatif des règles
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {/* Règles du compte */}
                {accountRules && account.accountType === "EVAL" && (
                  <>
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                      <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                        Objectif de profit
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50 ml-2 shrink-0">
                        {formatCurrency(accountRules.profitTarget)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                      <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                        Drawdown max
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50 ml-2 shrink-0">
                        {formatCurrency(accountRules.maxDrawdown)}
                      </span>
                    </div>
                    {showDailyLossLimit && (
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                          Perte journalière max
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50 ml-2 shrink-0">
                          {formatCurrency(accountRules.dailyLossLimit)}
                        </span>
                      </div>
                    )}
                    {accountRules.consistencyRule > 0 && (
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                          Cohérence
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50 ml-2 shrink-0">
                          {accountRules.consistencyRule}%
                        </span>
                      </div>
                    )}
                    {accountRules.minTradingDays && accountRules.minTradingDays > 0 && (
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                          Jours min
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50 ml-2 shrink-0">
                          {accountRules.minTradingDays}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Règles de retrait */}
                {account.accountType === "FUNDED" && withdrawalRules && (
                  <>
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                      <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                        Taxe
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50 ml-2 shrink-0">
                        {Math.round(withdrawalRules.taxRate * 100)}%
                      </span>
                    </div>
                    {withdrawalRules.requiresCycles && withdrawalRules.cycleRequirements && (
                      <>
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                          <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                            Cycles requis
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50 ml-2 shrink-0">
                            {withdrawalRules.cycleRequirements.daysPerCycle} jours
                          </span>
                        </div>
                        {withdrawalRules.cycleRequirements.minDailyProfit > 0 && (
                          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                            <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                              PnL min/jour
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50 ml-2 shrink-0">
                              {formatCurrency(withdrawalRules.cycleRequirements.minDailyProfit)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {withdrawalRules.hasBuffer && (
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                          Buffer requis
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400 ml-2 shrink-0">
                          Oui
                        </span>
                      </div>
                    )}
                    {!withdrawalRules.requiresCycles && !withdrawalRules.hasBuffer && (
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                          Retrait
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400 ml-2 shrink-0">
                          Libre
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        )
      })()}

      {/* Dialogs */}
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
        onSuccess={() => {
          // Rafraîchir les données après modification/ajout
          window.location.reload()
        }}
      />

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
          },
        ]}
        onSuccess={() => {}}
      />
    </div>
  )
}
