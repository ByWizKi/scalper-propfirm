"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Info,
  Shield,
  AlertCircle,
  CheckCircle2,
  Wallet,
} from "lucide-react"
import { PropfirmStrategyFactory } from "@/lib/strategies/propfirm-strategy.factory"
import { getPhidiasAccountSubType } from "@/lib/phidias-account-type"
import { StatCard, useStatVariant } from "@/components/stat-card"

interface PnlEntry {
  id: string
  date: string
  amount: number
  notes?: string
}

interface Withdrawal {
  id: string
  date: string
  amount: number
  notes?: string
}

interface PhidiasFundedTrackerProps {
  accountSize: number
  accountType: string
  accountName?: string
  notes?: string | null
  pnlEntries: PnlEntry[]
  withdrawals: Withdrawal[]
}

export function PhidiasFundedTracker({
  accountSize,
  accountType,
  accountName,
  notes,
  pnlEntries,
  withdrawals,
}: PhidiasFundedTrackerProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const phidiasStrategy = PropfirmStrategyFactory.getStrategy("PHIDIAS")
  const phidiasSubType = getPhidiasAccountSubType(accountType, accountName, notes)

  // Calculs de base
  const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0)
  const currentBalance = accountSize + totalPnl - totalWithdrawals

  // Calculer le buffer EOD (seuil où le drawdown EOD s'arrête)
  const getEodBuffer = (size: number): number => {
    if (size === 50000) return 50100 // 50K : 50 100$
    if (size === 100000) return 100100 // 100K : 100 100$
    if (size === 150000) return 150100 // 150K : 150 100$
    return 0
  }

  const eodBuffer = getEodBuffer(accountSize)
  const hasReachedBuffer = currentBalance >= eodBuffer

  // Calculer le drawdown EOD actuel (trailing stop)
  // Pour les comptes financés Phidias, le drawdown EOD s'arrête au buffer
  const calculateEodDrawdown = () => {
    if (phidiasSubType === "LIVE" || (phidiasSubType === "CASH" && accountSize === 25000)) {
      return null // Pas de drawdown EOD pour LIVE et 25K Static CASH
    }

    // Pour les comptes CASH 50K, 100K, 150K
    // Le drawdown EOD est calculé depuis le pic de profit EOD
    // Mais il s'arrête au buffer (50 100$, 100 100$, 150 100$)

    // Trouver le pic de profit EOD (le plus haut solde à la fin d'une journée)
    const dailyBalances: Record<string, number> = {}
    let runningBalance = accountSize

    pnlEntries
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((entry) => {
        const dateKey = entry.date.split("T")[0]
        runningBalance += entry.amount
        // Garder le solde le plus haut pour chaque jour (EOD)
        if (!dailyBalances[dateKey] || runningBalance > dailyBalances[dateKey]) {
          dailyBalances[dateKey] = runningBalance
        }
      })

    // Trouver le pic EOD le plus haut (trailing)
    const eodPeaks = Object.values(dailyBalances)
    const maxEodPeak = eodPeaks.length > 0 ? Math.max(...eodPeaks) : accountSize

    // Le drawdown maximum autorisé depuis le pic
    const maxEodDrawdown = accountSize === 50000 ? 2500 : accountSize === 100000 ? 3000 : 4500

    // Si le buffer est atteint, le pic EOD ne peut plus descendre en dessous du buffer
    // Le trailing s'arrête au buffer
    const effectivePeak = hasReachedBuffer
      ? Math.max(maxEodPeak, eodBuffer)
      : maxEodPeak

    const effectiveDrawdown = effectivePeak - currentBalance
    const isSafe = effectiveDrawdown <= maxEodDrawdown

    return {
      peak: effectivePeak,
      drawdown: effectiveDrawdown,
      maxDrawdown: maxEodDrawdown,
      isSafe,
      canModify: !hasReachedBuffer, // Peut modifier seulement si buffer pas atteint
    }
  }

  const eodDrawdownInfo = calculateEodDrawdown()

  // Calculer la cohérence (règle des 30% pour CASH uniquement)
  const calculateConsistency = () => {
    if (phidiasSubType !== "CASH" || accountSize === 25000) {
      return null // Pas de règle de cohérence pour LIVE et 25K Static CASH
    }

    // Grouper les PnL par jour
    const dailyPnl: Record<string, number> = {}
    pnlEntries.forEach((entry) => {
      const dateKey = entry.date.split("T")[0]
      dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
    })

    const dailyPnlValues = Object.values(dailyPnl).filter((v) => v > 0)
    if (dailyPnlValues.length === 0 || totalPnl <= 0) {
      return {
        biggestDay: 0,
        percentage: 0,
        isCompliant: true,
        requiredTotal: 0,
      }
    }

    const biggestDay = Math.max(...dailyPnlValues)
    const percentage = (biggestDay / totalPnl) * 100
    const isCompliant = percentage <= 30
    const requiredTotal = isCompliant ? totalPnl : Math.ceil(biggestDay / 0.3)

    return {
      biggestDay,
      percentage,
      isCompliant,
      requiredTotal,
    }
  }

  const consistencyInfo = calculateConsistency()

  // Calculer le montant disponible pour retrait
  const normalizedPnlEntries = pnlEntries.map((entry) => ({
    date: new Date(entry.date),
    amount: entry.amount,
  }))

  const availableForWithdrawal = phidiasStrategy.calculateAvailableForWithdrawal(
    accountSize,
    totalPnl,
    totalWithdrawals,
    normalizedPnlEntries,
    accountType,
    accountName,
    notes
  )

  const withdrawalRules = phidiasStrategy.getWithdrawalRules(accountSize, accountType, accountName, notes)
  const taxRate = withdrawalRules.taxRate || 0.2
  const netAvailable = availableForWithdrawal * (1 - taxRate)

  // Seuils et limites selon la taille
  const getAccountLimits = () => {
    if (accountSize === 50000) {
      return {
        minThreshold: 52600,
        minBalanceAfterWithdrawal: 50100,
        maxWithdrawalPerPeriod: 2000,
        minDailyProfit: 150,
      }
    }
    if (accountSize === 100000) {
      return {
        minThreshold: 103700,
        minBalanceAfterWithdrawal: 100100,
        maxWithdrawalPerPeriod: 2500,
        minDailyProfit: 200,
      }
    }
    if (accountSize === 150000) {
      return {
        minThreshold: 154500,
        minBalanceAfterWithdrawal: 150100,
        maxWithdrawalPerPeriod: 2750,
        minDailyProfit: 250,
      }
    }
    return null
  }

  const accountLimits = getAccountLimits()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tableau de bord Phidias - Compte {phidiasSubType}</CardTitle>
        <CardDescription>
          Suivi complet de votre compte {phidiasSubType} {formatCurrency(accountSize)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cartes principales - Balance, PnL, Retraits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Balance actuelle */}
          <StatCard
            title="Balance actuelle"
            value={formatCurrency(currentBalance)}
            icon={Wallet}
            variant={currentBalance >= accountSize ? "success" : "default"}
            description={currentBalance >= accountSize ? `+${formatCurrency(currentBalance - accountSize)}` : formatCurrency(currentBalance - accountSize)}
            size="lg"
            className="min-w-0"
          />

          {/* PnL Total */}
          <StatCard
            title="PnL Total"
            value={formatCurrency(totalPnl)}
            icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
            variant={useStatVariant(totalPnl)}
            description={`${pnlEntries.length} entrée${pnlEntries.length > 1 ? "s" : ""}`}
            size="lg"
            className="min-w-0"
          />

          {/* Retraits */}
          <StatCard
            title="Retraits"
            value={formatCurrency(totalWithdrawals)}
            icon={DollarSign}
            variant="neutral"
            description={`${withdrawals.length} retrait${withdrawals.length > 1 ? "s" : ""}`}
            size="lg"
            className="min-w-0"
          />

          {/* Retrait disponible */}
          {phidiasSubType !== "EVAL" && (
            <StatCard
              title="Disponible (net)"
              value={formatCurrency(netAvailable)}
              icon={DollarSign}
              variant={netAvailable > 0 ? "success" : "neutral"}
              description={`Brut: ${formatCurrency(availableForWithdrawal)}`}
              secondaryText={`Taxe ${Math.round(taxRate * 100)}%: -${formatCurrency(availableForWithdrawal * taxRate)}`}
              size="lg"
              className="min-w-0"
            />
          )}
        </div>

        {/* Drawdown EOD et Buffer (seulement pour CASH 50K+) */}
        {eodDrawdownInfo && accountLimits && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              title="Pic EOD"
              value={formatCurrency(eodDrawdownInfo.peak)}
              icon={TrendingUp}
              variant="success"
              description={hasReachedBuffer ? "Buffer atteint" : "Point de référence"}
              size="md"
              className="min-w-0"
            />
            <StatCard
              title="Drawdown EOD"
              value={`${formatCurrency(eodDrawdownInfo.drawdown)} / ${formatCurrency(eodDrawdownInfo.maxDrawdown)}`}
              icon={Shield}
              variant={eodDrawdownInfo.isSafe ? "success" : "danger"}
              description={eodDrawdownInfo.isSafe ? "Dans les limites" : "Limite dépassée"}
              size="md"
              className="min-w-0"
            />
            <StatCard
              title="Buffer EOD"
              value={formatCurrency(eodBuffer)}
              icon={CheckCircle2}
              variant={hasReachedBuffer ? "success" : "neutral"}
              description={hasReachedBuffer ? "Verrouillé ✓" : "Non atteint"}
              size="md"
              className="min-w-0"
            />
          </div>
        )}

        {/* Cohérence (30%) - Seulement pour CASH 50K+ */}
        {consistencyInfo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <StatCard
              title="Meilleur jour"
              value={formatCurrency(consistencyInfo.biggestDay)}
              icon={TrendingUp}
              variant="success"
              description="Plus haut PnL quotidien"
              size="md"
              className="min-w-0"
            />
            <StatCard
              title="Cohérence (30%)"
              value={`${consistencyInfo.percentage.toFixed(1)}%`}
              icon={consistencyInfo.isCompliant ? CheckCircle2 : AlertCircle}
              variant={consistencyInfo.isCompliant ? "success" : "warning"}
              description={consistencyInfo.isCompliant ? "Règle respectée" : `Requis: ${formatCurrency(consistencyInfo.requiredTotal)}`}
              secondaryText={`Limite: 30%`}
              size="md"
              className="min-w-0"
            />
          </div>
        )}

        {/* Règles spécifiques selon le type */}
        {accountLimits && phidiasSubType === "CASH" && (
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 sm:p-5 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Règles de retrait
              </p>
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Seuil minimum requis</span>
                <span className={`font-semibold ${currentBalance >= accountLimits.minThreshold ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {formatCurrency(accountLimits.minThreshold)}
                  {currentBalance >= accountLimits.minThreshold && " ✓"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Solde min après retrait</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(accountLimits.minBalanceAfterWithdrawal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Max par période</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(accountLimits.maxWithdrawalPerPeriod)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Min PnL/jour (cycle)</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(accountLimits.minDailyProfit)}
                </span>
              </div>
            </div>
          </div>
        )}

        {phidiasSubType === "LIVE" && (
          <div className="bg-emerald-50 dark:bg-emerald-950 rounded-xl p-4 sm:p-5 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Règles de retrait LIVE
              </p>
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Retrait minimum</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">500$</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Solde minimum</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(accountSize + 100)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Fréquence</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">Chaque jour</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

