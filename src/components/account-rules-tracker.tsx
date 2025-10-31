"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle2, TrendingUp, Shield, Target, Calendar, Info, FileText } from "lucide-react"

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
  onEligibilityChange?: (isEligible: boolean) => void
}

const RULES_CONFIG: Record<string, Record<number, {
  maxDrawdown: number
  dailyLossLimit: number
  profitTarget: number
  consistencyRule: number
  minTradingDays?: number
  maxContracts?: { mini: number, micro: number }
}>> = {
  TOPSTEP: {
    50000: { maxDrawdown: 2000, dailyLossLimit: 2000, profitTarget: 3000, consistencyRule: 50, maxContracts: { mini: 5, micro: 50 } },
    100000: { maxDrawdown: 3000, dailyLossLimit: 3000, profitTarget: 6000, consistencyRule: 50, maxContracts: { mini: 10, micro: 100 } },
    150000: { maxDrawdown: 4500, dailyLossLimit: 4500, profitTarget: 9000, consistencyRule: 50, maxContracts: { mini: 15, micro: 150 } },
  },
  TAKEPROFITTRADER: {
    25000: { maxDrawdown: 1500, dailyLossLimit: 1500, profitTarget: 1500, consistencyRule: 50, minTradingDays: 5 },
    50000: { maxDrawdown: 2000, dailyLossLimit: 2000, profitTarget: 3000, consistencyRule: 50, minTradingDays: 5 },
    75000: { maxDrawdown: 2500, dailyLossLimit: 2500, profitTarget: 4500, consistencyRule: 50, minTradingDays: 5 },
    100000: { maxDrawdown: 3000, dailyLossLimit: 3000, profitTarget: 6000, consistencyRule: 50, minTradingDays: 5 },
    150000: { maxDrawdown: 4500, dailyLossLimit: 4500, profitTarget: 9000, consistencyRule: 50, minTradingDays: 5 },
  },
}

export function AccountRulesTracker({ accountSize, accountType, propfirm, pnlEntries, onEligibilityChange }: AccountRulesTrackerProps) {
  // Seulement pour les comptes d'évaluation
  if (accountType !== "EVAL") {
    return null
  }

  const rules = RULES_CONFIG[propfirm]?.[accountSize]

  if (!rules) {
    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Calculer le PnL total
  const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

  // Calculer le drawdown end-of-day actuel
  const startingBalance = accountSize - rules.maxDrawdown
  const currentDrawdownLevel = startingBalance + totalPnl

  // Calculer le PnL du jour (aujourd'hui)
  const today = new Date().toISOString().split('T')[0]
  const todayPnl = pnlEntries
    .filter(entry => entry.date.split('T')[0] === today)
    .reduce((sum, entry) => sum + entry.amount, 0)

  // Calculer le plus gros jour et le nombre de jours de trading
  const dailyPnl = pnlEntries.reduce((acc, entry) => {
    const dateKey = entry.date.split('T')[0]
    acc[dateKey] = (acc[dateKey] || 0) + entry.amount
    return acc
  }, {} as Record<string, number>)

  const tradingDays = Object.keys(dailyPnl).length
  const biggestDay = Math.max(...Object.values(dailyPnl), 0)
  const consistencyPercentage = totalPnl > 0 ? (biggestDay / totalPnl) * 100 : 0

  // Statuts
  const profitTargetStatus = totalPnl >= rules.profitTarget
  const drawdownStatus = currentDrawdownLevel >= startingBalance
  const dailyLossStatus = todayPnl > -rules.dailyLossLimit
  const consistencyStatus = consistencyPercentage <= rules.consistencyRule || totalPnl <= 0
  const minTradingDaysStatus = rules.minTradingDays ? tradingDays >= rules.minTradingDays : true

  // Le compte est éligible à la validation si toutes les règles sont respectées
  const isEligible = profitTargetStatus && drawdownStatus && dailyLossStatus && consistencyStatus && minTradingDaysStatus

  // Notifier le parent du changement d'éligibilité
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Règles de Validation</CardTitle>
            <CardDescription>
              Suivez votre progression pour valider votre compte
            </CardDescription>
          </div>
          {isEligible && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Éligible à la validation
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Objectif de Profit */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className={`h-4 w-4 ${profitTargetStatus ? "text-green-600" : "text-zinc-500"}`} />
              <span className="text-sm font-medium">Objectif de Profit</span>
              {profitTargetStatus && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(totalPnl)} / {formatCurrency(rules.profitTarget)}
            </span>
          </div>
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                profitTargetStatus
                  ? "bg-green-500"
                  : profitProgress > 75
                  ? "bg-blue-500"
                  : profitProgress > 50
                  ? "bg-yellow-500"
                  : "bg-zinc-400"
              }`}
              style={{ width: `${profitProgress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {profitTargetStatus
              ? "Objectif atteint"
              : `Reste ${formatCurrency(rules.profitTarget - totalPnl)}`}
          </p>
        </div>

        {/* Drawdown Maximum (End of Day) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className={`h-4 w-4 ${drawdownStatus ? "text-green-600" : "text-red-600"}`} />
              <span className="text-sm font-medium">Drawdown Max (End of Day)</span>
              {drawdownStatus && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(currentDrawdownLevel)} / {formatCurrency(startingBalance)}
            </span>
          </div>
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                drawdownProgress < 50
                  ? "bg-green-500"
                  : drawdownProgress < 75
                  ? "bg-yellow-500"
                  : drawdownProgress < 100
                  ? "bg-orange-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${drawdownProgress}%` }}
            />
          </div>
          <div className="flex items-center gap-1 mt-1">
            {drawdownStatus ? (
              <p className="text-xs text-zinc-500">
                Utilisé : {formatCurrency(drawdownUsed)} / {formatCurrency(rules.maxDrawdown)}
              </p>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 text-red-600" />
                <p className="text-xs text-red-600">
                  Drawdown maximum dépassé
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Info className="h-3 w-3 text-zinc-400" />
            <p className="text-xs text-zinc-400">
              Niveau : {formatCurrency(startingBalance)} + profits du jour
            </p>
          </div>
        </div>

        {/* Perte Journalière */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className={`h-4 w-4 ${dailyLossStatus ? "text-green-600" : "text-red-600"}`} />
              <span className="text-sm font-medium">Perte Max Journalière</span>
              {dailyLossStatus && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(dailyLossUsed)} / {formatCurrency(rules.dailyLossLimit)}
            </span>
          </div>
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                dailyLossProgress < 50
                  ? "bg-green-500"
                  : dailyLossProgress < 75
                  ? "bg-yellow-500"
                  : dailyLossProgress < 100
                  ? "bg-orange-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${dailyLossProgress}%` }}
            />
          </div>
          <div className="flex items-center gap-1 mt-1">
            {todayPnl >= 0 ? (
              <p className="text-xs text-green-600">
                Aujourd'hui : {formatCurrency(todayPnl)}
              </p>
            ) : dailyLossStatus ? (
              <>
                <AlertTriangle className="h-3 w-3 text-orange-600" />
                <p className="text-xs text-zinc-500">
                  Aujourd'hui : {formatCurrency(todayPnl)} ({formatCurrency(rules.dailyLossLimit - dailyLossUsed)} disponible)
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 text-red-600" />
                <p className="text-xs text-red-600">
                  Limite journalière dépassée
                </p>
              </>
            )}
          </div>
        </div>

        {/* Règle de Cohérence */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-4 w-4 ${consistencyStatus ? "text-green-600" : "text-orange-600"}`} />
              <span className="text-sm font-medium">Règle de Cohérence</span>
              {consistencyStatus && totalPnl > 0 && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </div>
            <span className="text-sm font-medium">
              {consistencyPercentage.toFixed(1)}% / {rules.consistencyRule}%
            </span>
          </div>
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                consistencyProgress <= rules.consistencyRule
                  ? "bg-green-500"
                  : "bg-orange-500"
              }`}
              style={{ width: `${consistencyProgress}%` }}
            />
          </div>
          <div className="flex items-center gap-1 mt-1">
            {totalPnl <= 0 ? (
              <p className="text-xs text-zinc-500">
                Pas encore de données
              </p>
            ) : consistencyStatus ? (
              <p className="text-xs text-zinc-500">
                Plus gros jour : {formatCurrency(biggestDay)} ({consistencyPercentage.toFixed(1)}%)
              </p>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 text-orange-600" />
                <p className="text-xs text-orange-600">
                  Plus gros jour ({formatCurrency(biggestDay)}) dépasse {rules.consistencyRule}%
                </p>
              </>
            )}
          </div>
        </div>

        {/* Jours de trading minimum */}
        {rules.minTradingDays && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className={`h-4 w-4 ${minTradingDaysStatus ? "text-green-600" : "text-zinc-500"}`} />
                <span className="text-sm font-medium">Jours de Trading Minimum</span>
                {minTradingDaysStatus && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
              </div>
              <span className="text-sm font-medium">
                {tradingDays} / {rules.minTradingDays} jours
              </span>
            </div>
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  minTradingDaysStatus
                    ? "bg-green-500"
                    : "bg-zinc-400"
                }`}
                style={{ width: `${Math.min((tradingDays / rules.minTradingDays) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {minTradingDaysStatus
                ? "Objectif atteint"
                : `Reste ${rules.minTradingDays - tradingDays} jour${rules.minTradingDays - tradingDays > 1 ? 's' : ''}`}
            </p>
          </div>
        )}

        {/* Résumé */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Balance de départ</p>
              <p className="font-medium">{formatCurrency(accountSize)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Balance actuelle</p>
              <p className={`font-medium ${totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(accountSize + totalPnl)}
              </p>
            </div>
          </div>
        </div>

        {/* Limites de contrats */}
        {rules.maxContracts && (
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Contrats max :
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-500">Mini</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {rules.maxContracts.mini}
                  </span>
                </div>
                <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700"></div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-500">Micro</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {rules.maxContracts.micro}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

