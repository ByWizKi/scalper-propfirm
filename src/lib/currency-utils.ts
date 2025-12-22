/**
 * Utilitaires pour les calculs monétaires - réduit la duplication
 */

export function formatCurrency(
  amount: number,
  currency: "USD" | "EUR" = "USD",
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount)
}

export function formatCurrencyPair(amount: number): { usd: string; eur: string } {
  const rate = 0.92 // Taux EUR/USD fixe pour simplification
  return {
    usd: formatCurrency(amount, "USD"),
    eur: formatCurrency(amount * rate, "EUR"),
  }
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}
