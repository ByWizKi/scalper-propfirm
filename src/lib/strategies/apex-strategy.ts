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
      consistencyRule: 30, // 30% Windfall Rule pour les payouts
      minTradingDays: 1,
      maxContracts: { mini: 4, micro: 40 },
    },
    50000: {
      profitTarget: 3000,
      maxDrawdown: 2500,
      dailyLossLimit: 0,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 10, micro: 100 },
    },
    75000: {
      profitTarget: 4500,
      maxDrawdown: 2750,
      dailyLossLimit: 0,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 12, micro: 120 },
    },
    100000: {
      profitTarget: 6000,
      maxDrawdown: 3000,
      dailyLossLimit: 0,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 14, micro: 140 },
    },
    150000: {
      profitTarget: 9000,
      maxDrawdown: 5000,
      dailyLossLimit: 0,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 17, micro: 170 },
    },
    250000: {
      profitTarget: 15000,
      maxDrawdown: 6500,
      dailyLossLimit: 0,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 27, micro: 270 },
    },
    300000: {
      profitTarget: 20000,
      maxDrawdown: 7500,
      dailyLossLimit: 0,
      consistencyRule: 30,
      minTradingDays: 1,
      maxContracts: { mini: 35, micro: 350 },
    },
  }

  getName(): string {
    return "Apex Trader Funding"
  }

  getAccountRules(
    accountSize: number,
    _accountType?: string,
    _accountName?: string,
    _notes?: string | null
  ): AccountRules | null {
    return this.rulesConfig[accountSize] || null
  }

  getWithdrawalRules(
    _accountSize?: number,
    _accountType?: string,
    _accountName?: string,
    _notes?: string | null
  ): WithdrawalRules {
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
    // Safety Net = Balance initiale + Max Drawdown + $100
    // Le trailing drawdown s'arrête une fois le safety net atteint
    const rules = this.getAccountRules(accountSize)
    if (!rules) return 0
    return accountSize + rules.maxDrawdown + 100
  }

  calculateAvailableForWithdrawal(
    accountSize: number,
    totalPnl: number,
    totalWithdrawals: number,
    pnlEntries: Array<{ date: Date; amount: number }>,
    _accountType?: string,
    _accountName?: string,
    _notes?: string | null
  ): number {
    const safetyNet = this.calculateBuffer(accountSize)
    const currentBalance = accountSize + totalPnl - totalWithdrawals

    // 1. Vérifier si le safety net est atteint
    if (currentBalance < safetyNet) {
      return 0 // Pas de retrait possible avant d'atteindre le safety net
    }

    // 2. Grouper les PnL par jour
    const dailyPnl: Record<string, number> = {}
    pnlEntries.forEach((entry) => {
      const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
      dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
    })

    // 3. Compter les jours de trading (minimum 8 jours)
    const tradingDays = Object.keys(dailyPnl).length
    if (tradingDays < 8) {
      return 0 // Minimum 8 jours de trading requis
    }

    // 4. Compter les jours à +$50 de profit ou plus (minimum 5 jours requis)
    const profitableDays = Object.values(dailyPnl).filter((amount) => amount >= 50).length
    if (profitableDays < 5) {
      return 0 // Minimum 5 jours à +$50 de profit requis
    }

    // 5. Calculer le nombre de cycles complétés (8 jours = 1 cycle)
    const completedCycles = Math.floor(tradingDays / 8)

    // 6. Pas de retrait possible avant d'avoir complété au moins 1 cycle
    if (completedCycles === 0) {
      return 0
    }

    // 7. Calculer le montant disponible au-dessus du safety net
    const amountAboveSafetyNet = currentBalance - safetyNet

    // 8. Appliquer les règles de payout :
    // - 100% des premiers $25,000 de profit par compte
    // - 90% ensuite
    const totalProfit = Math.max(0, totalPnl)
    const profitAfterWithdrawals = totalProfit - totalWithdrawals

    let withdrawableAmount = 0
    if (profitAfterWithdrawals <= 25000) {
      // 100% des premiers $25,000
      withdrawableAmount = Math.min(amountAboveSafetyNet, profitAfterWithdrawals)
    } else {
      // 100% des premiers $25,000 + 90% du reste
      const first25000 = Math.min(25000, profitAfterWithdrawals)
      const remaining = Math.max(0, profitAfterWithdrawals - 25000)
      withdrawableAmount = first25000 + remaining * 0.9
      // Ne pas dépasser le montant au-dessus du safety net
      withdrawableAmount = Math.min(withdrawableAmount, amountAboveSafetyNet)
    }

    return Math.max(0, withdrawableAmount)
  }

  isEligibleForValidation(
    accountSize: number,
    pnlEntries: Array<{ date: Date; amount: number }>,
    _accountType?: string,
    _accountName?: string,
    _notes?: string | null
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
