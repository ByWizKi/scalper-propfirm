/**
 * Helper functions pour déterminer le type de compte Lucid
 * Les types sont détectés via le nom du compte ou les notes
 */

export type LucidAccountType = "FLEX" | "PRO" | "DIRECT" | "LIVE"

/**
 * Détermine le type de compte Lucid depuis le nom ou les notes
 */
export function getLucidAccountType(accountName?: string, notes?: string | null): LucidAccountType {
  const nameLower = (accountName || "").toLowerCase()
  const notesLower = (notes || "").toLowerCase()

  // Détecter LIVE (priorité car c'est le plus spécifique)
  if (nameLower.includes("live") || notesLower.includes("live")) {
    return "LIVE"
  }

  // Détecter DIRECT
  if (nameLower.includes("direct") || notesLower.includes("direct")) {
    return "DIRECT"
  }

  // Détecter PRO
  if (nameLower.includes("pro") || notesLower.includes("pro")) {
    return "PRO"
  }

  // Détecter FLEX
  if (nameLower.includes("flex") || notesLower.includes("flex")) {
    return "FLEX"
  }

  // Par défaut, Flex (le plus flexible)
  return "FLEX"
}

/**
 * Retourne le label d'affichage pour un type de compte Lucid
 */
export function getLucidAccountTypeLabel(type: LucidAccountType): string {
  const labels: Record<LucidAccountType, string> = {
    FLEX: "LucidFlex",
    PRO: "LucidPro",
    DIRECT: "LucidDirect",
    LIVE: "LucidLive",
  }
  return labels[type]
}
