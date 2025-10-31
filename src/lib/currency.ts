/**
 * Taux de change USD vers EUR
 */
export const USD_TO_EUR = 0.92

/**
 * Formate un montant en USD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

/**
 * Formate un montant en EUR
 */
export function formatCurrencyEUR(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

/**
 * Convertit un montant USD en EUR
 */
export function convertUSDToEUR(amount: number): number {
  return amount * USD_TO_EUR
}

