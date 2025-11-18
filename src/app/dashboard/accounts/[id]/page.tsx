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
    }
    return drawdownConfig[propfirm]?.[size] || 0
  }

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

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/accounts")}
              className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-zinc-50 truncate">
                {account.name}
              </h1>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1 truncate">
                {PROPFIRM_LABELS[account.propfirm]} • {formatCurrency(account.size)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

      {/* Informations du compte */}
      <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-200/70 dark:border-zinc-800/70">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Informations du compte
          </h2>
        </div>
        <div className="p-4 sm:p-5 lg:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-1">Type</p>
              <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {ACCOUNT_TYPE_LABELS[account.accountType]}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-1">Statut</p>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${STATUS_COLORS[account.status]}`}
              >
                {STATUS_LABELS[account.status]}
              </span>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                {account.linkedEval ? "Total investi" : "Prix payé"}
              </p>
              <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {formatCurrency(totalInvested)}
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5">
                {formatCurrencyEUR(totalInvested * USD_TO_EUR)}
              </p>
              {account.linkedEval && (
                <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 break-words">
                  Compte: {formatCurrency(account.pricePaid)} + Eval:{" "}
                  {formatCurrency(account.linkedEval.pricePaid)}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                Date de création
              </p>
              <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {format(new Date(account.createdAt), "d MMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          {account.linkedEval && (
            <div className="mt-4 pt-4 border-t border-zinc-200/70 dark:border-zinc-800/70">
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Compte d&apos;évaluation lié
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50 truncate min-w-0 flex-1">
                  {account.linkedEval.name}
                </p>
                <div className="text-right shrink-0">
                  <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(account.linkedEval.pricePaid)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-zinc-500">
                    {formatCurrencyEUR(account.linkedEval.pricePaid * USD_TO_EUR)}
                  </p>
                </div>
              </div>
            </div>
          )}
          {account.notes && (
            <div className="mt-4 pt-4 border-t border-zinc-200/70 dark:border-zinc-800/70">
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-2">Notes</p>
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
                {account.notes}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Statistiques */}
      <div
        className={`grid gap-3 sm:gap-4 md:gap-6 ${account.accountType === "EVAL" ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}
      >
        <StatCard
          title="PnL Total"
          value={formatCurrency(totalPnl)}
          icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
          variant={useStatVariant(totalPnl)}
          description={`${tradingDays} jour${tradingDays > 1 ? "s" : ""} de trading`}
          className="min-w-0"
        />

        {account.accountType !== "EVAL" && (
          <StatCard
            title="Retraits"
            value={formatCurrency(totalWithdrawals)}
            icon={DollarSign}
            variant="success"
            secondaryText={formatCurrencyEUR(totalWithdrawals * USD_TO_EUR)}
            description={`${account.withdrawals.length} retrait${account.withdrawals.length > 1 ? "s" : ""}`}
            className="min-w-0"
          />
        )}

        <StatCard
          title="Meilleur Jour"
          value={formatCurrency(bestDay)}
          icon={TrendingUp}
          variant="success"
          description="Plus haut PnL quotidien"
          className="min-w-0"
        />

        <StatCard
          title="Moyenne/Jour"
          value={formatCurrency(avgPerDay)}
          icon={Calendar}
          variant={useStatVariant(avgPerDay)}
          description="PnL moyen par jour"
          className="min-w-0"
        />
      </div>

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

      {/* Cycles de trading pour comptes financés */}
      {account.accountType === "FUNDED" && account.propfirm !== "APEX" && (
        <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
          <TradingCyclesTracker
            pnlEntries={account.pnlEntries}
            withdrawals={account.withdrawals}
            accountSize={account.size}
            propfirm={account.propfirm}
            maxDrawdown={getMaxDrawdown(account.propfirm, account.size)}
          />
        </section>
      )}

      {/* Règles PA pour comptes financés Apex */}
      {account.accountType === "FUNDED" && account.propfirm === "APEX" && (
        <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
          <ApexPaRulesTracker accountSize={account.size} pnlEntries={account.pnlEntries} />
        </section>
      )}

      {/* Vue calendrier mensuelle */}
      {account.pnlEntries.length > 0 && (
        <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
          <MonthlyCalendar pnlEntries={account.pnlEntries} />
        </section>
      )}

      {/* PnL et Retraits */}
      <div
        className={`grid gap-4 sm:gap-6 ${account.accountType === "EVAL" ? "md:grid-cols-1" : "md:grid-cols-2"}`}
      >
        {/* Historique PnL */}
        <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
          <div className="px-5 sm:px-6 py-4 border-b border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
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
                            className={`text-sm sm:text-base font-bold whitespace-nowrap ${entry.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
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
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
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
                                <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
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
