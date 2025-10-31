/**
 * Utilitaires pour les calculs de retraits et taxes
 */

export interface WithdrawalTaxInfo {
  grossAmount: number // Montant brut retiré du compte
  taxRate: number // Taux de taxe (0 à 1)
  taxAmount: number // Montant de la taxe
  netAmount: number // Montant net reçu
  hasTax: boolean // Si des taxes s'appliquent
}

/**
 * Calcule les informations de taxe pour un retrait selon la propfirm
 */
export function calculateWithdrawalTax(
  amount: number,
  propfirm: string
): WithdrawalTaxInfo {
  let taxRate = 0

  // Appliquer les règles de taxe selon la propfirm
  switch (propfirm) {
    case "TAKEPROFITTRADER":
      taxRate = 0.20 // 20% de taxe
      break
    case "TOPSTEP":
    default:
      taxRate = 0 // Pas de taxe
      break
  }

  const taxAmount = amount * taxRate
  const netAmount = amount - taxAmount

  return {
    grossAmount: amount,
    taxRate,
    taxAmount,
    netAmount,
    hasTax: taxRate > 0,
  }
}

/**
 * Calcule le montant net d'un retrait (après taxes)
 */
export function getNetWithdrawalAmount(
  amount: number,
  propfirm: string
): number {
  return calculateWithdrawalTax(amount, propfirm).netAmount
}

/**
 * Calcule le total net de plusieurs retraits
 */
export function calculateTotalNetWithdrawals(
  withdrawals: Array<{ amount: number; account: { propfirm: string } }>
): number {
  return withdrawals.reduce((sum, withdrawal) => {
    return sum + getNetWithdrawalAmount(withdrawal.amount, withdrawal.account.propfirm)
  }, 0)
}

/**
 * Formate le taux de taxe en pourcentage
 */
export function formatTaxRate(taxRate: number): string {
  return `${(taxRate * 100).toFixed(0)}%`
}

