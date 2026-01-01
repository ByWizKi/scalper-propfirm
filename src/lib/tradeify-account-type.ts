/**
 * Helper pour détecter le type de compte Tradeify
 * Types possibles : GROWTH, SELECT, LIGHTNING
 */

export type TradeifyAccountType = "GROWTH" | "SELECT" | "LIGHTNING"
export type SelectPayoutOption = "FLEX" | "DAILY"

/**
 * Détecte le type de compte Tradeify à partir du nom ou des notes
 */
export function getTradeifyAccountType(
  accountName?: string,
  notes?: string | null
): TradeifyAccountType {
  const nameLower = (accountName || "").toLowerCase()
  const notesLower = (notes || "").toLowerCase()

  // Détecter Lightning (priorité car c'est le plus spécifique)
  if (nameLower.includes("lightning") || notesLower.includes("lightning")) {
    return "LIGHTNING"
  }

  // Détecter Select
  if (nameLower.includes("select") || notesLower.includes("select")) {
    return "SELECT"
  }

  // Détecter Growth
  if (nameLower.includes("growth") || notesLower.includes("growth")) {
    return "GROWTH"
  }

  // Par défaut, considérer comme Growth (le type le plus commun)
  return "GROWTH"
}

/**
 * Détecte l'option de payout pour les comptes Select (Flex ou Daily)
 */
export function getSelectPayoutOption(
  accountName?: string,
  notes?: string | null
): SelectPayoutOption {
  const nameLower = (accountName || "").toLowerCase()
  const notesLower = (notes || "").toLowerCase()

  // Détecter Daily
  if (nameLower.includes("daily") || notesLower.includes("daily")) {
    return "DAILY"
  }

  // Par défaut, Flex
  return "FLEX"
}

