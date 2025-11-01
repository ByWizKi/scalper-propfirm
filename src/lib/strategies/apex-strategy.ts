/**
 * Stratégie Apex Trader Funding - Implémentation des règles spécifiques
 *
 * Règles principales :
 * - Trailing Drawdown (suit le point le plus haut)
 * - Validation possible dès 1 jour de trading
 * - Pas de système de cycles ou de buffer
 * - Pas de taxes sur les retraits
 */

import { PropfirmStrategy } from "./propfirm-strategy.interface"
import { AccountRules, WithdrawalRules } from "@/types/account.types"
import { format } from "date-fns"

export class ApexStrategy implements PropfirmStrategy {
  private readonly rulesConfig: Record<number, AccountRules> = {
    25000: {
      profitTarget: 1500,
      maxDrawdown: 1500,
      dailyLossLimit: 0, // Pas de limite journalière
      consistencyRule: 0, // Pas de règle de cohérence
      minTradingDays: 1,
      maxContracts: { mini: 4, micro: 40 },
    },
    50000: {
      profitTarget: 3000,
      maxDrawdown: 2500,
      dailyLossLimit: 0,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 10, micro: 100 },
    },
    100000: {
      profitTarget: 6000,
      maxDrawdown: 3000,
      dailyLossLimit: 0,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 14, micro: 140 },
    },
    150000: {
      profitTarget: 9000,
      maxDrawdown: 5000,
      dailyLossLimit: 0,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 17, micro: 170 },
    },
    250000: {
      profitTarget: 15000,
      maxDrawdown: 6500,
      dailyLossLimit: 0,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 27, micro: 270 },
    },
    300000: {
      profitTarget: 20000,
      maxDrawdown: 7500,
      dailyLossLimit: 0,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 35, micro: 350 },
    },
  }

  getName(): string {
    return "Apex Trader Funding"
  }

  getAccountRules(accountSize: number): AccountRules | null {
    return this.rulesConfig[accountSize] || null
  }

  getWithdrawalRules(): WithdrawalRules {
    return {
      taxRate: 0, // Pas de taxe chez Apex
      requiresCycles: false, // Pas de système de cycles
      hasBuffer: false, // Pas de buffer
    }
  }

  calculateBuffer(_accountSize: number): number {
    return 0 // Apex n'a pas de buffer
  }

  calculateAvailableForWithdrawal(
    _accountSize: number,
    totalPnl: number,
    _totalWithdrawals: number,
    _pnlEntries: Array<{ date: Date; amount: number }>
  ): number {
    // Apex : simple retrait du profit net sans restrictions
    return Math.max(0, totalPnl)
  }

  isEligibleForValidation(
    accountSize: number,
    pnlEntries: Array<{ date: Date; amount: number }>
  ): boolean {
    const rules = this.getAccountRules(accountSize)
    if (!rules) return false

    // Calculer le total PnL
    const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

    // Vérifier l'objectif de profit
    if (totalPnl < rules.profitTarget) return false

    // Vérifier le nombre minimum de jours de trading
    const tradingDays = new Set(
      pnlEntries.map((entry) => format(new Date(entry.date), "yyyy-MM-dd"))
    ).size

    if (tradingDays < (rules.minTradingDays || 1)) return false

    // Vérifier le trailing drawdown
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

    return !maxDrawdownExceeded
  }
}
