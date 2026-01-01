"use client"

import * as React from "react"
import {
  AlertTriangle,
  TrendingUp,
  Shield,
  Calendar,
  FileText,
  Scale,
  Crosshair,
  DollarSign,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { PropfirmStrategyFactory } from "@/lib/strategies/propfirm-strategy.factory"
import { PropfirmType } from "@/types/account.types"
import { StatCard } from "@/components/stat-card"

interface PnlEntry {
  id: string
  date: string
  amount: number
  notes?: string
}

interface ApexPaRulesTrackerProps {
  accountSize: number
  pnlEntries: PnlEntry[]
  totalWithdrawals?: number
}

/**
 * Composant pour tracker les règles des comptes PA (Performance Accounts) Apex
 *
 * Règles principales:
 * 1. Contract Scaling Rule (moitié des contrats jusqu'au safety net)
 * 2. 30% Negative P&L Rule (MAE) - Maximum Adverse Excursion
 * 3. 5:1 Risk-Reward Ratio Rule
 * 4. Hedging Rule (interdit)
 * 5. Consistency Rule (30% Windfall) - Pour les payouts
 * 6. Règles de Retrait (safety net + cycles de 8 jours + 5 jours à +$50)
 */
export function ApexPaRulesTracker({
  accountSize,
  pnlEntries,
  totalWithdrawals = 0,
}: ApexPaRulesTrackerProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Configuration selon la taille du compte
  const getMaxDrawdown = (size: number): number => {
    const drawdownConfig: Record<number, number> = {
      25000: 1500,
      50000: 2500,
      75000: 2750,
      100000: 3000,
      150000: 5000,
      250000: 6500,
      300000: 7500,
    }
    return drawdownConfig[size] || 0
  }

  const getMaxContracts = (size: number): { mini: number; micro: number } => {
    const contractsConfig: Record<number, { mini: number; micro: number }> = {
      25000: { mini: 4, micro: 40 },
      50000: { mini: 10, micro: 100 },
      75000: { mini: 12, micro: 120 },
      100000: { mini: 14, micro: 140 },
      150000: { mini: 17, micro: 170 },
      250000: { mini: 27, micro: 270 },
      300000: { mini: 35, micro: 350 },
    }
    return contractsConfig[size] || { mini: 0, micro: 0 }
  }

  const maxDrawdown = getMaxDrawdown(accountSize)
  const maxContracts = getMaxContracts(accountSize)
  const isStaticAccount = accountSize === 100000 // 100K Static

  // Calculer le PnL total
  const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

  // Calculer le solde actuel
  const currentBalance = accountSize + totalPnl - totalWithdrawals

  // Calculer le safety net (initial balance + trailing drawdown + $100)
  const safetyNet = accountSize + maxDrawdown + 100

  // Vérifier si le compte a dépassé le safety net (pour Contract Scaling)
  const hasReachedSafetyNet = currentBalance >= safetyNet

  // Pour 100K Static, le seuil est de $2,600 de profit
  const staticThreshold = 2600
  const hasReachedStaticThreshold = isStaticAccount && totalPnl >= staticThreshold

  // Calculer le PnL du début de journée (pour la règle 30% MAE)
  const yesterdayPnl = React.useMemo(() => {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 86400000)
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    return pnlEntries
      .filter((entry) => entry.date.split("T")[0] <= yesterdayStr)
      .reduce((sum, entry) => sum + entry.amount, 0)
  }, [pnlEntries])

  const startOfDayProfit = Math.max(0, yesterdayPnl)

  // Calculer la limite de perte par trade (30% du profit de début de journée)
  const maxLossPerTrade = startOfDayProfit * 0.3

  // Si le profit EOD double le safety net, la limite passe à 50%
  const canUse50Percent = totalPnl >= maxDrawdown * 2
  const adjustedMaxLossPerTrade = canUse50Percent ? startOfDayProfit * 0.5 : maxLossPerTrade

  // Calculer les jours de trading et cycles complétés
  const dailyPnl = React.useMemo(() => {
    return pnlEntries.reduce(
      (acc, entry) => {
        const dateKey = entry.date.split("T")[0]
        acc[dateKey] = (acc[dateKey] || 0) + entry.amount
        return acc
      },
      {} as Record<string, number>
    )
  }, [pnlEntries])

  const tradingDays = Object.keys(dailyPnl).length
  const profitableDays = Object.values(dailyPnl).filter((amount) => amount >= 50).length
  const completedCycles = Math.floor(tradingDays / 8)
  const daysUntilNextCycle = 8 - (tradingDays % 8)

  // Vérifier les conditions pour les retraits
  const hasMinTradingDays = tradingDays >= 8
  const hasMinProfitableDays = profitableDays >= 5
  const hasCompletedCycle = completedCycles > 0

  // Calculer le montant disponible pour retrait en utilisant la stratégie
  const strategy = PropfirmStrategyFactory.getStrategy(PropfirmType.APEX)
  const normalizedPnlEntries = pnlEntries.map((entry) => ({
    date: new Date(entry.date),
    amount: entry.amount,
  }))
  const availableForWithdrawal = strategy.calculateAvailableForWithdrawal(
    accountSize,
    totalPnl,
    totalWithdrawals,
    normalizedPnlEntries
  )

  // Calculer la Consistency Rule (30% Windfall) pour les payouts
  const biggestDay = Math.max(...Object.values(dailyPnl).filter((v) => v > 0), 0)
  const consistencyPercentage = totalPnl > 0 ? (biggestDay / totalPnl) * 100 : 0
  const consistencyRule = 30 // 30% Windfall Rule
  const consistencyStatus = consistencyPercentage <= consistencyRule || totalPnl <= 0

  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-4 border-b border-slate-200/70 dark:border-[#1e293b]/70 hover:bg-slate-50/50 dark:hover:bg-[#1e293b]/50 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 text-left">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400" />
              Règles PA (Performance Account) - Apex
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            {isOpen ? (
              <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
            ) : (
              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
            )}
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 text-left">
          Règles de trading et conditions de retrait pour les comptes financés Apex
        </p>
      </button>
      {isOpen && (
        <div className="p-4 sm:p-6">
          {/* Résumé avec StatCards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <StatCard
              title="Safety Net"
              value={formatCurrency(safetyNet)}
              icon={Shield}
              variant="neutral"
              description="Balance initiale + DD + $100"
              size="sm"
            />
            <StatCard
              title="Montant retirable"
              value={formatCurrency(availableForWithdrawal)}
              icon={DollarSign}
              variant={availableForWithdrawal > 0 ? "success" : "neutral"}
              description={
                availableForWithdrawal > 0 ? "Disponible pour retrait" : "Conditions non remplies"
              }
              size="sm"
            />
            <StatCard
              title="Jours de trading"
              value={tradingDays.toString()}
              icon={Calendar}
              variant="neutral"
              description={`${profitableDays} jours à +$50`}
              size="sm"
            />
          </div>

          <div className="space-y-6">
            {/* 1. Contract Scaling Rule */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium">Contract Scaling Rule</span>
                  {(hasReachedSafetyNet || hasReachedStaticThreshold) && (
                    <CheckCircle2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  )}
                </div>
              </div>
              {/* Slider seulement si nécessaire (pour montrer la progression) */}
              {!hasReachedSafetyNet && !hasReachedStaticThreshold && (
                <div className="h-2 bg-slate-200/70 dark:bg-slate-800/70 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full transition-all bg-slate-500 dark:bg-slate-400"
                    style={{
                      width: `${Math.min(
                        ((currentBalance - accountSize) / (safetyNet - accountSize)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              )}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Contrats autorisés :</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {hasReachedSafetyNet || hasReachedStaticThreshold
                      ? `${maxContracts.mini} mini / ${maxContracts.micro} micro (100%)`
                      : `${Math.floor(maxContracts.mini / 2)} mini / ${Math.floor(maxContracts.micro / 2)} micro (50%)`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    {!isStaticAccount ? "Seuil (Safety Net) :" : "Seuil (100K Static) :"}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {!isStaticAccount ? formatCurrency(safetyNet) : formatCurrency(staticThreshold)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    {!isStaticAccount ? "Solde actuel :" : "Profit actuel :"}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {!isStaticAccount ? formatCurrency(currentBalance) : formatCurrency(totalPnl)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. 30% Negative P&L Rule (MAE) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium">
                    {canUse50Percent ? "50%" : "30%"} Negative P&L Rule (MAE)
                  </span>
                  <Info className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Profit début de journée :
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(startOfDayProfit)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Perte max par trade ({canUse50Percent ? "50%" : "30%"}) :
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(adjustedMaxLossPerTrade)}
                  </span>
                </div>
                {canUse50Percent && (
                  <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                    <span>
                      Votre profit EOD a doublé le safety net ! Vous pouvez utiliser 50% au lieu de
                      30%
                    </span>
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  La perte non réalisée (open negative P&L) d&apos;un trade ne doit jamais dépasser{" "}
                  {canUse50Percent ? "50%" : "30%"} du profit de début de journée.
                </p>
              </div>
            </div>

            {/* 3. Consistency Rule (30% Windfall) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium">Consistency Rule (30% Windfall)</span>
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {consistencyPercentage.toFixed(1)}% / {consistencyRule}%
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Plus gros jour :</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(biggestDay)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Pourcentage du total :</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {consistencyPercentage.toFixed(1)}%
                  </span>
                </div>
                {!consistencyStatus && totalPnl > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded text-xs text-slate-700 dark:text-slate-300">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    <span>
                      Le plus gros jour dépasse {consistencyRule}% du profit total. Un payout ne
                      peut pas être demandé.
                    </span>
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Pour demander un payout, aucun jour ne doit représenter plus de 30% du profit
                  total.
                </p>
              </div>
            </div>

            {/* 4. 5:1 Risk-Reward Ratio Rule */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium">5:1 Risk-Reward Ratio Rule</span>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-lg">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Votre <strong>stop loss</strong> ne doit jamais dépasser{" "}
                  <strong>5 fois votre profit target</strong>.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Exemple : Si votre profit target est de $100, votre stop loss maximum est de $500.
                </p>
              </div>
            </div>

            {/* 5. Hedging Rule */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium">Hedging Rule</span>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-lg">
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  Interdit : Tenir des positions longues ET courtes simultanément sur le même
                  instrument ou des instruments corrélés.
                </p>
              </div>
            </div>

            {/* 6. Règles de Retrait */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium">Règles de Retrait</span>
                  {availableForWithdrawal > 0 && (
                    <CheckCircle2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {/* Safety Net - Slider important pour montrer la progression */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Safety Net :</span>
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrency(safetyNet)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200/70 dark:bg-slate-800/70 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all bg-slate-500 dark:bg-slate-400"
                      style={{
                        width: `${Math.min((currentBalance / safetyNet) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Solde actuel : {formatCurrency(currentBalance)}
                  </p>
                </div>

                {/* Jours de trading */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Jours de trading :
                    </span>
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      {tradingDays} / 8 minimum
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {hasMinTradingDays
                      ? "✓ Condition remplie"
                      : `Encore ${8 - tradingDays} jour${8 - tradingDays > 1 ? "s" : ""} requis`}
                  </p>
                </div>

                {/* Jours à +$50 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Jours à +$50 de profit :
                    </span>
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      {profitableDays} / 5 minimum
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {hasMinProfitableDays
                      ? "✓ Condition remplie"
                      : `Encore ${5 - profitableDays} jour${5 - profitableDays > 1 ? "s" : ""} requis`}
                  </p>
                </div>

                {/* Cycles */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Cycles complétés :
                    </span>
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      {completedCycles} cycle{completedCycles > 1 ? "s" : ""}
                    </span>
                  </div>
                  {!hasCompletedCycle && tradingDays > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Encore {daysUntilNextCycle} jour{daysUntilNextCycle > 1 ? "s" : ""} avant le
                      prochain cycle
                    </p>
                  )}
                </div>

                {/* Montant disponible */}
                <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Montant retirable :
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(availableForWithdrawal)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    100% des premiers $25,000 de profit, puis 90% ensuite. Minimum 8 jours de
                    trading (dont 5 jours à +$50) et 1 cycle complété.
                  </p>
                </div>
              </div>
            </div>

            {/* Résumé */}
            <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800/70">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Balance de départ</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(accountSize)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Balance actuelle</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(currentBalance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Limites de contrats */}
            <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Contrats max ({hasReachedSafetyNet || hasReachedStaticThreshold ? "100%" : "50%"})
                  :
                </p>
                <div className="flex items-center gap-3 ml-auto">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Mini</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {hasReachedSafetyNet || hasReachedStaticThreshold
                        ? maxContracts.mini
                        : Math.floor(maxContracts.mini / 2)}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Micro</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {hasReachedSafetyNet || hasReachedStaticThreshold
                        ? maxContracts.micro
                        : Math.floor(maxContracts.micro / 2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
