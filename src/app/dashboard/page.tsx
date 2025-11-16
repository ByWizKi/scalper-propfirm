"use client"

import { useMemo, useCallback } from "react"
import { StatCard, useStatVariant } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, TrendingUp, DollarSign, Target, Percent, Award, Clock } from "lucide-react"
import { ExpensesCalendar } from "@/components/expenses-calendar"
import { WithdrawalsCalendar } from "@/components/withdrawals-calendar"
import { useDashboardStatsCache } from "@/hooks/use-data-cache"
import { calculateTotalNetWithdrawals } from "@/lib/withdrawal-utils"

export default function DashboardPage() {
  // Utilisation du hook de cache avec invalidation automatique
  const { data, isLoading } = useDashboardStatsCache()

  const stats = data?.stats

  // ⚡ MEMOIZATION: Memoize arrays
  const accounts = useMemo(() => data?.accounts || [], [data?.accounts])
  const withdrawals = useMemo(() => data?.withdrawals || [], [data?.withdrawals])

  // Taux de change USD vers EUR
  const USD_TO_EUR = 0.92

  // ⚡ MEMOIZATION: Calculer le total net des retraits (après taxes)
  const totalNetWithdrawals = useMemo(() => {
    return calculateTotalNetWithdrawals(withdrawals)
  }, [withdrawals])

  // ⚡ MEMOIZATION: Calculer le variant
  const differenceVariant = useStatVariant(totalNetWithdrawals - (stats?.totalInvested || 0))
  const globalRoiVariant = useStatVariant(stats?.globalRoi || 0)
  const monthlyPnlVariant = useStatVariant(stats?.monthlyPnl || 0)

  // ⚡ MEMOIZATION: Fonctions de formatage
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Chargement des statistiques...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Tableau de bord
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1 sm:mt-2">
          Vue d&apos;ensemble de vos comptes propfirm
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
        <StatCard
          title="Total Comptes"
          value={stats?.totalAccounts || 0}
          icon={Wallet}
          variant="neutral"
          description={`${stats?.activeAccounts || 0} actifs • ${stats?.fundedAccounts || 0} financés`}
        />

        <StatCard
          title="Investi Total"
          value={formatCurrency(stats?.totalInvested || 0)}
          icon={Target}
          variant="neutral"
          secondaryText={formatCurrencyEUR((stats?.totalInvested || 0) * USD_TO_EUR)}
          description="Coût des comptes"
        />

        <StatCard
          title="Retraits Nets"
          value={formatCurrency(totalNetWithdrawals)}
          icon={DollarSign}
          variant="success"
          secondaryText={formatCurrencyEUR(totalNetWithdrawals * USD_TO_EUR)}
          description="Retraits nets après taxes"
        />

        <StatCard
          title="Bilan"
          value={formatCurrency(totalNetWithdrawals - (stats?.totalInvested || 0))}
          icon={TrendingUp}
          variant={differenceVariant}
          secondaryText={formatCurrencyEUR(
            (totalNetWithdrawals - (stats?.totalInvested || 0)) * USD_TO_EUR
          )}
          description="Retraits nets - Investi"
        />
      </div>

      {/* Nouvelles statistiques */}
      <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <StatCard
              title="ROI Global"
              value={`${(stats?.globalRoi || 0).toFixed(1)}%`}
              icon={Percent}
              variant={globalRoiVariant}
              description="Retour sur investissement global"
              secondaryText={`${stats?.validatedEval || 0} validées • ${stats?.failedEval || 0} échouées`}
            />
            <div className="rounded-lg border border-blue-200/70 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/30 p-3">
              <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300">
                Mesure la rentabilité réelle basée sur les retraits nets effectués (après taxes).
                Compare les retraits nets à votre investissement initial.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <StatCard
              title="Taux de réussite évaluations"
              value={`${(stats?.evalSuccessRate || 0).toFixed(1)}%`}
              icon={Award}
              variant={stats?.evalSuccessRate && stats.evalSuccessRate >= 50 ? "success" : "danger"}
              description="Pourcentage d'évaluations validées"
              secondaryText={`${stats?.validatedEval || 0} validées sur ${(stats?.validatedEval || 0) + (stats?.failedEval || 0)} terminées`}
            />
            <div className="rounded-lg border border-blue-200/70 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/30 p-3">
              <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300">
                Pourcentage d&apos;évaluations validées parmi celles terminées (validées ou
                échouées). Les comptes encore actifs ne sont pas comptabilisés.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <StatCard
              title="Durée moyenne validation"
              value={stats?.avgValidationDays ? `${stats.avgValidationDays} jours` : "—"}
              icon={Clock}
              variant="neutral"
              description="Temps moyen pour valider une évaluation"
              secondaryText={
                stats?.avgValidationDays
                  ? `Basé sur ${stats.validatedEval || 0} validation${(stats.validatedEval || 0) > 1 ? "s" : ""}`
                  : "Aucune validation"
              }
            />
            <div className="rounded-lg border border-blue-200/70 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/30 p-3">
              <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300">
                Temps moyen (en jours) entre la création d&apos;un compte d&apos;évaluation et sa
                validation. Aide à estimer le temps nécessaire pour valider une évaluation.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <StatCard
              title="PnL Mensuel"
              value={formatCurrency(stats?.monthlyPnl || 0)}
              icon={TrendingUp}
              variant={monthlyPnlVariant}
              description="Performance des 30 derniers jours"
              secondaryText={formatCurrencyEUR((stats?.monthlyPnl || 0) * USD_TO_EUR)}
            />
            <div className="rounded-lg border border-blue-200/70 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/30 p-3">
              <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300">
                Somme des profits et pertes sur les 30 derniers jours pour les comptes actifs
                financés uniquement. Les entrées buffer sont exclues.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-1 mb-6 sm:mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Bilan Financier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                  Total Retraits Nets
                </span>
                <div className="text-right min-w-0">
                  <div className="font-medium text-green-600 text-sm sm:text-base truncate">
                    {formatCurrency(totalNetWithdrawals)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-green-600 truncate">
                    {formatCurrencyEUR(totalNetWithdrawals * USD_TO_EUR)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                  Total Investi
                </span>
                <div className="text-right min-w-0">
                  <div className="font-medium text-red-600 text-sm sm:text-base truncate">
                    -{formatCurrency(stats?.totalInvested || 0)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-red-600 truncate">
                    {formatCurrencyEUR((stats?.totalInvested || 0) * USD_TO_EUR)}
                  </div>
                </div>
              </div>
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 sm:pt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base sm:text-lg font-medium">Différence</span>
                  <div className="text-right min-w-0">
                    <div
                      className={`text-xl sm:text-2xl font-bold truncate ${totalNetWithdrawals - (stats?.totalInvested || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(totalNetWithdrawals - (stats?.totalInvested || 0))}
                    </div>
                    <div
                      className={`text-[10px] sm:text-xs truncate ${totalNetWithdrawals - (stats?.totalInvested || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrencyEUR(
                        (totalNetWithdrawals - (stats?.totalInvested || 0)) * USD_TO_EUR
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-zinc-500 mt-2 text-right">
                  {totalNetWithdrawals - (stats?.totalInvested || 0) >= 0
                    ? "Vous êtes en profit"
                    : "Vous êtes en perte"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendriers */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 mb-6 sm:mb-8">
        <ExpensesCalendar expenses={accounts} />
        <WithdrawalsCalendar withdrawals={withdrawals} />
      </div>

      {stats?.totalAccounts === 0 && (
        <Card className="mt-8">
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun compte pour le moment</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Commencez par ajouter votre premier compte propfirm
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
