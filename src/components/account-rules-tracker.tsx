"use client"

import * as React from "react"
import { AlertTriangle, TrendingUp, Shield, Target, Calendar, FileText } from "lucide-react"
import { PropfirmStrategyFactory } from "@/lib/strategies/propfirm-strategy.factory"
import { PropfirmType } from "@/types/account.types"

interface PnlEntry {
  id: string
  date: string
  amount: number
  notes?: string
}

interface AccountRulesTrackerProps {
  accountSize: number
  accountType: string
  propfirm: string
  pnlEntries: PnlEntry[]
  accountName?: string
  notes?: string | null
  onEligibilityChange?: (isEligible: boolean) => void
}

const RULES_CONFIG: Record<
  string,
  Record<
    number,
    {
      maxDrawdown: number
      dailyLossLimit: number
      profitTarget: number
      consistencyRule: number
      minTradingDays?: number
      maxContracts?: { mini: number; micro: number }
    }
  >
> = {
  TOPSTEP: {
    50000: {
      maxDrawdown: 2000,
      dailyLossLimit: 2000,
      profitTarget: 3000,
      consistencyRule: 50,
      maxContracts: { mini: 5, micro: 50 },
    },
    100000: {
      maxDrawdown: 3000,
      dailyLossLimit: 3000,
      profitTarget: 6000,
      consistencyRule: 50,
      maxContracts: { mini: 10, micro: 100 },
    },
    150000: {
      maxDrawdown: 4500,
      dailyLossLimit: 4500,
      profitTarget: 9000,
      consistencyRule: 50,
      maxContracts: { mini: 15, micro: 150 },
    },
  },
  TAKEPROFITTRADER: {
    25000: {
      maxDrawdown: 1500,
      dailyLossLimit: 1500,
      profitTarget: 1500,
      consistencyRule: 50,
      minTradingDays: 5,
    },
    50000: {
      maxDrawdown: 2000,
      dailyLossLimit: 2000,
      profitTarget: 3000,
      consistencyRule: 50,
      minTradingDays: 5,
    },
    75000: {
      maxDrawdown: 2500,
      dailyLossLimit: 2500,
      profitTarget: 4500,
      consistencyRule: 50,
      minTradingDays: 5,
    },
    100000: {
      maxDrawdown: 3000,
      dailyLossLimit: 3000,
      profitTarget: 6000,
      consistencyRule: 50,
      minTradingDays: 5,
    },
    150000: {
      maxDrawdown: 4500,
      dailyLossLimit: 4500,
      profitTarget: 9000,
      consistencyRule: 50,
      minTradingDays: 5,
    },
  },
  APEX: {
    25000: {
      maxDrawdown: 1500,
      dailyLossLimit: 0,
      profitTarget: 1500,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 4, micro: 40 },
    },
    50000: {
      maxDrawdown: 2500,
      dailyLossLimit: 0,
      profitTarget: 3000,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 10, micro: 100 },
    },
    75000: {
      maxDrawdown: 2750,
      dailyLossLimit: 0,
      profitTarget: 4500,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 12, micro: 120 },
    },
    100000: {
      maxDrawdown: 3000,
      dailyLossLimit: 0,
      profitTarget: 6000,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 14, micro: 140 },
    },
    150000: {
      maxDrawdown: 5000,
      dailyLossLimit: 0,
      profitTarget: 9000,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 17, micro: 170 },
    },
    250000: {
      maxDrawdown: 6500,
      dailyLossLimit: 0,
      profitTarget: 15000,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 27, micro: 270 },
    },
    300000: {
      maxDrawdown: 7500,
      dailyLossLimit: 0,
      profitTarget: 20000,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 35, micro: 350 },
    },
  },
  BULENOX: {
    25000: {
      maxDrawdown: 1500,
      dailyLossLimit: 0,
      profitTarget: 1500,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 3, micro: 30 },
    },
    50000: {
      maxDrawdown: 2500,
      dailyLossLimit: 0,
      profitTarget: 3000,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 7, micro: 70 },
    },
    100000: {
      maxDrawdown: 3000,
      dailyLossLimit: 0,
      profitTarget: 6000,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 12, micro: 120 },
    },
    150000: {
      maxDrawdown: 4500,
      dailyLossLimit: 0,
      profitTarget: 9000,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 15, micro: 150 },
    },
    250000: {
      maxDrawdown: 5500,
      dailyLossLimit: 0,
      profitTarget: 15000,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 25, micro: 250 },
    },
  },
  PHIDIAS: {
    25000: {
      maxDrawdown: 500, // Perte statique de 500$ (pas de trailing)
      dailyLossLimit: 0,
      profitTarget: 1500,
      consistencyRule: 0, // Pas de règle de cohérence
      minTradingDays: 0, // Pas de minimum de jours de trading
    },
    50000: {
      maxDrawdown: 2500,
      dailyLossLimit: 0,
      profitTarget: 3000,
      consistencyRule: 0,
      minTradingDays: 1,
    },
    100000: {
      maxDrawdown: 3000,
      dailyLossLimit: 0,
      profitTarget: 6000,
      consistencyRule: 0,
      minTradingDays: 1,
    },
    150000: {
      maxDrawdown: 4500,
      dailyLossLimit: 0,
      profitTarget: 9000,
      consistencyRule: 0,
      minTradingDays: 1,
    },
  },
}

export function AccountRulesTracker({
  accountSize,
  accountType,
  propfirm,
  pnlEntries,
  accountName,
  notes,
  onEligibilityChange,
}: AccountRulesTrackerProps) {
  /* eslint-disable react-hooks/rules-of-hooks */
  // Seulement pour les comptes d&apos;évaluation
  if (accountType !== "EVAL") {
    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Utiliser la stratégie factory pour obtenir les règles
  let rules: {
    maxDrawdown: number
    dailyLossLimit: number
    profitTarget: number
    consistencyRule: number
    minTradingDays?: number
    maxContracts?: { mini: number; micro: number }
  } | null = null

  try {
    const strategy = PropfirmStrategyFactory.getStrategy(propfirm as PropfirmType)
    const accountRules = strategy.getAccountRules(accountSize, accountType, accountName, notes)

    if (accountRules) {
      rules = {
        maxDrawdown: accountRules.maxDrawdown,
        dailyLossLimit: accountRules.dailyLossLimit,
        profitTarget: accountRules.profitTarget,
        consistencyRule: accountRules.consistencyRule || 0,
        minTradingDays: accountRules.minTradingDays,
        maxContracts: accountRules.maxContracts,
      }
    }
  } catch (_error) {
    // Si la stratégie n'existe pas, essayer avec RULES_CONFIG en fallback
    rules = RULES_CONFIG[propfirm]?.[accountSize] || null
  }

  // Vérifier que les règles existent AVANT tout calcul
  if (!rules) {
    return null
  }

  // Calculer le PnL total
  const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

  // Calculer le drawdown end-of-day actuel
  const startingBalance = accountSize - rules.maxDrawdown
  const currentDrawdownLevel = startingBalance + totalPnl

  // Calculer le PnL du jour (aujourd&apos;hui)
  const today = new Date().toISOString().split("T")[0]
  const todayPnl = pnlEntries
    .filter((entry) => entry.date.split("T")[0] === today)
    .reduce((sum, entry) => sum + entry.amount, 0)

  // Calculer le plus gros jour et le nombre de jours de trading
  const dailyPnl = pnlEntries.reduce(
    (acc, entry) => {
      const dateKey = entry.date.split("T")[0]
      acc[dateKey] = (acc[dateKey] || 0) + entry.amount
      return acc
    },
    {} as Record<string, number>
  )

  const tradingDays = Object.keys(dailyPnl).length
  const biggestDay = Math.max(...Object.values(dailyPnl), 0)
  const consistencyPercentage = totalPnl > 0 ? (biggestDay / totalPnl) * 100 : 0

  // Statuts
  const profitTargetStatus = totalPnl >= rules.profitTarget
  const drawdownStatus = currentDrawdownLevel >= startingBalance
  const dailyLossStatus = todayPnl > -rules.dailyLossLimit
  const consistencyStatus = consistencyPercentage <= rules.consistencyRule || totalPnl <= 0
  const minTradingDaysStatus = rules.minTradingDays ? tradingDays >= rules.minTradingDays : true

  // Pour Apex, Bulenox, Phidias et Tradeify, utiliser la logique de la stratégie
  // Phidias utilise une perte statique (pas de trailing)
  // Tradeify a des règles spécifiques selon le type de compte
  // Pour les autres, utiliser la logique end-of-day
  const useStrategyEligibility =
    propfirm === "APEX" || propfirm === "BULENOX" || propfirm === "PHIDIAS" || propfirm === "TRADEIFY"

  // Calculer l'éligibilité selon la méthode appropriée
  let isEligible: boolean
  if (useStrategyEligibility) {
    // Utiliser la stratégie pour calculer l'éligibilité
    // Apex/Bulenox : trailing drawdown
    // Phidias : perte statique (pas de trailing)
    const strategy = PropfirmStrategyFactory.getStrategy(propfirm as PropfirmType)
    const normalizedPnlEntries = pnlEntries.map((entry) => ({
      date: new Date(entry.date),
      amount: entry.amount,
    }))
    isEligible = strategy.isEligibleForValidation(
      accountSize,
      normalizedPnlEntries,
      accountType,
      accountName,
      notes
    )
  } else {
    // Logique end-of-day pour TopStep et TakeProfitTrader
    isEligible =
      profitTargetStatus &&
      drawdownStatus &&
      dailyLossStatus &&
      consistencyStatus &&
      minTradingDaysStatus
  }

  // Notifier le parent du changement d&apos;éligibilité
  React.useEffect(() => {
    onEligibilityChange?.(isEligible)
  }, [isEligible, onEligibilityChange])

  // Calculs pour les barres de progression
  const profitProgress = Math.min((totalPnl / rules.profitTarget) * 100, 100)
  const drawdownUsed = rules.maxDrawdown - (currentDrawdownLevel - startingBalance)
  const drawdownProgress = Math.min((drawdownUsed / rules.maxDrawdown) * 100, 100)
  const dailyLossUsed = Math.abs(Math.min(todayPnl, 0))
  const dailyLossProgress = Math.min((dailyLossUsed / rules.dailyLossLimit) * 100, 100)
  const consistencyProgress = Math.min(consistencyPercentage, 100)

  return (
    <div className="space-y-6">
      {/* Objectif de Profit */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target
              className={`h-4 w-4 ${profitTargetStatus ? "text-green-600 dark:text-green-500" : "text-slate-600 dark:text-slate-400"}`}
            />
            <span className="text-sm font-medium">Objectif de Profit</span>
          </div>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {formatCurrency(totalPnl)} / {formatCurrency(rules.profitTarget)}
          </span>
        </div>
        <div className="h-2 bg-slate-200/70 dark:bg-slate-800/70 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full transition-all ${
              profitTargetStatus
                ? "bg-green-600 dark:bg-green-500"
                : profitProgress > 75
                  ? "bg-blue-600 dark:bg-blue-500"
                  : profitProgress > 50
                    ? "bg-yellow-600 dark:bg-yellow-500"
                    : "bg-slate-500 dark:bg-slate-400"
            }`}
            style={{ width: `${profitProgress}%` }}
          />
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-lg">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {profitTargetStatus
              ? "Objectif atteint"
              : `Reste ${formatCurrency(rules.profitTarget - totalPnl)}`}
          </p>
        </div>
      </div>

      {/* Drawdown Maximum (End of Day) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield
              className={`h-4 w-4 ${drawdownStatus ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}
            />
            <span className="text-sm font-medium">Drawdown Max (End of Day)</span>
          </div>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {formatCurrency(currentDrawdownLevel)} / {formatCurrency(startingBalance)}
          </span>
        </div>
        <div className="h-2 bg-slate-200/70 dark:bg-slate-800/70 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full transition-all ${
              drawdownProgress < 50
                ? "bg-green-600 dark:bg-green-500"
                : drawdownProgress < 75
                  ? "bg-yellow-600 dark:bg-yellow-500"
                  : drawdownProgress < 100
                    ? "bg-orange-600 dark:bg-orange-500"
                    : "bg-red-600 dark:bg-red-500"
            }`}
            style={{ width: `${drawdownProgress}%` }}
          />
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-lg space-y-2">
          <div className="flex items-center gap-1">
            {drawdownStatus ? (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Utilisé : {formatCurrency(drawdownUsed)} / {formatCurrency(rules.maxDrawdown)}
              </p>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-500" />
                <p className="text-xs text-red-600 dark:text-red-500">Drawdown maximum dépassé</p>
              </>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Niveau : {formatCurrency(startingBalance)} + profits du jour
          </p>
        </div>
      </div>

      {/* Perte Journalière - Seulement si applicable */}
      {rules.dailyLossLimit > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar
                className={`h-4 w-4 ${dailyLossStatus ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}
              />
              <span className="text-sm font-medium">Perte Max Journalière</span>
            </div>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {formatCurrency(dailyLossUsed)} / {formatCurrency(rules.dailyLossLimit)}
            </span>
          </div>
          <div className="h-2 bg-slate-200/70 dark:bg-slate-800/70 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all ${
                dailyLossProgress < 50
                  ? "bg-green-600 dark:bg-green-500"
                  : dailyLossProgress < 75
                    ? "bg-yellow-600 dark:bg-yellow-500"
                : dailyLossProgress < 100
                  ? "bg-orange-600 dark:bg-orange-500"
                  : "bg-red-600 dark:bg-red-500"
              }`}
              style={{ width: `${dailyLossProgress}%` }}
            />
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center gap-1">
              {todayPnl >= 0 ? (
                <p className="text-xs text-green-600 dark:text-green-500">
                  Aujourd&apos;hui : {formatCurrency(todayPnl)}
                </p>
              ) : dailyLossStatus ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Aujourd&apos;hui : {formatCurrency(todayPnl)} (
                  {formatCurrency(rules.dailyLossLimit - dailyLossUsed)} disponible)
                </p>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-500" />
                  <p className="text-xs text-red-600 dark:text-red-500">Limite journalière dépassée</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Règle de Cohérence - Seulement si applicable */}
      {rules.consistencyRule > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp
                className={`h-4 w-4 ${consistencyStatus ? "text-green-600 dark:text-green-500" : "text-orange-600 dark:text-orange-500"}`}
              />
              <span className="text-sm font-medium">Règle de Cohérence</span>
            </div>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {consistencyPercentage.toFixed(1)}% / {rules.consistencyRule}%
            </span>
          </div>
          <div className="h-2 bg-slate-200/70 dark:bg-slate-800/70 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all ${
                consistencyProgress <= rules.consistencyRule
                  ? "bg-green-600 dark:bg-green-500"
                  : "bg-orange-600 dark:bg-orange-500"
              }`}
              style={{ width: `${consistencyProgress}%` }}
            />
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-1">
              {totalPnl <= 0 ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">Pas encore de données</p>
              ) : consistencyStatus ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Plus gros jour : {formatCurrency(biggestDay)} ({consistencyPercentage.toFixed(1)}%)
                </p>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Plus gros jour ({formatCurrency(biggestDay)}) dépasse {rules.consistencyRule}%
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
            <p
              className={`font-medium ${totalPnl >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}
            >
              {formatCurrency(accountSize + totalPnl)}
            </p>
          </div>
        </div>
      </div>

      {/* Limites de contrats */}
      {rules.maxContracts && (
        <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Contrats max :</p>
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Mini</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {rules.maxContracts.mini}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Micro</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {rules.maxContracts.micro}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
