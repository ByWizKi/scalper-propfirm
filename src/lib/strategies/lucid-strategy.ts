/**
 * Stratégie Lucid Trading - Implémentation des règles spécifiques
 *
 * Trois types de comptes :
 * - LucidFlex : Évaluation One-Step (le plus flexible)
 * - LucidPro : Évaluation classique
 * - LucidDirect/LucidLive : Instant Funded (Direct-to-Funded)
 */

import { PropfirmStrategy } from "./propfirm-strategy.interface"
import { AccountRules, WithdrawalRules } from "@/types/account.types"
import { format } from "date-fns"
import { getLucidAccountType, LucidAccountType } from "@/lib/lucid-account-type"

export class LucidStrategy implements PropfirmStrategy {
  // Configuration des règles d'évaluation par type et taille
  private readonly rulesConfig: Record<LucidAccountType, Record<number, AccountRules>> = {
    FLEX: {
      25000: {
        profitTarget: 1250,
        maxDrawdown: 1000, // EOD trailing
        dailyLossLimit: 0, // Aucune
        consistencyRule: 50,
        minTradingDays: 0, // Non spécifié mais généralement 5 implicite
        maxContracts: { mini: 2, micro: 20 },
      },
      50000: {
        profitTarget: 3000,
        maxDrawdown: 2000, // EOD trailing
        dailyLossLimit: 0,
        consistencyRule: 50,
        minTradingDays: 0,
        maxContracts: { mini: 4, micro: 40 },
      },
      100000: {
        profitTarget: 6000,
        maxDrawdown: 3000, // EOD trailing
        dailyLossLimit: 0,
        consistencyRule: 50,
        minTradingDays: 0,
        maxContracts: { mini: 6, micro: 60 },
      },
      150000: {
        profitTarget: 9000,
        maxDrawdown: 4500, // EOD trailing
        dailyLossLimit: 0,
        consistencyRule: 50,
        minTradingDays: 0,
        maxContracts: { mini: 10, micro: 100 },
      },
    },
    PRO: {
      25000: {
        profitTarget: 1250,
        maxDrawdown: 1000, // EOD trailing
        dailyLossLimit: 600,
        consistencyRule: 35,
        minTradingDays: 5,
        maxContracts: { mini: 2, micro: 20 },
      },
      50000: {
        profitTarget: 3000,
        maxDrawdown: 2000, // EOD trailing
        dailyLossLimit: 800,
        consistencyRule: 35,
        minTradingDays: 5,
        maxContracts: { mini: 4, micro: 40 },
      },
      100000: {
        profitTarget: 6000,
        maxDrawdown: 3000, // EOD trailing
        dailyLossLimit: 1000,
        consistencyRule: 40,
        minTradingDays: 5,
        maxContracts: { mini: 6, micro: 60 },
      },
      150000: {
        profitTarget: 9000,
        maxDrawdown: 4500, // EOD trailing
        dailyLossLimit: 1200,
        consistencyRule: 40,
        minTradingDays: 5,
        maxContracts: { mini: 10, micro: 100 },
      },
    },
    DIRECT: {
      25000: {
        profitTarget: 0, // Pas d'évaluation (instant funded)
        maxDrawdown: 1000, // EOD
        dailyLossLimit: 600,
        consistencyRule: 20,
        minTradingDays: 0,
        maxContracts: { mini: 2, micro: 20 },
      },
      50000: {
        profitTarget: 0,
        maxDrawdown: 2000, // EOD
        dailyLossLimit: 800,
        consistencyRule: 20,
        minTradingDays: 0,
        maxContracts: { mini: 4, micro: 40 },
      },
      100000: {
        profitTarget: 0,
        maxDrawdown: 3000, // EOD
        dailyLossLimit: 1000,
        consistencyRule: 20,
        minTradingDays: 0,
        maxContracts: { mini: 6, micro: 60 },
      },
      150000: {
        profitTarget: 0,
        maxDrawdown: 4500, // EOD
        dailyLossLimit: 1200,
        consistencyRule: 20,
        minTradingDays: 0,
        maxContracts: { mini: 10, micro: 100 },
      },
    },
    LIVE: {
      // Même que DIRECT
      25000: {
        profitTarget: 0,
        maxDrawdown: 1000,
        dailyLossLimit: 600,
        consistencyRule: 20,
        minTradingDays: 0,
        maxContracts: { mini: 2, micro: 20 },
      },
      50000: {
        profitTarget: 0,
        maxDrawdown: 2000,
        dailyLossLimit: 800,
        consistencyRule: 20,
        minTradingDays: 0,
        maxContracts: { mini: 4, micro: 40 },
      },
      100000: {
        profitTarget: 0,
        maxDrawdown: 3000,
        dailyLossLimit: 1000,
        consistencyRule: 20,
        minTradingDays: 0,
        maxContracts: { mini: 6, micro: 60 },
      },
      150000: {
        profitTarget: 0,
        maxDrawdown: 4500,
        dailyLossLimit: 1200,
        consistencyRule: 20,
        minTradingDays: 0,
        maxContracts: { mini: 10, micro: 100 },
      },
    },
  }

  getName(): string {
    return "Lucid"
  }

  getAccountRules(
    accountSize: number,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): AccountRules | null {
    const lucidType = getLucidAccountType(accountName, notes)
    const typeRules = this.rulesConfig[lucidType]
    if (!typeRules) return null

    const rules = typeRules[accountSize]
    if (!rules) return null

    // Pour les comptes FUNDED, ajuster les règles
    if (accountType === "FUNDED") {
      return {
        ...rules,
        profitTarget: 0, // Pas de profit target en funded
        consistencyRule: lucidType === "FLEX" ? 0 : rules.consistencyRule, // Flex n'a pas de cohérence en funded
        minTradingDays: 0, // Pas de minimum de jours en funded
      }
    }

    return rules
  }

  getWithdrawalRules(
    accountSize: number,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): WithdrawalRules {
    if (accountType !== "FUNDED") {
      return {
        taxRate: 0,
        requiresCycles: false,
        hasBuffer: false,
      }
    }

    const lucidType = getLucidAccountType(accountName, notes)

    // Configuration des profits minimums par jour selon la taille
    const minDailyProfitConfig: Record<number, number> = {
      25000: 150,
      50000: 200,
      100000: 250,
      150000: 300,
    }
    const minDailyProfit = minDailyProfitConfig[accountSize] || 200

    if (lucidType === "FLEX") {
      // LucidFlex : Pas de buffer, pas de cohérence en funded, 5 jours profitables
      // Profit split : 100% premiers 10k totaux, puis 90%
      return {
        taxRate: 0.1, // 90% pour le trader (100% premiers 10k puis 90%)
        requiresCycles: false,
        hasBuffer: false, // Pas de safety net obligatoire
        minWithdrawal: 500,
        maxWithdrawal: this.getMaxPayout(accountSize, 0, "FLEX"), // Premier payout, limité par paliers
        frequency: "daily", // Instantanée/daily, processing ultra-rapide
        cycleRequirements: {
          daysPerCycle: 0, // Pas de cycle
          minDailyProfit: minDailyProfit,
          withdrawalPercentage: 100,
        },
      }
    }

    if (lucidType === "PRO") {
      // LucidPro : Buffer parfois requis, cohérence 35-40% par cycle, 5 jours profitables
      // Profit split : 90% (ou 100% premiers 10k puis 90%)
      return {
        taxRate: 0.1, // 90% pour le trader (100% premiers 10k puis 90%)
        requiresCycles: false, // Daily possible mais avec conditions strictes
        hasBuffer: false, // Parfois requis mais pas toujours
        minWithdrawal: 500,
        maxWithdrawal: undefined, // Payouts illimités, scaling possible
        frequency: "daily",
        cycleRequirements: {
          daysPerCycle: 0,
          minDailyProfit: minDailyProfit,
          withdrawalPercentage: 100,
        },
      }
    }

    // DIRECT/LIVE : Cohérence stricte 20%, 8 jours profitables, buffer parfois requis
    // Profit split : 90% (100% premiers 10k puis 90%)
    return {
      taxRate: 0.1, // 90% pour le trader (100% premiers 10k puis 90%)
      requiresCycles: true,
      hasBuffer: false, // Parfois requis
      minWithdrawal: 500,
      maxWithdrawal: undefined,
      frequency: "daily", // Moins fréquente (tous les 8 jours min), mais processing rapide
      cycleRequirements: {
        daysPerCycle: 8, // 8 jours profitables par cycle de payout
        minDailyProfit: minDailyProfit,
        withdrawalPercentage: 100,
      },
    }
  }

  /**
   * Calcule le maximum payout selon la taille et le numéro de payout
   * Max 6 payouts par compte (pour LucidFlex)
   * Les règles varient selon le type de compte
   */
  private getMaxPayout(
    accountSize: number,
    payoutNumber: number,
    lucidType?: LucidAccountType
  ): number {
    // Pour Flex : payouts limités par paliers
    if (lucidType === "FLEX") {
      const maxPayoutConfig: Record<number, Record<number, number>> = {
        25000: {
          0: 2000,
          1: 2000,
          2: 2500,
          3: 3000,
          4: 3500,
          5: 4000,
        },
        50000: {
          0: 3000,
          1: 3000,
          2: 4000,
          3: 4500,
          4: 5000,
          5: 5000,
        },
        100000: {
          0: 4000,
          1: 4000,
          2: 5000,
          3: 5000,
          4: 5000,
          5: 5000,
        },
        150000: {
          0: 5000,
          1: 5000,
          2: 5000,
          3: 5000,
          4: 5000,
          5: 5000,
        },
      }

      const payoutIndex = Math.min(payoutNumber, 5)
      return maxPayoutConfig[accountSize]?.[payoutIndex] || 5000
    }

    // Pour PRO et DIRECT/LIVE : pas de limite de payout (undefined)
    return undefined as unknown as number
  }

  calculateBuffer(_accountSize: number): number {
    // LucidFlex n'a pas de buffer obligatoire
    // LucidPro et DIRECT peuvent avoir un buffer mais pas toujours
    return 0
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
    if (accountType !== "FUNDED") {
      return 0
    }

    // const currentBalance = accountSize + totalPnl - totalWithdrawals
    const withdrawalRules = this.getWithdrawalRules(accountSize, accountType, accountName, notes)

    // Calculer le profit disponible (90% pour le trader)
    const availableProfit = totalPnl - totalWithdrawals
    const netProfit = availableProfit * (1 - withdrawalRules.taxRate)

    // Vérifier les conditions de retrait
    const lucidType = getLucidAccountType(accountName, notes)

    if (lucidType === "FLEX") {
      // Flex : 5 jours profitables avec profit minimum
      const minDailyProfit = withdrawalRules.cycleRequirements?.minDailyProfit || 200
      const dailyPnl: Record<string, number> = {}
      pnlEntries.forEach((entry) => {
        const dateKey = format(entry.date, "yyyy-MM-dd")
        dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
      })

      const profitableDays = Object.values(dailyPnl).filter(
        (amount) => amount >= minDailyProfit
      ).length

      if (profitableDays < 5) {
        return 0
      }

      // Calculer le numéro de payout (approximation)
      const payoutCount = Math.floor(totalWithdrawals / 1000)
      const maxPayout = this.getMaxPayout(accountSize, payoutCount, "FLEX")

      // Pour Flex : 100% des premiers 10k totaux, puis 90%
      const totalProfit = totalPnl
      const profitAfterWithdrawals = totalPnl - totalWithdrawals
      let adjustedProfit = profitAfterWithdrawals

      if (totalProfit > 10000) {
        // 100% des premiers 10k + 90% du reste
        const first10k = Math.min(10000, profitAfterWithdrawals)
        const remaining = Math.max(0, profitAfterWithdrawals - 10000)
        adjustedProfit = first10k + remaining * 0.9
      } else {
        // 100% si moins de 10k
        adjustedProfit = profitAfterWithdrawals
      }

      return Math.max(0, Math.min(adjustedProfit, maxPayout || Infinity))
    }

    if (lucidType === "PRO") {
      // Pro : 5 jours profitables, cohérence 35-40%
      const minDailyProfit = withdrawalRules.cycleRequirements?.minDailyProfit || 200
      const dailyPnl: Record<string, number> = {}
      pnlEntries.forEach((entry) => {
        const dateKey = format(entry.date, "yyyy-MM-dd")
        dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
      })

      const profitableDays = Object.values(dailyPnl).filter(
        (amount) => amount >= minDailyProfit
      ).length

      if (profitableDays < 5) {
        return 0
      }

      // Vérifier la cohérence 35-40% par cycle de payout
      const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)
      const biggestDay = Math.max(...Object.values(dailyPnl).filter((v) => v > 0), 0)
      const consistencyPercentage = totalPnl > 0 ? (biggestDay / totalPnl) * 100 : 0

      // Cohérence : 35% pour 25k/50k, 40% pour 100k/150k
      const consistencyRule = accountSize <= 50000 ? 35 : 40
      if (consistencyPercentage > consistencyRule) {
        return 0
      }

      // Pour PRO : 100% des premiers 10k totaux, puis 90%
      // Note: netProfit est déjà à 90%, donc on doit ajuster pour les premiers 10k
      const totalProfit = totalPnl
      const profitAfterWithdrawals = totalPnl - totalWithdrawals
      let adjustedProfit = netProfit

      if (totalProfit > 10000) {
        // 100% des premiers 10k + 90% du reste
        const first10k = Math.min(10000, profitAfterWithdrawals)
        const remaining = Math.max(0, profitAfterWithdrawals - 10000)
        adjustedProfit = first10k + remaining * 0.9
      } else {
        // 100% si moins de 10k (mais netProfit est déjà à 90%, donc on doit corriger)
        adjustedProfit = profitAfterWithdrawals
      }

      return Math.max(0, adjustedProfit)
    }

    // DIRECT/LIVE : 8 jours profitables, cohérence 20%
    const minDailyProfit = withdrawalRules.cycleRequirements?.minDailyProfit || 200
    const daysPerCycle = withdrawalRules.cycleRequirements?.daysPerCycle || 8

    const dailyPnl: Record<string, number> = {}
    pnlEntries.forEach((entry) => {
      const dateKey = format(entry.date, "yyyy-MM-dd")
      dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
    })

    const profitableDays = Object.values(dailyPnl).filter(
      (amount) => amount >= minDailyProfit
    ).length

    if (profitableDays < daysPerCycle) {
      return 0
    }

    // Vérifier la cohérence 20% (stricte pour DIRECT/LIVE)
    const totalPnlCycle = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)
    const biggestDay = Math.max(...Object.values(dailyPnl).filter((v) => v > 0), 0)
    const consistencyPercentage = totalPnlCycle > 0 ? (biggestDay / totalPnlCycle) * 100 : 0

    if (consistencyPercentage > 20) {
      return 0
    }

    // Pour DIRECT/LIVE : 100% des premiers 10k totaux, puis 90%
    const totalProfit = totalPnlCycle
    const profitAfterWithdrawals = totalPnlCycle - totalWithdrawals
    let adjustedProfit = profitAfterWithdrawals

    if (totalProfit > 10000) {
      // 100% des premiers 10k + 90% du reste
      const first10k = Math.min(10000, profitAfterWithdrawals)
      const remaining = Math.max(0, profitAfterWithdrawals - 10000)
      adjustedProfit = first10k + remaining * 0.9
    } else {
      // 100% si moins de 10k
      adjustedProfit = profitAfterWithdrawals
    }

    return Math.max(0, adjustedProfit)
  }

  isEligibleForValidation(
    accountSize: number,
    pnlEntries: Array<{ date: Date; amount: number }>,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): boolean {
    // DIRECT/LIVE n'a pas d'évaluation (instant funded)
    const lucidType = getLucidAccountType(accountName, notes)
    if (lucidType === "DIRECT" || lucidType === "LIVE") {
      return false // Pas d'évaluation pour ces types
    }

    const rules = this.getAccountRules(accountSize, accountType, accountName, notes)
    if (!rules) return false

    const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

    // Vérifier l'objectif de profit
    if (rules.profitTarget > 0 && totalPnl < rules.profitTarget) {
      return false
    }

    // Vérifier le nombre de jours de trading
    if (rules.minTradingDays && rules.minTradingDays > 0) {
      const tradingDays = new Set(pnlEntries.map((entry) => format(entry.date, "yyyy-MM-dd"))).size

      if (tradingDays < rules.minTradingDays) {
        return false
      }
    }

    // Vérifier la règle de cohérence
    if (rules.consistencyRule > 0) {
      const dailyPnl: Record<string, number> = {}
      pnlEntries.forEach((entry) => {
        const dateKey = format(entry.date, "yyyy-MM-dd")
        dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
      })

      const maxDayProfit = Math.max(...Object.values(dailyPnl).filter((v) => v > 0), 0)
      const consistencyCheck = maxDayProfit <= totalPnl * (rules.consistencyRule / 100)

      if (!consistencyCheck) {
        return false
      }
    }

    // Vérifier le trailing drawdown EOD
    let maxDrawdownExceeded = false
    const dailyBalances: Record<string, number> = {}
    let currentBalance = accountSize
    let highestBalance = accountSize // Pour trailing drawdown

    pnlEntries
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .forEach((entry) => {
        const dateKey = format(entry.date, "yyyy-MM-dd")
        if (!dailyBalances[dateKey]) {
          dailyBalances[dateKey] = currentBalance
        }
        currentBalance += entry.amount
        dailyBalances[dateKey] = currentBalance

        // Mettre à jour le point le plus haut (trailing)
        if (currentBalance > highestBalance) {
          highestBalance = currentBalance
        }

        // Vérifier le trailing drawdown EOD
        const trailingDrawdown = highestBalance - currentBalance
        if (trailingDrawdown > rules.maxDrawdown) {
          maxDrawdownExceeded = true
        }
      })

    return !maxDrawdownExceeded
  }
}
