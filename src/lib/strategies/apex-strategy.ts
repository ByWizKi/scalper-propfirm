/**
 * Stratégie Apex Trader Funding - Implémentation des règles spécifiques
 *
 * Règles principales :
 * - Trailing Drawdown (suit le point le plus haut)
 * - Validation possible dès 1 jour de trading
 * - Buffer = Balance initiale + Max Drawdown (comme TakeProfitTrader)
 * - Cycles de 8 jours pour les retraits (comme TopStep mais 8 jours)
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
      requiresCycles: true, // Système de cycles de 8 jours
      cycleRequirements: {
        daysPerCycle: 8, // 8 jours par cycle (au lieu de 5 pour TopStep)
        minDailyProfit: 0, // Pas de minimum journalier requis
        withdrawalPercentage: 1.0, // 100% du montant au-dessus du buffer
      },
      hasBuffer: true, // Buffer comme TakeProfitTrader
    }
  }

  calculateBuffer(accountSize: number): number {
    // Buffer = Balance initiale + Max Drawdown (comme TakeProfitTrader)
    const rules = this.getAccountRules(accountSize)
    if (!rules) return 0
    return accountSize + rules.maxDrawdown
  }

  calculateAvailableForWithdrawal(
    accountSize: number,
    totalPnl: number,
    totalWithdrawals: number,
    pnlEntries: Array<{ date: Date; amount: number }>
  ): number {
    const buffer = this.calculateBuffer(accountSize)
    const currentBalance = accountSize + totalPnl - totalWithdrawals

    // 1. Vérifier si le buffer est atteint
    if (currentBalance < buffer) {
      return 0 // Pas de retrait possible avant d'atteindre le buffer
    }

    // 2. Calculer le nombre de jours de trading (cycles de 8 jours)
    const tradingDays = new Set(
      pnlEntries.map((entry) => format(new Date(entry.date), "yyyy-MM-dd"))
    ).size

    // 3. Calculer le nombre de cycles complétés (8 jours = 1 cycle)
    const completedCycles = Math.floor(tradingDays / 8)

    // 4. Pas de retrait possible avant d'avoir complété au moins 1 cycle
    if (completedCycles === 0) {
      return 0
    }

    // 5. Montant disponible = tout ce qui est au-dessus du buffer
    const availableAmount = currentBalance - buffer

    return Math.max(0, availableAmount)
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
