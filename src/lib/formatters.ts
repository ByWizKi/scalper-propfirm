/**
 * Fonctions de formatage réutilisables
 */

import { USD_TO_EUR } from "./constants"

/**
 * Formate un montant en devise USD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

/**
 * Formate un montant en devise EUR
 */
export function formatCurrencyEUR(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

/**
 * Convertit USD en EUR et formate
 */
export function formatUSDtoEUR(amountUSD: number, rate: number = USD_TO_EUR): string {
  return formatCurrencyEUR(amountUSD * rate)
}

/**
 * Formate un pourcentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Formate un nombre compact (ex: 1.5K, 2.3M)
 */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

