/**
 * Interface Strategy pour les règles de propfirm
 * Permet le polymorphisme et l'extensibilité
 */

import { AccountRules, WithdrawalRules } from "@/types/account.types"

export interface PropfirmStrategy {
  /**
   * Obtient les règles d'évaluation pour une taille de compte donnée
   * @param accountType - Type de compte (optionnel, pour Phidias: EVAL/CASH/LIVE)
   * @param accountName - Nom du compte (optionnel, pour détecter le type Phidias)
   * @param notes - Notes du compte (optionnel, pour détecter le type Phidias)
   */
  getAccountRules(
    accountSize: number,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): AccountRules | null

  /**
   * Obtient les règles de retrait
   * @param accountSize - Taille du compte (optionnel, pour Phidias: différencier 25K Static des autres)
   * @param accountType - Type de compte (optionnel, pour Phidias: EVAL/CASH/LIVE)
   * @param accountName - Nom du compte (optionnel, pour détecter le type Phidias)
   * @param notes - Notes du compte (optionnel, pour détecter le type Phidias)
   */
  getWithdrawalRules(
    accountSize?: number,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): WithdrawalRules

  /**
   * Calcule le montant disponible pour retrait
   * @param accountType - Type de compte (optionnel, pour Phidias: EVAL/CASH/LIVE)
   * @param accountName - Nom du compte (optionnel, pour détecter le type Phidias)
   * @param notes - Notes du compte (optionnel, pour détecter le type Phidias)
   */
  calculateAvailableForWithdrawal(
    accountSize: number,
    totalPnl: number,
    totalWithdrawals: number,
    pnlEntries: Array<{ date: Date; amount: number }>,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): number

  /**
   * Calcule le buffer (si applicable)
   */
  calculateBuffer(accountSize: number): number

  /**
   * Vérifie si un compte d'évaluation est éligible à la validation
   * @param accountType - Type de compte (optionnel, pour Phidias: EVAL/CASH/LIVE)
   * @param accountName - Nom du compte (optionnel, pour détecter le type Phidias)
   * @param notes - Notes du compte (optionnel, pour détecter le type Phidias)
   */
  isEligibleForValidation(
    accountSize: number,
    pnlEntries: Array<{ date: Date; amount: number }>,
    accountType?: string,
    accountName?: string,
    notes?: string | null
  ): boolean

  /**
   * Nom de la propfirm
   */
  getName(): string
}

