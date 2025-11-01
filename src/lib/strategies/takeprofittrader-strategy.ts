/**
 * Stratégie TakeProfitTrader - Implémentation des règles spécifiques
 */

import { PropfirmStrategy } from "./propfirm-strategy.interface"
import { AccountRules, WithdrawalRules } from "@/types/account.types"
import { format } from "date-fns"

export class TakeProfitTraderStrategy implements PropfirmStrategy {
  private readonly rulesConfig: Record<number, AccountRules> = {
    25000: {
      profitTarget: 1500,
      maxDrawdown: 1500,
      dailyLossLimit: 1500,
      consistencyRule: 50,
      minTradingDays: 5,
    },
    50000: {
      profitTarget: 3000,
      maxDrawdown: 2000,
      dailyLossLimit: 2000,
      consistencyRule: 50,
      minTradingDays: 5,
    },
    75000: {
      profitTarget: 4500,
      maxDrawdown: 2500,
      dailyLossLimit: 2500,
      consistencyRule: 50,
      minTradingDays: 5,
    },
    100000: {
      profitTarget: 6000,
      maxDrawdown: 3000,
      dailyLossLimit: 3000,
      consistencyRule: 50,
      minTradingDays: 5,
    },
    150000: {
      profitTarget: 9000,
      maxDrawdown: 4500,
      dailyLossLimit: 4500,
      consistencyRule: 50,
      minTradingDays: 5,
    },
  }

  getName(): string {
    return "TakeProfitTrader"
  }

  getAccountRules(accountSize: number): AccountRules | null {
    return this.rulesConfig[accountSize] || null
  }

  getWithdrawalRules(): WithdrawalRules {
    return {
      taxRate: 0.2, // 20% de taxe
      requiresCycles: false,
      hasBuffer: true,
    }
  }

  calculateBuffer(accountSize: number): number {
    const rules = this.getAccountRules(accountSize)
    if (!rules) return 0
    return accountSize + rules.maxDrawdown
  }

  calculateAvailableForWithdrawal(
    accountSize: number,
    totalPnl: number,
    totalWithdrawals: number,
    _pnlEntries: Array<{ date: Date; amount: number }>
  ): number {
    const buffer = this.calculateBuffer(accountSize)
    const currentBalance = accountSize + totalPnl - totalWithdrawals

    // Seulement ce qui est au-dessus du buffer est disponible
    return Math.max(0, currentBalance - buffer)
  }

  isEligibleForValidation(
    accountSize: number,
    pnlEntries: Array<{ date: Date; amount: number }>
  ): boolean {
    const rules = this.getAccountRules(accountSize)
    if (!rules) return false

    const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

    // Vérifier l'objectif de profit
    if (totalPnl < rules.profitTarget) return false

    // Vérifier le nombre de jours de trading
    const tradingDays = new Set(
      pnlEntries.map((entry) => format(new Date(entry.date), "yyyy-MM-dd"))
    ).size

    if (rules.minTradingDays && tradingDays < rules.minTradingDays) {
      return false
    }

    // Vérifier la règle de cohérence
    const dailyPnl: Record<string, number> = {}
    pnlEntries.forEach((entry) => {
      const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
      dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
    })

    const maxDayProfit = Math.max(...Object.values(dailyPnl).filter((v) => v > 0))
    const consistencyCheck = maxDayProfit <= totalPnl * (rules.consistencyRule / 100)

    // Vérifier le drawdown end-of-day
    let maxDrawdownExceeded = false
    const dailyBalances: Record<string, number> = {}
    let currentBalance = accountSize

    pnlEntries
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((entry) => {
        const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
        if (!dailyBalances[dateKey]) {
          dailyBalances[dateKey] = currentBalance
        }
        currentBalance += entry.amount
        dailyBalances[dateKey] = currentBalance

        // Vérifier le drawdown à la fin de chaque jour
        const drawdown = accountSize - dailyBalances[dateKey]
        if (drawdown > rules.maxDrawdown) {
          maxDrawdownExceeded = true
        }
      })

    return consistencyCheck && !maxDrawdownExceeded
  }
}

