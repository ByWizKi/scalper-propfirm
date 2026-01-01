/**
 * Stratégie Tradeify - Implémentation des règles spécifiques
 *
 * Types de comptes Tradeify :
 * 1. GROWTH (50k, 100k, 150k)
 * 2. SELECT (50k, 100k, 150k) - avec options Flex ou Daily
 * 3. LIGHTNING (25k, 50k, 100k, 150k) - Instant Funded
 */

import { PropfirmStrategy } from "./propfirm-strategy.interface"
import { AccountRules, WithdrawalRules } from "@/types/account.types"
import { format } from "date-fns"
import {
  getTradeifyAccountType,
  getSelectPayoutOption,
} from "@/lib/tradeify-account-type"

export class TradeifyStrategy implements PropfirmStrategy {
  // Règles d'évaluation pour Growth
  private readonly growthEvalRules: Record<number, AccountRules> = {
    50000: {
      profitTarget: 3000,
      maxDrawdown: 2000,
      dailyLossLimit: 1250,
      consistencyRule: 0, // Aucune
      minTradingDays: 1,
      maxContracts: { mini: 4, micro: 40 },
    },
    100000: {
      profitTarget: 6000,
      maxDrawdown: 3500,
      dailyLossLimit: 2500,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 8, micro: 80 },
    },
    150000: {
      profitTarget: 9000,
      maxDrawdown: 5000,
      dailyLossLimit: 3750,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 12, micro: 120 },
    },
  }

  // Règles d'évaluation pour Select
  private readonly selectEvalRules: Record<number, AccountRules> = {
    50000: {
      profitTarget: 2500,
      maxDrawdown: 2000,
      dailyLossLimit: 0, // Aucune
      consistencyRule: 40, // 40%
      minTradingDays: 3,
      maxContracts: { mini: 4, micro: 40 },
    },
    100000: {
      profitTarget: 6000,
      maxDrawdown: 3000,
      dailyLossLimit: 0,
      consistencyRule: 40,
      minTradingDays: 3,
      maxContracts: { mini: 8, micro: 80 },
    },
    150000: {
      profitTarget: 9000,
      maxDrawdown: 4500,
      dailyLossLimit: 0,
      consistencyRule: 40,
      minTradingDays: 3,
      maxContracts: { mini: 12, micro: 120 },
    },
  }

  getName(): string {
    return "Tradeify"
  }

  getAccountRules(
    accountSize: number,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): AccountRules | null {
    // Lightning n'a pas de règles d'évaluation (instant funded)
    const tradeifyType = getTradeifyAccountType(accountName, notes)
    if (tradeifyType === "LIGHTNING") {
      return {
        profitTarget: 0,
        maxDrawdown: 0,
        dailyLossLimit: 0,
        consistencyRule: 0,
        minTradingDays: 0,
      }
    }

    // Growth
    if (tradeifyType === "GROWTH") {
      return this.growthEvalRules[accountSize] || null
    }

    // Select
    if (tradeifyType === "SELECT") {
      return this.selectEvalRules[accountSize] || null
    }

    return null
  }

  getWithdrawalRules(
    accountSize?: number,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): WithdrawalRules {
    if (!accountSize) {
      return {
        taxRate: 0.1, // 90% pour le trader = 10% de taxe
        requiresCycles: false,
        hasBuffer: false,
      }
    }

    const tradeifyType = getTradeifyAccountType(accountName, notes)

    // Growth
    if (tradeifyType === "GROWTH") {
      return {
        taxRate: 0.1, // 90% pour le trader
        requiresCycles: false, // À tout moment une fois les conditions remplies
        hasBuffer: false,
      }
    }

    // Select - Flex
    if (tradeifyType === "SELECT") {
      const payoutOption = getSelectPayoutOption(accountName, notes)
      if (payoutOption === "FLEX") {
        return {
          taxRate: 0.1, // 90% pour le trader
          requiresCycles: true,
          cycleRequirements: {
            daysPerCycle: 5, // Tous les 5 jours profitables
            minDailyProfit: accountSize === 50000 ? 150 : accountSize === 100000 ? 200 : 250,
            withdrawalPercentage: 0.5, // Jusqu'à 50% des profits
          },
          hasBuffer: false,
        }
      }
      // Daily
      return {
        taxRate: 0.1, // 90% pour le trader
        requiresCycles: false, // Quotidienne
        hasBuffer: true, // Buffer à maintenir au-dessus du drawdown
      }
    }

    // Lightning
    if (tradeifyType === "LIGHTNING") {
      return {
        taxRate: 0.1, // 90% pour le trader
        requiresCycles: false, // À tout moment une fois les conditions remplies
        hasBuffer: false,
      }
    }

    return {
      taxRate: 0.1,
      requiresCycles: false,
      hasBuffer: false,
    }
  }

  calculateBuffer(accountSize: number): number {
    // Buffer seulement pour Select Daily
    const bufferConfig: Record<number, number> = {
      50000: 2100, // 2 100$ au-dessus du drawdown
      100000: 2600, // 2 600$ au-dessus du drawdown
      150000: 3600, // 3 600$ au-dessus du drawdown
    }
    return bufferConfig[accountSize] || 0
  }

  calculateAvailableForWithdrawal(
    accountSize: number,
    totalPnl: number,
    totalWithdrawals: number,
    pnlEntries: Array<{ date: Date; amount: number }>,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): number {
    const tradeifyType = getTradeifyAccountType(accountName, notes)
    const currentBalance = accountSize + totalPnl - totalWithdrawals
    // const availablePnl = Math.max(0, totalPnl)

    // Group PnL by day
    const dailyPnl: Record<string, number> = {}
    pnlEntries.forEach((entry) => {
      const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
      dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
    })

    // Growth
    if (tradeifyType === "GROWTH") {
      return this.calculateGrowthWithdrawal(
        accountSize,
        totalPnl,
        totalWithdrawals,
        pnlEntries,
        dailyPnl,
        currentBalance
      )
    }

    // Select
    if (tradeifyType === "SELECT") {
      const payoutOption = getSelectPayoutOption(accountName, notes)
      if (payoutOption === "FLEX") {
        return this.calculateSelectFlexWithdrawal(
          accountSize,
          totalPnl,
          totalWithdrawals,
          pnlEntries,
          dailyPnl
        )
      }
      // Daily
      return this.calculateSelectDailyWithdrawal(
        accountSize,
        totalPnl,
        totalWithdrawals,
        pnlEntries,
        dailyPnl,
        currentBalance
      )
    }

    // Lightning
    if (tradeifyType === "LIGHTNING") {
      return this.calculateLightningWithdrawal(
        accountSize,
        totalPnl,
        totalWithdrawals,
        pnlEntries,
        dailyPnl
      )
    }

    return 0
  }

  private calculateGrowthWithdrawal(
    accountSize: number,
    totalPnl: number,
    totalWithdrawals: number,
    pnlEntries: Array<{ date: Date; amount: number }>,
    dailyPnl: Record<string, number>,
    currentBalance: number
  ): number {
    // Balance minimum pour request
    const minBalanceConfig: Record<number, number> = {
      50000: 53000,
      100000: 104500,
      150000: 156500,
    }
    const minBalance = minBalanceConfig[accountSize]
    if (!minBalance || currentBalance < minBalance) {
      return 0
    }

    // Consistency : 35%
    const biggestDay = Math.max(...Object.values(dailyPnl).filter((v) => v > 0), 0)
    const consistencyPercentage = totalPnl > 0 ? (biggestDay / totalPnl) * 100 : 0
    if (consistencyPercentage > 35) {
      return 0
    }

    // Minimum de jours de trading profitables : 5 jours avec profit minimum
    const minDailyProfit = accountSize === 50000 ? 150 : accountSize === 100000 ? 200 : 250
    const profitableDays = Object.values(dailyPnl).filter(
      (amount) => amount >= minDailyProfit
    ).length
    if (profitableDays < 5) {
      return 0
    }

    // Compter le nombre de payouts déjà effectués
    const payoutCount = Math.floor(totalWithdrawals / 1000) // Approximation basée sur les montants typiques

    // Maximum payout selon le numéro de payout
    const maxPayoutConfig: Record<number, Record<number, number>> = {
      50000: {
        1: 1500,
        2: 2000,
        3: 2500,
        4: 3000,
      },
      100000: {
        1: 2000,
        2: 2500,
        3: 3000,
        4: 4000,
      },
      150000: {
        1: 2500,
        2: 3000,
        3: 4000,
        4: 5000,
      },
    }

    const payoutIndex = Math.min(payoutCount + 1, 4)
    const maxPayout = maxPayoutConfig[accountSize]?.[payoutIndex] || 0

    // Minimum payout
    const minPayout = accountSize === 50000 ? 500 : accountSize === 100000 ? 1000 : 1500

    // Profit disponible (90% pour le trader)
    const availableProfit = Math.max(0, totalPnl - totalWithdrawals) * 0.9

    // Le montant disponible est limité par le max payout
    const available = Math.min(availableProfit, maxPayout)

    return Math.max(0, available < minPayout ? 0 : available)
  }

  private calculateSelectFlexWithdrawal(
    accountSize: number,
    totalPnl: number,
    totalWithdrawals: number,
    pnlEntries: Array<{ date: Date; amount: number }>,
    dailyPnl: Record<string, number>
  ): number {
    // Minimum de jours de trading profitables : 5 jours avec profit minimum
    const minDailyProfit = accountSize === 50000 ? 150 : accountSize === 100000 ? 200 : 250
    const profitableDays = Object.values(dailyPnl).filter(
      (amount) => amount >= minDailyProfit
    ).length

    // Tous les 5 jours profitables
    if (profitableDays < 5 || profitableDays % 5 !== 0) {
      return 0
    }

    // Pas de consistency pour Flex
    // Jusqu'à 50% des profits, avec cap
    const capConfig: Record<number, number> = {
      50000: 3000,
      100000: 4000,
      150000: 5000,
    }
    const cap = capConfig[accountSize] || 0

    const availableProfit = (totalPnl - totalWithdrawals) * 0.5 * 0.9 // 50% des profits, 90% pour le trader

    return Math.min(availableProfit, cap)
  }

  private calculateSelectDailyWithdrawal(
    accountSize: number,
    totalPnl: number,
    totalWithdrawals: number,
    pnlEntries: Array<{ date: Date; amount: number }>,
    dailyPnl: Record<string, number>,
    currentBalance: number
  ): number {
    // Daily Continuity : profit > 0$ depuis le dernier payout
    // On vérifie que le profit total est supérieur aux retraits
    if (totalPnl <= totalWithdrawals) {
      return 0
    }

    // Buffer à maintenir au-dessus du drawdown
    const buffer = this.calculateBuffer(accountSize)
    const drawdownConfig: Record<number, number> = {
      50000: 2000,
      100000: 2500,
      150000: 3500,
    }
    const maxDrawdown = drawdownConfig[accountSize] || 0
    const minBalance = accountSize - maxDrawdown + buffer

    if (currentBalance < minBalance) {
      return 0
    }

    // Jusqu'à 2x les profits depuis dernier payout, avec cap
    const capConfig: Record<number, number> = {
      50000: 1000,
      100000: 1500,
      150000: 2500,
    }
    const cap = capConfig[accountSize] || 0

    const profitSinceLastPayout = totalPnl - totalWithdrawals
    const available = Math.min(profitSinceLastPayout * 2 * 0.9, cap) // 2x les profits, 90% pour le trader

    // Minimum payout : 250$
    return Math.max(0, available < 250 ? 0 : available)
  }

  private calculateLightningWithdrawal(
    accountSize: number,
    totalPnl: number,
    totalWithdrawals: number,
    pnlEntries: Array<{ date: Date; amount: number }>,
    dailyPnl: Record<string, number>
  ): number {
    // Compter le nombre de payouts déjà effectués
    const payoutCount = Math.floor(totalWithdrawals / 1000) // Approximation

    // Consistency selon le numéro de payout
    const consistencyConfig: Record<number, number> = {
      0: 20, // Premier payout : 20%
      1: 25, // Second payout : 25%
      2: 30, // Payouts suivants : 30%
    }
    const consistencyRule = consistencyConfig[Math.min(payoutCount, 2)] || 30

    // Vérifier la consistency
    const biggestDay = Math.max(...Object.values(dailyPnl).filter((v) => v > 0), 0)
    const consistencyPercentage = totalPnl > 0 ? (biggestDay / totalPnl) * 100 : 0
    if (consistencyPercentage > consistencyRule) {
      return 0
    }

    // Profit goals (reset après chaque payout)
    const profitGoalConfig: Record<number, Record<number, number>> = {
      25000: {
        0: 1500, // Premier payout
        1: 1000, // Payouts suivants
      },
      50000: {
        0: 3000,
        1: 2000,
      },
      100000: {
        0: 6000,
        1: 3500,
      },
      150000: {
        0: 9000,
        1: 4500,
      },
    }

    const profitGoalIndex = payoutCount === 0 ? 0 : 1
    const profitGoal = profitGoalConfig[accountSize]?.[profitGoalIndex] || 0

    // Profit depuis le dernier payout
    const profitSinceLastPayout = totalPnl - totalWithdrawals
    if (profitSinceLastPayout < profitGoal) {
      return 0
    }

    // Maximum payout selon le numéro de payout
    const maxPayoutConfig: Record<number, Record<number, number>> = {
      25000: {
        1: 1000, // Payout 1-3
        4: 1000, // Payout 4+
      },
      50000: {
        1: 2000,
        4: 2500,
      },
      100000: {
        1: 2500,
        4: 3000,
      },
      150000: {
        1: 3000,
        4: 3500,
      },
    }

    const payoutIndex = payoutCount < 3 ? 1 : 4
    const maxPayout = maxPayoutConfig[accountSize]?.[payoutIndex] || 0

    // Profit disponible (90% pour le trader)
    const availableProfit = profitSinceLastPayout * 0.9

    // Le montant disponible est limité par le max payout
    const available = Math.min(availableProfit, maxPayout)

    // Minimum payout : 1000$
    return Math.max(0, available < 1000 ? 0 : available)
  }

  isEligibleForValidation(
    accountSize: number,
    pnlEntries: Array<{ date: Date; amount: number }>,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): boolean {
    const tradeifyType = getTradeifyAccountType(accountName, notes)

    // Lightning n'a pas d'évaluation (instant funded)
    if (tradeifyType === "LIGHTNING") {
      return false
    }

    const rules = this.getAccountRules(accountSize, accountType, accountName, notes)
    if (!rules) return false

    const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

    // Vérifier l'objectif de profit
    if (totalPnl < rules.profitTarget) return false

    // Vérifier le nombre minimum de jours de trading
    const tradingDays = new Set(
      pnlEntries.map((entry) => format(new Date(entry.date), "yyyy-MM-dd"))
    ).size

    if (tradingDays < (rules.minTradingDays || 1)) return false

    // Vérifier le drawdown EOD
    let peak = accountSize
    let currentBalance = accountSize
    let maxDrawdownExceeded = false

    // Pour Select : lock à +100$ du starting balance
    const lockAmount = tradeifyType === "SELECT" ? 100 : 0
    const startingBalance = accountSize + lockAmount

    pnlEntries
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((entry) => {
        currentBalance += entry.amount
        if (currentBalance > peak) peak = currentBalance

        // Drawdown EOD : depuis le peak ou le starting balance (pour Select)
        const drawdown = Math.max(peak - currentBalance, startingBalance - currentBalance)
        if (drawdown > rules.maxDrawdown) {
          maxDrawdownExceeded = true
        }
      })

    // Vérifier la consistency (pour Select)
    if (tradeifyType === "SELECT" && rules.consistencyRule > 0) {
      const dailyPnl: Record<string, number> = {}
      pnlEntries.forEach((entry) => {
        const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
        dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
      })

      const biggestDay = Math.max(...Object.values(dailyPnl).filter((v) => v > 0), 0)
      const consistencyPercentage = totalPnl > 0 ? (biggestDay / totalPnl) * 100 : 0
      if (consistencyPercentage > rules.consistencyRule) {
        return false
      }
    }

    // Vérifier la daily loss limit (pour Growth - soft breach)
    if (tradeifyType === "GROWTH" && rules.dailyLossLimit > 0) {
      const dailyPnl: Record<string, number> = {}
      pnlEntries.forEach((entry) => {
        const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
        dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
      })

      // Soft breach : arrêt du trading pour la journée, mais pas d'échec du compte
      // On vérifie quand même qu'aucun jour n'a dépassé la limite
      const hasExceededDailyLimit = Object.values(dailyPnl).some(
        (amount) => amount < -rules.dailyLossLimit
      )
      if (hasExceededDailyLimit) {
        return false
      }
    }

    return !maxDrawdownExceeded
  }
}

