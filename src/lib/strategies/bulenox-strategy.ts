/**
 * Stratégie Bulenox - Implémentation des règles spécifiques
 *
 * Règles principales :
 * - Pas de minimum de jours de trading requis
 * - Trailing Drawdown qui suit le pic le plus haut
 * - Drawdown en temps réel (réalisé et non réalisé)
 * - 1 standard contract = 10 micro contracts
 * - Fermeture obligatoire avant 15:59 CT
 */

import { PropfirmStrategy } from "./propfirm-strategy.interface"
import { AccountRules, WithdrawalRules } from "@/types/account.types"

export class BulenoxStrategy implements PropfirmStrategy {
  private readonly rulesConfig: Record<number, AccountRules> = {
    25000: {
      profitTarget: 1500,
      maxDrawdown: 1500,
      dailyLossLimit: 0, // Pas de limite journalière
      consistencyRule: 0, // Pas de règle de cohérence
      minTradingDays: 1, // Techniquement 1 mais peut être 0 dans la pratique
      maxContracts: { mini: 3, micro: 30 },
    },
    50000: {
      profitTarget: 3000,
      maxDrawdown: 2500,
      dailyLossLimit: 0,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 7, micro: 70 },
    },
    100000: {
      profitTarget: 6000,
      maxDrawdown: 3000,
      dailyLossLimit: 0,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 12, micro: 120 },
    },
    150000: {
      profitTarget: 9000,
      maxDrawdown: 4500,
      dailyLossLimit: 0,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 15, micro: 150 },
    },
    250000: {
      profitTarget: 15000,
      maxDrawdown: 5500,
      dailyLossLimit: 0,
      consistencyRule: 0,
      minTradingDays: 1,
      maxContracts: { mini: 25, micro: 250 },
    },
  }

  getName(): string {
    return "Bulenox"
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
      taxRate: 0, // Pas de taxe mentionnée
      requiresCycles: false, // Pas de système de cycles mentionné
      hasBuffer: false, // Pas de buffer mentionné
    }
  }

  calculateBuffer(_accountSize: number): number {
    return 0 // Bulenox n'a pas de buffer
  }

  calculateAvailableForWithdrawal(
    _accountSize: number,
    totalPnl: number,
    _totalWithdrawals: number,
    _pnlEntries: Array<{ date: Date; amount: number }>,
    _accountType?: string,
    _accountName?: string,
    _notes?: string | null
  ): number {
    // Pas de règles de retrait spécifiques mentionnées
    return Math.max(0, totalPnl)
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

    // Techniquement minimum 1 jour, mais dans la pratique peut être 0
    // Le trading day est compté seulement si un trade a été ouvert
    if (pnlEntries.length === 0) return false

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
