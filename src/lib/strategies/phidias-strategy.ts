/**
 * Stratégie Phidias Propfirm - Implémentation des règles spécifiques
 *
 * Règles principales :
 * - Partage des profits : 80/20 (trader garde 80%, donc 20% de taxe)
 *
 * Types de comptes Phidias :
 * 1. ÉVALUATION (EVAL) - 25K Static :
 *    - Perte statique de 500$ (pas de EOD, pas de trailing drawdown)
 *    - Objectif : 1500$
 *    - Pas de règle de cohérence
 *    - Pas de minimum de jours de trading
 *
 * 2. CASH (FUNDED) - 25K Static CASH :
 *    - Perte statique de 500$ (pas de EOD, pas de trailing drawdown)
 *    - Objectif : 1500$ (déjà validé en évaluation)
 *    - Payout possible dès J+1
 *    - Bonus de 1000$ à la validation
 *    - Chaque compte validé crédite le compte LIVE de 500$ (jusqu'à 5 comptes = 2500$)
 *
 * 3. LIVE (FUNDED) :
 *    - Payout possible chaque jour sans limite maximum (500$ min)
 *    - Solde minimum : solde initial + 100$
 *    - Split 80/20 (trader garde 80%)
 */

import { PropfirmStrategy } from "./propfirm-strategy.interface"
import { AccountRules, WithdrawalRules } from "@/types/account.types"
import { format } from "date-fns"
import { getPhidiasAccountSubType, PhidiasAccountSubType } from "@/lib/phidias-account-type"

export class PhidiasStrategy implements PropfirmStrategy {
  private readonly rulesConfig: Record<number, AccountRules> = {
    // Compte 25K Static CASH
    25000: {
      profitTarget: 1500,
      maxDrawdown: 500, // Perte statique de 500$ (pas de trailing)
      dailyLossLimit: 0, // Pas de limite journalière
      consistencyRule: 0, // Pas de règle de cohérence
      minTradingDays: 0, // Pas de minimum de jours de trading
    },
    50000: {
      profitTarget: 3000,
      maxDrawdown: 2500,
      dailyLossLimit: 0,
      consistencyRule: 0,
      minTradingDays: 1,
    },
    100000: {
      profitTarget: 6000,
      maxDrawdown: 3000,
      dailyLossLimit: 0,
      consistencyRule: 0,
      minTradingDays: 1,
    },
    150000: {
      profitTarget: 9000,
      maxDrawdown: 4500,
      dailyLossLimit: 0,
      consistencyRule: 0,
      minTradingDays: 1,
    },
  }

  getName(): string {
    return "Phidias"
  }

  getAccountRules(accountSize: number, accountType?: string, accountName?: string, notes?: string | null): AccountRules | null {
    const rules = this.rulesConfig[accountSize]
    if (!rules) return null

    // Pour Phidias, les règles peuvent varier selon le sous-type de compte
    const subType = accountType ? getPhidiasAccountSubType(accountType, accountName, notes) : "EVAL"

    // Les règles de base sont les mêmes pour EVAL et CASH (25K Static)
    // LIVE n'a pas de règles d'évaluation car c'est déjà un compte financé
    if (subType === "LIVE") {
      // Pour LIVE, retourner des règles minimales (pas d'évaluation)
      return {
        profitTarget: 0,
        maxDrawdown: 0,
        dailyLossLimit: 0,
        consistencyRule: 0,
        minTradingDays: 0,
      }
    }

    return rules
  }

  getWithdrawalRules(accountSize?: number, accountType?: string, accountName?: string, notes?: string | null): WithdrawalRules {
    const subType = accountType ? getPhidiasAccountSubType(accountType, accountName, notes) : "EVAL"

    // Règles de retrait selon le type de compte
    if (subType === "LIVE") {
      return {
        taxRate: 0.2, // 20% de taxe (trader garde 80%)
        requiresCycles: false, // Payout chaque jour
        hasBuffer: false,
      }
    }

    if (subType === "CASH") {
      // Pour les comptes 25K Static CASH : pas de cycles requis
      if (accountSize === 25000) {
        return {
          taxRate: 0.2, // 20% de taxe (trader garde 80%)
          requiresCycles: false, // Retrait dès J+1
          hasBuffer: false,
        }
      }

      // Pour les comptes CASH 50K, 100K, 150K : cycles de 10 jours pour les 3 premiers retraits
      return {
        taxRate: 0.2, // 20% de taxe (trader garde 80%)
        requiresCycles: true, // Minimum 10 jours de trading pour les 3 premiers retraits
        cycleRequirements: {
          daysPerCycle: 10, // 10 jours de trading minimum
          minDailyProfit: accountSize === 50000 ? 150 : accountSize === 100000 ? 200 : 250, // 150$ (50K), 200$ (100K), 250$ (150K)
          withdrawalPercentage: 1, // Pas de pourcentage spécifique, mais montant max par période
        },
        hasBuffer: false,
      }
    }

    // Pour EVAL : pas de retrait possible
    return {
      taxRate: 0.2,
      requiresCycles: false,
      hasBuffer: false,
    }
  }

  calculateBuffer(_accountSize: number): number {
    return 0 // Phidias n'a pas de buffer (à vérifier selon le type de compte)
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
    const subType = accountType ? getPhidiasAccountSubType(accountType, accountName, notes) : "EVAL"

    const availablePnl = Math.max(0, totalPnl)
    const currentBalance = accountSize + totalPnl - totalWithdrawals
    const initialBalance = accountSize

    if (subType === "LIVE") {
      // Pour le compte LIVE : payout chaque jour, 500$ min, solde min = solde initial + 100$
      const minBalance = initialBalance + 100
      const availableAfterMinBalance = currentBalance - minBalance
      const minWithdrawal = 500

      if (availableAfterMinBalance < minWithdrawal) {
        return 0
      }

      return Math.max(0, availableAfterMinBalance)
    }

    if (subType === "CASH") {
      // Pour les comptes 25K Static CASH : retrait dès J+1, pas de restriction
      if (accountSize === 25000) {
        return Math.max(0, availablePnl - totalWithdrawals)
      }

      // Pour les comptes CASH 50K, 100K, 150K (Fundamental/Swing) : règles spécifiques
      // Seuils minimum du compte
      const minAccountThresholds: Record<number, number> = {
        50000: 52600, // 50K : 52 600$ (2600$ de profit minimum)
        100000: 103700, // 100K : 103 700$ (3700$ de profit minimum)
        150000: 154500, // 150K : 154 500$ (4500$ de profit minimum)
      }

      const minThreshold = minAccountThresholds[accountSize]
      if (!minThreshold) {
        // Taille de compte non supportée
        return 0
      }

      // Vérifier que le compte atteint le seuil minimum
      if (currentBalance < minThreshold) {
        return 0
      }

      // Balance après retrait ne peut pas être en dessous de :
      const minBalanceAfterWithdrawal: Record<number, number> = {
        50000: 50100, // 50K : 50 100$
        100000: 100100, // 100K : 100 100$
        150000: 150100, // 150K : 150 100$
      }

      const minBalance = minBalanceAfterWithdrawal[accountSize] || initialBalance
      const availableAfterMinBalance = currentBalance - minBalance

      // Montant maximum de retrait par période
      const maxWithdrawalPerPeriod: Record<number, number> = {
        50000: 2000, // 50K : 2 000$ par période
        100000: 2500, // 100K : 2 500$ par période
        150000: 2750, // 150K : 2 750$ par période
      }

      const maxWithdrawal = maxWithdrawalPerPeriod[accountSize] || Infinity

      // Le montant disponible est le minimum entre :
      // 1. Le profit disponible après respect du solde minimum
      // 2. Le maximum autorisé par période
      // 3. Le profit total moins les retraits déjà effectués
      const availableFromProfit = Math.max(0, availablePnl - totalWithdrawals)
      const availableFromBalance = Math.max(0, availableAfterMinBalance)

      // Prendre le minimum entre les deux contraintes (solde min et profit disponible)
      const available = Math.min(availableFromProfit, availableFromBalance)

      // Appliquer la limite de retrait maximum par période
      return Math.min(available, maxWithdrawal)
    }

    // Pour EVAL : pas de retrait possible
    return 0
  }

  isEligibleForValidation(
    accountSize: number,
    pnlEntries: Array<{ date: Date; amount: number }>,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): boolean {
    const subType = accountType ? getPhidiasAccountSubType(accountType, accountName, notes) : "EVAL"

    // LIVE et CASH ne peuvent pas être validés (ils sont déjà financés)
    if (subType === "LIVE" || subType === "CASH") {
      return false
    }

    // Seulement pour EVAL
    const rules = this.getAccountRules(accountSize, accountType, accountName, notes)
    if (!rules) return false

    const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

    // Vérifier l'objectif de profit
    if (totalPnl < rules.profitTarget) return false

    // Pour le compte 25K Static : perte statique de 500$ (pas de trailing)
    // Le drawdown est calculé depuis le solde initial
    let currentBalance = accountSize
    let maxDrawdownExceeded = false

    pnlEntries
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((entry) => {
        currentBalance += entry.amount
        // Perte statique : drawdown depuis le solde initial
        const drawdown = accountSize - currentBalance
        if (drawdown > rules.maxDrawdown) {
          maxDrawdownExceeded = true
        }
      })

    return !maxDrawdownExceeded
  }

  /**
   * Calcule le bonus de validation pour un compte 25K Static
   * Bonus de 1000$ à la validation (seulement pour CASH)
   */
  getValidationBonus(accountSize: number, accountType?: string, accountName?: string, notes?: string | null): number {
    const subType = accountType ? getPhidiasAccountSubType(accountType, accountName, notes) : "EVAL"

    // Bonus seulement pour les comptes CASH validés
    if (accountSize === 25000 && subType === "CASH") {
      return 1000 // Bonus de 1000$ pour le compte 25K Static CASH
    }
    return 0
  }

  /**
   * Calcule le crédit LIVE pour un compte 25K Static validé
   * Chaque compte CASH validé crédite le compte LIVE de 500$
   */
  getLiveCredit(accountSize: number, accountType?: string, accountName?: string, notes?: string | null): number {
    const subType = accountType ? getPhidiasAccountSubType(accountType, accountName, notes) : "EVAL"

    // Crédit seulement pour les comptes CASH validés
    if (accountSize === 25000 && subType === "CASH") {
      return 500 // Crédit de 500$ pour le compte LIVE
    }
    return 0
  }
}

