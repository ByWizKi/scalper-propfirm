/**
 * Service métier pour les comptes
 * Encapsule toute la logique métier et utilise les stratégies
 */

import { PropfirmStrategyFactory } from "@/lib/strategies/propfirm-strategy.factory"
import { AccountStatsDTO, PropfirmType } from "@/types/account.types"

interface PnlEntry {
  id: string
  date: string | Date
  amount: number
}

interface Withdrawal {
  id: string
  date: string | Date
  amount: number
}

interface Account {
  id: string
  propfirm: PropfirmType | string
  size: number
  accountType: string
  pricePaid: number
  linkedEval?: {
    pricePaid: number
  }
  pnlEntries: PnlEntry[]
  withdrawals: Withdrawal[]
}

export class AccountService {
  /**
   * Calcule les statistiques complètes d'un compte
   */
  static calculateStats(account: Account): AccountStatsDTO {
    const strategy = PropfirmStrategyFactory.getStrategy(account.propfirm)

    // Calculs de base
    const totalPnl = account.pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)
    const totalWithdrawals = account.withdrawals.reduce((sum, w) => sum + w.amount, 0)
    const currentBalance = account.size + totalPnl - totalWithdrawals

    // Total investi (compte + eval lié si applicable)
    const totalInvested = account.pricePaid + (account.linkedEval?.pricePaid || 0)

    // Normaliser les entrées PnL pour la stratégie
    const normalizedPnlEntries = account.pnlEntries.map((entry) => ({
      date: new Date(entry.date),
      amount: entry.amount,
    }))

    // Calculs spécifiques à la propfirm
    const buffer = strategy.calculateBuffer(account.size)
    const availableForWithdrawal = strategy.calculateAvailableForWithdrawal(
      account.size,
      totalPnl,
      totalWithdrawals,
      normalizedPnlEntries
    )

    // Calcul du profit net
    let netProfit: number
    if (account.accountType === "FUNDED" && strategy.getWithdrawalRules().hasBuffer) {
      // Pour les comptes avec buffer : ne compter que ce qui est au-dessus du buffer
      netProfit = Math.max(0, currentBalance - buffer) - totalInvested
    } else {
      // Pour les autres : PnL - investi
      netProfit = totalPnl - totalInvested
    }

    // Calcul du ROI
    const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0

    return {
      totalPnl,
      totalWithdrawals,
      currentBalance,
      netProfit,
      roi,
      totalInvested,
      buffer: buffer > 0 ? buffer : undefined,
      availableForWithdrawal: availableForWithdrawal > 0 ? availableForWithdrawal : undefined,
    }
  }

  /**
   * Vérifie si un compte d'évaluation est éligible à la validation
   */
  static isEligibleForValidation(account: Account): boolean {
    if (account.accountType !== "EVAL") return false

    const strategy = PropfirmStrategyFactory.getStrategy(account.propfirm)
    const normalizedPnlEntries = account.pnlEntries.map((entry) => ({
      date: new Date(entry.date),
      amount: entry.amount,
    }))

    return strategy.isEligibleForValidation(account.size, normalizedPnlEntries)
  }

  /**
   * Obtient les règles d'un compte
   */
  static getAccountRules(propfirm: PropfirmType | string, accountSize: number) {
    const strategy = PropfirmStrategyFactory.getStrategy(propfirm)
    return strategy.getAccountRules(accountSize)
  }

  /**
   * Obtient les règles de retrait d'une propfirm
   */
  static getWithdrawalRules(propfirm: PropfirmType | string) {
    const strategy = PropfirmStrategyFactory.getStrategy(propfirm)
    return strategy.getWithdrawalRules()
  }
}

