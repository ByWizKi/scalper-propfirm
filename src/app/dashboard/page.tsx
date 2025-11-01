"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, TrendingUp, DollarSign, Target } from "lucide-react"
import { ExpensesCalendar } from "@/components/expenses-calendar"
import { WithdrawalsCalendar } from "@/components/withdrawals-calendar"
import { StatCard, useStatVariant } from "@/components/stat-card"
import { useDashboardStatsCache } from "@/hooks/use-data-cache"
import { calculateTotalNetWithdrawals } from "@/lib/withdrawal-utils"

interface Stats {
  totalAccounts: number
  activeAccounts: number
  fundedAccounts: number
  totalInvested: number
  totalPnl: number
  totalWithdrawals: number
  netProfit: number
  recentPnl: Array<{ date: string; amount: number }>
}

interface Account {
  id: string
  name: string
  createdAt: string
  pricePaid: number
}

interface Withdrawal {
  id: string
  date: string
  amount: number
  notes?: string
  account: {
    propfirm: string
  }
}

export default function DashboardPage() {
  // Utilisation du hook de cache avec invalidation automatique
  const { data, isLoading } = useDashboardStatsCache()

  const stats = data?.stats
  const accounts = data?.accounts || []
  const withdrawals = data?.withdrawals || []

  // Calculer le total net des retraits (après taxes)
  const totalNetWithdrawals = calculateTotalNetWithdrawals(withdrawals)

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
          variant={useStatVariant(totalNetWithdrawals - (stats?.totalInvested || 0))}
          secondaryText={formatCurrencyEUR(
            (totalNetWithdrawals - (stats?.totalInvested || 0)) * USD_TO_EUR
          )}
          description="Retraits nets - Investi"
        />
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
