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
      maxDrawdown: 1500, // Trailing EOD
      dailyLossLimit: 0, // Aucune
      consistencyRule: 50,
      minTradingDays: 5,
      maxContracts: { mini: 3, micro: 30 },
    },
    50000: {
      profitTarget: 3000,
      maxDrawdown: 2500, // Trailing EOD (~5% de 50k)
      dailyLossLimit: 0, // Aucune
      consistencyRule: 50,
      minTradingDays: 5,
      maxContracts: { mini: 6, micro: 60 },
    },
    75000: {
      profitTarget: 4500,
      maxDrawdown: 3000, // Trailing EOD (~4% de 75k)
      dailyLossLimit: 0, // Aucune
      consistencyRule: 50,
      minTradingDays: 5,
      maxContracts: { mini: 9, micro: 90 },
    },
    100000: {
      profitTarget: 6000,
      maxDrawdown: 3000, // Trailing EOD (~3% de 100k)
      dailyLossLimit: 0, // Aucune
      consistencyRule: 50,
      minTradingDays: 5,
      maxContracts: { mini: 12, micro: 120 },
    },
    150000: {
      profitTarget: 9000,
      maxDrawdown: 4500, // Trailing EOD (~3% de 150k)
      dailyLossLimit: 0, // Aucune
      consistencyRule: 50,
      minTradingDays: 5,
      maxContracts: { mini: 15, micro: 150 },
    },
  }

  getName(): string {
    return "TakeProfitTrader"
  }

  getAccountRules(
    accountSize: number,
    accountType?: string,
    _accountName?: string,
    _notes?: string | null
  ): AccountRules | null {
    const rules = this.rulesConfig[accountSize]
    if (!rules) return null

    // Pour les comptes FUNDED (PRO et PRO+), pas de profit target
    if (accountType === "FUNDED") {
      return {
        ...rules,
        profitTarget: 0, // Pas de profit target en funded
        consistencyRule: 0, // Pas de cohérence en funded
        minTradingDays: 0, // Pas de minimum de jours
      }
    }

    return rules
  }

  getWithdrawalRules(
    accountSize?: number,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): WithdrawalRules {
    // Détecter PRO+ (Live Market Funded) via accountName ou notes
    const isProPlus =
      accountName?.toLowerCase().includes("pro+") ||
      accountName?.toLowerCase().includes("live") ||
      notes?.toLowerCase().includes("pro+") ||
      notes?.toLowerCase().includes("live")

    if (accountType === "FUNDED" && isProPlus) {
      // PRO+ : 90% profit split, pas de buffer
      return {
        taxRate: 0.1, // 10% de taxe (90% pour le trader)
        requiresCycles: false,
        hasBuffer: false,
        minWithdrawal: 0,
        maxWithdrawal: undefined,
        frequency: "daily", // Quotidienne dès le day 1
      }
    }

    if (accountType === "FUNDED") {
      // PRO : 80% profit split, buffer obligatoire
      return {
        taxRate: 0.2, // 20% de taxe (80% pour le trader)
        requiresCycles: false,
        hasBuffer: true,
        minWithdrawal: 0,
        maxWithdrawal: undefined,
        frequency: "daily", // Quotidienne/multiple par jour dès le day 1
      }
    }

    // Pour les comptes EVAL, pas de règles de retrait
    return {
      taxRate: 0,
      requiresCycles: false,
      hasBuffer: false,
    }
  }

  calculateBuffer(accountSize: number): number {
    const rules = this.getAccountRules(accountSize, "FUNDED")
    if (!rules) return 0
    // Buffer = Balance initiale + Max Drawdown (pour PRO)
    // Note: PRO+ n'a pas de buffer, mais cela est géré dans calculateAvailableForWithdrawal
    return accountSize + rules.maxDrawdown
  }

  calculateAvailableForWithdrawal(
    accountSize: number,
    totalPnl: number,
    totalWithdrawals: number,
    _pnlEntries: Array<{ date: Date; amount: number }>,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): number {
    const currentBalance = accountSize + totalPnl - totalWithdrawals

    if (accountType !== "FUNDED") {
      // Pour les comptes EVAL, pas de retrait disponible
      return 0
    }

    // Vérifier les règles de retrait pour déterminer si c'est PRO ou PRO+
    const withdrawalRules = this.getWithdrawalRules(accountSize, accountType, accountName, notes)

    // PRO+ : pas de buffer, tout est disponible
    if (!withdrawalRules.hasBuffer) {
      return Math.max(0, currentBalance - accountSize) // Seulement les profits
    }

    // PRO : buffer obligatoire
    const buffer = this.calculateBuffer(accountSize)
    // Seulement ce qui est au-dessus du buffer est disponible
    return Math.max(0, currentBalance - buffer)
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

    // Vérifier le trailing drawdown end-of-day
    // Le drawdown suit le point le plus haut atteint (trailing)
    let maxDrawdownExceeded = false
    const dailyBalances: Record<string, number> = {}
    let currentBalance = accountSize
    let highestBalance = accountSize // Point le plus haut atteint (pour trailing)

    pnlEntries
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((entry) => {
        const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
        if (!dailyBalances[dateKey]) {
          dailyBalances[dateKey] = currentBalance
        }
        currentBalance += entry.amount
        dailyBalances[dateKey] = currentBalance

        // Mettre à jour le point le plus haut (trailing)
        if (currentBalance > highestBalance) {
          highestBalance = currentBalance
        }

        // Vérifier le trailing drawdown à la fin de chaque jour
        // Drawdown = différence entre le point le plus haut et la balance actuelle
        const trailingDrawdown = highestBalance - currentBalance
        if (trailingDrawdown > rules.maxDrawdown) {
          maxDrawdownExceeded = true
        }
      })

    return consistencyCheck && !maxDrawdownExceeded
  }
}

