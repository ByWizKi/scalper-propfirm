/**
 * Helper functions pour déterminer le type de compte Lucid
 * Les types sont détectés via le nom du compte ou les notes
 */

export type LucidAccountType = "FLEX" | "PRO" | "DIRECT" | "LIVE"

/**
 * Détermine le type de compte Lucid depuis le nom ou les notes
 */
export function getLucidAccountType(
  accountName?: string,
  notes?: string | null
): LucidAccountType {
  const nameLower = (accountName || "").toLowerCase()
  const notesLower = (notes || "").toLowerCase()

  if (
    nameLower.includes("direct") ||
    nameLower.includes("live") ||
    notesLower.includes("direct") ||
    notesLower.includes("live")
  ) {
    return "DIRECT"
  }

  if (
    nameLower.includes("pro") ||
    notesLower.includes("pro")
  ) {
    return "PRO"
  }

  // Par défaut, Flex (le plus flexible)
  return "FLEX"
}

