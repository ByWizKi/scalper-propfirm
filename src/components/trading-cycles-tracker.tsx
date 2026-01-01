"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Calendar, DollarSign, TrendingUp, Info, Shield, ChevronDown, ChevronUp } from "lucide-react"
import { getPhidiasAccountSubType } from "@/lib/phidias-account-type"
import { PropfirmStrategyFactory } from "@/lib/strategies/propfirm-strategy.factory"

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

interface TradingCyclesTrackerProps {
  pnlEntries: PnlEntry[]
  withdrawals: Withdrawal[]
  accountSize: number
  propfirm: string
  maxDrawdown?: number
  accountType?: string
  accountName?: string
  notes?: string | null
}

export function TradingCyclesTracker({
  pnlEntries,
  withdrawals,
  accountSize,
  propfirm,
  maxDrawdown,
  accountType,
  accountName,
  notes
}: TradingCyclesTrackerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Calculer le PnL total
  const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

  // Calculer le total des retraits
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0)

  // Balance actuelle = Balance initiale + PnL - Retraits
  const currentBalance = accountSize + totalPnl - totalWithdrawals

  const isTakeProfitTrader = propfirm === "TAKEPROFITTRADER"
  const isPhidias = propfirm === "PHIDIAS"

  // Déterminer le sous-type Phidias
  const phidiasSubType = isPhidias && accountType
    ? getPhidiasAccountSubType(accountType, accountName, notes)
    : null

  // Pour Phidias, obtenir la stratégie pour les calculs
  const phidiasStrategy = isPhidias
    ? PropfirmStrategyFactory.getStrategy(propfirm)
    : null

  // Pour TopStep : un retrait réinitialise le cycle
  // On doit calculer uniquement depuis le dernier retrait
  let lastWithdrawalDate: Date | null = null
  if (!isTakeProfitTrader && withdrawals.length > 0) {
    // Trouver le dernier retrait
    const sortedWithdrawals = [...withdrawals].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    lastWithdrawalDate = new Date(sortedWithdrawals[0].date)
  }

  // Filtrer les PnL : seulement ceux après le dernier retrait (si TopStep)
  const relevantPnlEntries = !isTakeProfitTrader && lastWithdrawalDate
    ? pnlEntries.filter(entry => new Date(entry.date) > lastWithdrawalDate!)
    : pnlEntries

  // Grouper les PnL par jour
  const dailyPnl: Record<string, number> = relevantPnlEntries.reduce((acc, entry) => {
    const dateKey = entry.date.split('T')[0]
    acc[dateKey] = (acc[dateKey] || 0) + entry.amount
    return acc
  }, {} as Record<string, number>)

  // Trier les dates
  const sortedDates = Object.keys(dailyPnl).sort()

  // Déterminer les règles de cycle selon la propfirm
  let daysPerCycle = 5 // TopStep par défaut
  let minDailyProfit = 150 // TopStep par défaut

  if (isPhidias) {
    if (phidiasSubType === "CASH" && accountSize === 25000) {
      // 25K Static CASH : pas de cycles requis
      daysPerCycle = 0
      minDailyProfit = 0
    } else if (phidiasSubType === "CASH" && accountSize !== 25000) {
      // 50K, 100K, 150K CASH : cycles de 10 jours
      daysPerCycle = 10
      minDailyProfit = accountSize === 50000 ? 150 : accountSize === 100000 ? 200 : 250
    } else if (phidiasSubType === "LIVE") {
      // LIVE : pas de cycles requis
      daysPerCycle = 0
      minDailyProfit = 0
    }
  }

  // Trouver les cycles selon les règles de la propfirm
  const cycles: { startDate: string, endDate: string, valid: boolean, days: { date: string, amount: number }[] }[] = []

  let currentCycle: { date: string, amount: number }[] = []

  // Pour Phidias 25K Static CASH et LIVE : pas de cycles
  if (daysPerCycle === 0) {
    // Pas de cycles à calculer
  } else {
    sortedDates.forEach((date) => {
      const amount = dailyPnl[date]

      if (amount >= minDailyProfit) {
        currentCycle.push({ date, amount })

        if (currentCycle.length === daysPerCycle) {
          cycles.push({
            startDate: currentCycle[0].date,
            endDate: currentCycle[currentCycle.length - 1].date,
            valid: true,
            days: [...currentCycle]
          })
          currentCycle = []
        }
      } else {
        // Réinitialiser si on a un jour < minDailyProfit
        currentCycle = []
      }
    })
  }

  const completedCycles = cycles.length

  // PnL réalisé depuis le dernier retrait (pour TopStep)
  const pnlSinceLastWithdrawal = relevantPnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

  // Calculer le montant de retrait disponible
  let availableForWithdrawal = 0
  let buffer = 0
  let bufferReached = false
  let taxRate = 0

  if (isPhidias && phidiasStrategy) {
    // Utiliser la stratégie Phidias pour calculer le montant disponible
    const normalizedPnlEntries = pnlEntries.map((entry) => ({
      date: new Date(entry.date),
      amount: entry.amount,
    }))

    availableForWithdrawal = phidiasStrategy.calculateAvailableForWithdrawal(
      accountSize,
      totalPnl,
      totalWithdrawals,
      normalizedPnlEntries,
      accountType,
      accountName,
      notes
    )

    const withdrawalRules = phidiasStrategy.getWithdrawalRules(accountSize, accountType, accountName, notes)
    taxRate = withdrawalRules.taxRate || 0.2
  } else if (isTakeProfitTrader) {
    // TakeProfitTrader: Buffer = Balance initiale + Drawdown
    buffer = accountSize + (maxDrawdown || 0)
    bufferReached = currentBalance >= buffer
    availableForWithdrawal = bufferReached ? Math.max(0, currentBalance - buffer) : 0
    taxRate = 0.20 // 20% de taxe
  } else {
    // TopStep: Système de cycles
    // Un retrait réinitialise le cycle
    const withdrawalPercentage = 0.5 // 50%
    let additionalMultiplier = 1.0 // 100%

    if (totalWithdrawals >= 10000) {
      additionalMultiplier = 0.9 // 90%
    }

    // Retrait disponible = 50% du PnL réalisé depuis le dernier retrait
    availableForWithdrawal = completedCycles > 0
      ? pnlSinceLastWithdrawal * withdrawalPercentage * additionalMultiplier
      : 0
  }

  // Titre et description selon la propfirm
  let title = "Cycles de Trading"
  let description = "Complétez des cycles de 5 jours avec minimum $150/jour pour débloquer les retraits"

  if (isTakeProfitTrader) {
    title = "Règles de Retrait"
    description = "Atteignez le buffer pour débloquer les retraits"
  } else if (isPhidias) {
    if (phidiasSubType === "CASH" && accountSize === 25000) {
      title = "Règles de Retrait"
      description = "Retrait possible dès J+1, pas de restriction de période"
    } else if (phidiasSubType === "CASH" && accountSize !== 25000) {
      title = "Cycles de Trading"
      description = `Complétez des cycles de 10 jours avec minimum ${formatCurrency(minDailyProfit)}/jour pour les 3 premiers retraits`
    } else if (phidiasSubType === "LIVE") {
      title = "Règles de Retrait"
      description = "Retrait chaque jour sans limite maximum (min 500$), solde min = initial + 100$"
    }
  }

  return (
    <Card className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-4 border-b border-zinc-200/50 dark:border-zinc-800/30 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 text-left">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-600 dark:text-zinc-400 flex-shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                {description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-zinc-400" />
            {isOpen ? (
              <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-600 dark:text-zinc-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-600 dark:text-zinc-400 flex-shrink-0" />
            )}
          </div>
        </div>
      </button>
      {isOpen && (
        <div className="p-4 sm:p-6">
          <div className="space-y-6">
        {/* Résumé */}
        {(isTakeProfitTrader || (isPhidias && phidiasSubType === "LIVE") || (isPhidias && phidiasSubType === "CASH" && accountSize === 25000)) ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {isTakeProfitTrader && (
              <Card className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
                <CardContent className="p-3 sm:p-4 md:p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3 flex-shrink-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400">Buffer requis</h3>
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="space-y-1 flex-1 flex flex-col justify-between">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words leading-tight truncate">
                      {formatCurrency(buffer)}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-auto">
                      Balance initiale + DD
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
              <CardContent className="p-3 sm:p-4 md:p-5 flex flex-col h-full">
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3 flex-shrink-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400">Balance actuelle</h3>
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0 mt-0.5" />
                </div>
                <div className="space-y-1 flex-1 flex flex-col justify-between">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words leading-tight truncate">
                    {formatCurrency(currentBalance)}
                  </div>
                  <div className="mt-auto">
                    {isTakeProfitTrader && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {bufferReached ? "✓ Buffer atteint" : `Reste ${formatCurrency(buffer - currentBalance)}`}
                      </p>
                    )}
                    {isPhidias && phidiasSubType === "LIVE" && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Solde min: {formatCurrency(accountSize + 100)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
              <CardContent className="p-3 sm:p-4 md:p-5 flex flex-col h-full">
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3 flex-shrink-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400">Disponible (net)</h3>
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0 mt-0.5" />
                </div>
                <div className="space-y-1 flex-1 flex flex-col justify-between">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words leading-tight truncate">
                    {formatCurrency(Math.max(0, availableForWithdrawal * (1 - taxRate)))}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-auto">
                    Après taxe de {Math.round(taxRate * 100)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
                <CardContent className="p-3 sm:p-4 md:p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3 flex-shrink-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                      {isPhidias && phidiasSubType === "CASH" && accountSize !== 25000
                        ? "Cycles complétés (10j)"
                        : "Cycles complétés"}
                    </h3>
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="space-y-1 flex-1 flex flex-col justify-between">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words leading-tight">
                      {completedCycles}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-auto truncate">
                      {isPhidias && phidiasSubType === "CASH" && accountSize !== 25000
                        ? withdrawals.length < 3
                          ? `${withdrawals.length}/3 premiers retraits`
                          : "Une fois par mois"
                        : lastWithdrawalDate
                          ? "Depuis le dernier retrait"
                          : "Total"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
                <CardContent className="p-3 sm:p-4 md:p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3 flex-shrink-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400">Retraits effectués</h3>
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="space-y-1 flex-1 flex flex-col justify-between">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words leading-tight truncate">
                      {formatCurrency(totalWithdrawals)}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-auto truncate">
                      {withdrawals.length} retrait{withdrawals.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
                <CardContent className="p-3 sm:p-4 md:p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3 flex-shrink-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400">Retrait disponible</h3>
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="space-y-1 flex-1 flex flex-col justify-between">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words leading-tight truncate">
                      {formatCurrency(Math.max(0, availableForWithdrawal))}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-auto truncate">
                      {completedCycles > 0 ? "Cycle complété ✓" : "Complétez un cycle"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Message si dernier retrait */}
            {lastWithdrawalDate && (
              <Card className="mt-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
                <CardContent className="p-2 sm:p-3">
                  <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium">Dernier retrait :</span> {new Date(lastWithdrawalDate).toLocaleDateString("fr-FR")}
                    {" • "}Le cycle a été réinitialisé
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Règles de retrait */}
        <div className="border-t border-zinc-200/70 dark:border-zinc-800/70 pt-3 sm:pt-4">
          <div className="flex items-start gap-2 mb-2 sm:mb-3">
            <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-zinc-600 dark:text-zinc-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1 sm:mb-2">
                Règles de retrait
              </p>
              {isPhidias && phidiasSubType === "CASH" && accountSize === 25000 ? (
                <ul className="space-y-1 text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Retrait possible dès J+1 du compte CASH</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Pas de restriction de période, pas de minimum de montant</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Taxe de 20% : si vous retirez $100, vous recevez $80</span>
                  </li>
                </ul>
              ) : isPhidias && phidiasSubType === "CASH" && accountSize !== 25000 ? (
                <ul className="space-y-1 text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Un cycle = 10 jours de trading avec PnL positif ≥ {formatCurrency(minDailyProfit)} par jour</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Minimum 10 jours de trading pour les 3 premiers retraits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Après les 3 premiers retraits : une demande par mois</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Seuil minimum requis : {accountSize === 50000 ? "52 600$" : accountSize === 100000 ? "103 700$" : "154 500$"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Montant max par période : {accountSize === 50000 ? "2 000$" : accountSize === 100000 ? "2 500$" : "2 750$"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Taxe de 20% sur tous les retraits</span>
                  </li>
                </ul>
              ) : isPhidias && phidiasSubType === "LIVE" ? (
                <ul className="space-y-1 text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Payout possible chaque jour sans limite maximum</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Minimum 500$ par retrait</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Solde minimum : solde initial ({formatCurrency(accountSize)}) + 100$</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Taxe de 20% : si vous retirez $100, vous recevez $80</span>
                  </li>
                </ul>
              ) : isTakeProfitTrader ? (
                <ul className="space-y-1 text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Buffer = Balance initiale ({formatCurrency(accountSize)}) + Drawdown max ({formatCurrency(maxDrawdown || 0)})</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Vous pouvez retirer tout montant au-dessus du buffer une fois qu&apos;il est atteint</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Taxe de 20% : si vous retirez $100, vous recevez $80 (le compte est débité de $100)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Le montant affiché est déjà net de la taxe</span>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-1 text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Un cycle = {daysPerCycle} jours consécutifs avec minimum {formatCurrency(minDailyProfit)} de profit par jour</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">
                      {totalWithdrawals < 10000
                        ? "Avant $10,000 de retraits : 50% du PnL réalisé depuis le dernier retrait"
                        : "Après $10,000 de retraits : 50% du PnL réalisé depuis le dernier retrait × 90%"
                      }
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Vous devez avoir au moins 1 cycle complété pour retirer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-500 dark:text-zinc-400 mt-0.5 flex-shrink-0">•</span>
                    <span className="font-medium text-zinc-600 dark:text-zinc-400 break-words">Chaque retrait réinitialise le cycle - vous ne pouvez faire qu&apos;un retrait par cycle</span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Cycle en cours - TopStep et Phidias CASH (50K+) uniquement */}
        {!isTakeProfitTrader && !(isPhidias && (phidiasSubType === "LIVE" || (phidiasSubType === "CASH" && accountSize === 25000))) && currentCycle.length > 0 && daysPerCycle > 0 && (
          <div className="border-t border-zinc-200/70 dark:border-zinc-800/70 pt-4">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-3">
              Cycle en cours {lastWithdrawalDate && "(depuis le dernier retrait)"}
            </p>
            <Card className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {currentCycle.length} / {daysPerCycle} jours
                    </span>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(currentCycle.reduce((sum, d) => sum + d.amount, 0))}
                  </div>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: daysPerCycle }, (_, i) => i + 1).map((day) => (
                    <div
                      key={day}
                      className={`h-2 flex-1 rounded ${
                        day <= currentCycle.length
                          ? "bg-zinc-600 dark:bg-zinc-400"
                          : "bg-zinc-200 dark:bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Liste des cycles complétés - TopStep et Phidias CASH (50K+) uniquement */}
        {!isTakeProfitTrader && !(isPhidias && (phidiasSubType === "LIVE" || (phidiasSubType === "CASH" && accountSize === 25000))) && cycles.length > 0 && (
          <div className="border-t border-zinc-200/70 dark:border-zinc-800/70 pt-4">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-3">
              {lastWithdrawalDate ? "Cycle complété (dernier retrait effectué)" : "Cycles complétés"}
            </p>
            <div className="space-y-2">
              {cycles.map((cycle, idx) => (
                <Card
                  key={idx}
                  className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm"
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Cycle {idx + 1}
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {new Date(cycle.startDate).toLocaleDateString("fr-FR")} - {new Date(cycle.endDate).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(cycle.days.reduce((sum, d) => sum + d.amount, 0))}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {daysPerCycle} jours
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Message si pas de cycles - TopStep et Phidias CASH (50K+) uniquement */}
        {!isTakeProfitTrader && !(isPhidias && (phidiasSubType === "LIVE" || (phidiasSubType === "CASH" && accountSize === 25000))) && cycles.length === 0 && currentCycle.length === 0 && daysPerCycle > 0 && (
          <div className="border-t border-zinc-200/70 dark:border-zinc-800/70 pt-4">
            <div className="text-center py-4">
              <Calendar className="h-12 w-12 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {lastWithdrawalDate
                  ? "Aucun cycle complété depuis le dernier retrait"
                  : "Aucun cycle complété pour le moment"
                }
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Tradez pendant {daysPerCycle} jours consécutifs avec au moins {formatCurrency(minDailyProfit)}/jour
              </p>
            </div>
          </div>
        )}
          </div>
        </div>
      )}
    </Card>
  )
}

