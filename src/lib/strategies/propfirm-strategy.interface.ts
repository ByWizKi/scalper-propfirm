/**
 * Interface Strategy pour les règles de propfirm
 * Permet le polymorphisme et l'extensibilité
 */

import { AccountRules, WithdrawalRules } from "@/types/account.types"

export interface PropfirmStrategy {
  /**
   * Obtient les règles d'évaluation pour une taille de compte donnée
   */
  getAccountRules(accountSize: number): AccountRules | null

  /**
   * Obtient les règles de retrait
   */
  getWithdrawalRules(): WithdrawalRules

  /**
   * Calcule le montant disponible pour retrait
   */
  calculateAvailableForWithdrawal(
    accountSize: number,
    totalPnl: number,
    totalWithdrawals: number,
    pnlEntries: Array<{ date: Date; amount: number }>
  ): number

  /**
   * Calcule le buffer (si applicable)
   */
  calculateBuffer(accountSize: number): number

  /**
   * Vérifie si un compte d'évaluation est éligible à la validation
   */
  isEligibleForValidation(
    accountSize: number,
    pnlEntries: Array<{ date: Date; amount: number }>
  ): boolean

  /**
   * Nom de la propfirm
   */
  getName(): string
}

