/**
 * Stratégie TopStep - Implémentation des règles spécifiques
 */

import { PropfirmStrategy } from "./propfirm-strategy.interface"
import { AccountRules, WithdrawalRules } from "@/types/account.types"
import { format } from "date-fns"

export class TopStepStrategy implements PropfirmStrategy {
  private readonly rulesConfig: Record<number, AccountRules> = {
    50000: {
      profitTarget: 3000,
      maxDrawdown: 2000,
      dailyLossLimit: 2000,
      consistencyRule: 50,
      maxContracts: { mini: 5, micro: 50 },
    },
    100000: {
      profitTarget: 6000,
      maxDrawdown: 3000,
      dailyLossLimit: 3000,
      consistencyRule: 50,
      maxContracts: { mini: 10, micro: 100 },
    },
    150000: {
      profitTarget: 9000,
      maxDrawdown: 4500,
      dailyLossLimit: 4500,
      consistencyRule: 50,
      maxContracts: { mini: 15, micro: 150 },
    },
  }

  getName(): string {
    return "TopStep"
  }

  getAccountRules(accountSize: number): AccountRules | null {
    return this.rulesConfig[accountSize] || null
  }

  getWithdrawalRules(): WithdrawalRules {
    return {
      taxRate: 0, // Pas de taxe chez TopStep
      requiresCycles: true,
      cycleRequirements: {
        daysPerCycle: 5,
        minDailyProfit: 150,
        withdrawalPercentage: 0.5, // 50%
      },
      hasBuffer: false,
    }
  }

  calculateBuffer(_accountSize: number): number {
    return 0 // TopStep n'a pas de buffer
  }

  calculateAvailableForWithdrawal(
    accountSize: number,
    totalPnl: number,
    totalWithdrawals: number,
    pnlEntries: Array<{ date: Date; amount: number }>
  ): number {
    // Grouper les PnL par jour
    const dailyPnl: Record<string, number> = {}
    pnlEntries.forEach((entry) => {
      const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
      dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
    })

    // Compter les jours à +150$ ou plus
    const qualifyingDays = Object.values(dailyPnl).filter(
      (amount) => amount >= 150
    ).length

    // Calculer le nombre de cycles complétés (5 jours = 1 cycle)
    const completedCycles = Math.floor(qualifyingDays / 5)

    // PnL réalisé (profit uniquement)
    const realizedPnl = Math.max(0, totalPnl)

    const withdrawalPercentage = 0.5 // 50%
    let additionalMultiplier = 1.0

    // Si plus de $10,000 de retraits, passer à 90%
    if (totalWithdrawals >= 10000) {
      additionalMultiplier = 0.9 // 90%
    }

    // Calculer le montant disponible
    let available = 0
    if (completedCycles > 0) {
      available = realizedPnl * withdrawalPercentage * additionalMultiplier
    }

    return Math.max(0, available)
  }

  isEligibleForValidation(
    accountSize: number,
    pnlEntries: Array<{ date: Date; amount: number }>
  ): boolean {
    const rules = this.getAccountRules(_accountSize)
    if (!rules) return false

    const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

    // Vérifier l'objectif de profit
    if (totalPnl < rules.profitTarget) return false

    // Vérifier la règle de cohérence (plus grosse journée ≤ 50% du total)
    const dailyPnl: Record<string, number> = {}
    pnlEntries.forEach((entry) => {
      const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
      dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
    })

    const maxDayProfit = Math.max(...Object.values(dailyPnl).filter((v) => v > 0))
    const consistencyCheck = maxDayProfit <= totalPnl * (rules.consistencyRule / 100)

    // Vérifier le drawdown
    let peak = accountSize
    let currentBalance = accountSize
    let maxDrawdownExceeded = false

    pnlEntries
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((entry) => {
        currentBalance += entry.amount
        if (currentBalance > peak) peak = currentBalance
        const drawdown = peak - currentBalance
        if (drawdown > rules.maxDrawdown) maxDrawdownExceeded = true
      })

    return consistencyCheck && !maxDrawdownExceeded
  }
}

