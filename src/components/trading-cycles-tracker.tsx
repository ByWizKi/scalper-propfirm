"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Calendar, DollarSign, TrendingUp, Info, Shield } from "lucide-react"

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
}

export function TradingCyclesTracker({ pnlEntries, withdrawals, accountSize, propfirm, maxDrawdown }: TradingCyclesTrackerProps) {
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

  // Trouver les cycles de 5 jours consécutifs avec au moins $150 par jour
  const cycles: { startDate: string, endDate: string, valid: boolean, days: { date: string, amount: number }[] }[] = []

  let currentCycle: { date: string, amount: number }[] = []

  sortedDates.forEach((date) => {
    const amount = dailyPnl[date]

    if (amount >= 150) {
      currentCycle.push({ date, amount })

      if (currentCycle.length === 5) {
        cycles.push({
          startDate: currentCycle[0].date,
          endDate: currentCycle[4].date,
          valid: true,
          days: [...currentCycle]
        })
        currentCycle = []
      }
    } else {
      // Réinitialiser si on a un jour < $150
      currentCycle = []
    }
  })

  const completedCycles = cycles.length

  // PnL réalisé depuis le dernier retrait (pour TopStep)
  const pnlSinceLastWithdrawal = relevantPnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

  // Calculer le montant de retrait disponible
  let availableForWithdrawal = 0
  let buffer = 0
  let bufferReached = false
  let taxRate = 0

  if (isTakeProfitTrader) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isTakeProfitTrader ? "Règles de Retrait" : "Cycles de Trading"}</CardTitle>
        <CardDescription>
          {isTakeProfitTrader
            ? "Atteignez le buffer pour débloquer les retraits"
            : "Complétez des cycles de 5 jours avec minimum $150/jour pour débloquer les retraits"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Résumé */}
        {isTakeProfitTrader ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 truncate">Buffer requis</p>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400 truncate">
                {formatCurrency(buffer)}
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 truncate">
                Balance initiale + DD
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 truncate">Balance actuelle</p>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400 truncate">
                {formatCurrency(currentBalance)}
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 truncate">
                {bufferReached ? "✓ Buffer atteint" : `Reste ${formatCurrency(buffer - currentBalance)}`}
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
                <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 truncate">Disponible (net)</p>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600 dark:text-purple-400 truncate">
                {formatCurrency(Math.max(0, availableForWithdrawal * (1 - taxRate)))}
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 truncate">
                Après taxe de 20%
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 truncate">Cycles complétés</p>
                </div>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {completedCycles}
                </p>
                <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 truncate">
                  {lastWithdrawalDate ? "Depuis le dernier retrait" : "Total"}
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 truncate">Retraits effectués</p>
                </div>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400 truncate">
                  {formatCurrency(totalWithdrawals)}
                </p>
                <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 truncate">
                  {withdrawals.length} retrait{withdrawals.length > 1 ? "s" : ""}
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 truncate">Retrait disponible</p>
                </div>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600 dark:text-purple-400 truncate">
                  {formatCurrency(Math.max(0, availableForWithdrawal))}
                </p>
                <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 truncate">
                  {completedCycles > 0 ? "Cycle complété ✓" : "Complétez un cycle"}
                </p>
              </div>
            </div>

            {/* Message si dernier retrait */}
            {lastWithdrawalDate && (
              <div className="mt-3 p-2 sm:p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-[10px] sm:text-xs text-orange-800 dark:text-orange-200">
                  <span className="font-medium">Dernier retrait :</span> {new Date(lastWithdrawalDate).toLocaleDateString("fr-FR")}
                  {" • "}Le cycle a été réinitialisé
                </p>
              </div>
            )}
          </>
        )}

        {/* Règles de retrait */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 sm:pt-4">
          <div className="flex items-start gap-2 mb-2 sm:mb-3">
            <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1 sm:mb-2">
                Règles de retrait
              </p>
              {isTakeProfitTrader ? (
                <ul className="space-y-1 text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Buffer = Balance initiale ({formatCurrency(accountSize)}) + Drawdown max ({formatCurrency(maxDrawdown || 0)})</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Vous pouvez retirer tout montant au-dessus du buffer une fois qu'il est atteint</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Taxe de 20% : si vous retirez $100, vous recevez $80 (le compte est débité de $100)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Le montant affiché est déjà net de la taxe</span>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-1 text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Un cycle = 5 jours consécutifs avec minimum $150 de profit par jour</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">
                      {totalWithdrawals < 10000
                        ? "Avant $10,000 de retraits : 50% du PnL réalisé depuis le dernier retrait"
                        : "Après $10,000 de retraits : 50% du PnL réalisé depuis le dernier retrait × 90%"
                      }
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words">Vous devez avoir au moins 1 cycle complété pour retirer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5 flex-shrink-0">•</span>
                    <span className="font-medium text-orange-600 break-words">Chaque retrait réinitialise le cycle - vous ne pouvez faire qu'un retrait par cycle</span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Cycle en cours - TopStep uniquement */}
        {!isTakeProfitTrader && currentCycle.length > 0 && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">
              Cycle en cours {lastWithdrawalDate && "(depuis le dernier retrait)"}
            </p>
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {currentCycle.length} / 5 jours
                  </span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  {formatCurrency(currentCycle.reduce((sum, d) => sum + d.amount, 0))}
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((day) => (
                  <div
                    key={day}
                    className={`h-2 flex-1 rounded ${
                      day <= currentCycle.length
                        ? "bg-blue-600"
                        : "bg-zinc-200 dark:bg-zinc-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Liste des cycles complétés - TopStep uniquement */}
        {!isTakeProfitTrader && cycles.length > 0 && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">
              {lastWithdrawalDate ? "Cycle complété (dernier retrait effectué)" : "Cycles complétés"}
            </p>
            <div className="space-y-2">
              {cycles.map((cycle, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Cycle {idx + 1}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {new Date(cycle.startDate).toLocaleDateString("fr-FR")} - {new Date(cycle.endDate).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(cycle.days.reduce((sum, d) => sum + d.amount, 0))}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      5 jours
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message si pas de cycles - TopStep uniquement */}
        {!isTakeProfitTrader && cycles.length === 0 && currentCycle.length === 0 && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <div className="text-center py-4">
              <Calendar className="h-12 w-12 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {lastWithdrawalDate
                  ? "Aucun cycle complété depuis le dernier retrait"
                  : "Aucun cycle complété pour le moment"
                }
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Tradez pendant 5 jours consécutifs avec au moins $150/jour
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

