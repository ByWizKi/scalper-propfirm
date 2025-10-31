import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatage de devises
export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Formatage de dates
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

// Conversion USD -> EUR
export function usdToEur(amount: number, rate: number = 0.92): number {
  return amount * rate
}

// Noms lisibles des propfirms
export function getPropfirmLabel(propfirm: string): string {
  const labels: Record<string, string> = {
    TOPSTEP: "Topstep",
    TAKEPROFITTRADER: "TakeProfit Trader",
    APEX: "Apex Trader Funding",
    FTMO: "FTMO",
    MYFUNDEDFUTURES: "MyFundedFutures",
    OTHER: "Autre",
  }
  return labels[propfirm] || propfirm
}

// Badges de statut
export function getStatusBadge(status: string): {
  label: string
  color: string
} {
  const badges: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: "Actif", color: "blue" },
    VALIDATED: { label: "Validé", color: "green" },
    FAILED: { label: "Cramé", color: "red" },
    ARCHIVED: { label: "Archivé", color: "gray" },
  }
  return badges[status] || { label: status, color: "gray" }
}

// Labels de type de compte
export function getAccountTypeLabel(type: string): string {
  return type === "EVAL" ? "Évaluation" : "Financé"
}


