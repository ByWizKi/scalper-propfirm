/**
 * Utilitaires pour déterminer le type de compte Phidias
 *
 * Types de comptes Phidias :
 * - EVAL : Évaluation (25K Static)
 * - CASH : Compte CASH financé (25K Static CASH)
 * - LIVE : Compte LIVE financé
 */

export type PhidiasAccountSubType = "EVAL" | "CASH" | "LIVE"

/**
 * Détermine le sous-type de compte Phidias basé sur le type de compte et le nom/notes
 *
 * @param accountType - Type de compte (EVAL ou FUNDED)
 * @param accountName - Nom du compte (optionnel)
 * @param notes - Notes du compte (optionnel)
 * @returns Le sous-type de compte Phidias
 */
export function getPhidiasAccountSubType(
  accountType: string,
  accountName?: string,
  notes?: string | null
): PhidiasAccountSubType {
  // Si c'est une évaluation, c'est toujours EVAL
  if (accountType === "EVAL") {
    return "EVAL"
  }

  // Si c'est un compte financé, déterminer si c'est CASH ou LIVE
  if (accountType === "FUNDED") {
    const nameLower = (accountName || "").toLowerCase()
    const notesLower = (notes || "").toLowerCase()
    const combinedText = `${nameLower} ${notesLower}`.toLowerCase()

    // Détecter si c'est un compte LIVE
    // Rechercher des mots-clés spécifiques pour LIVE
    if (
      combinedText.includes("live") ||
      combinedText.includes("compte live") ||
      combinedText.includes("trading live") ||
      nameLower.includes("live")
    ) {
      return "LIVE"
    }

    // Détecter si c'est un compte CASH
    // Rechercher des mots-clés spécifiques pour CASH
    if (
      combinedText.includes("cash") ||
      combinedText.includes("compte cash") ||
      combinedText.includes("25k static cash") ||
      nameLower.includes("cash")
    ) {
      return "CASH"
    }

    // Par défaut, si c'est FUNDED et pas de mot-clé spécifique, c'est CASH
    // (car les comptes CASH sont plus courants que LIVE)
    return "CASH"
  }

  // Par défaut, retourner EVAL
  return "EVAL"
}

/**
 * Obtient le label d'affichage pour le sous-type de compte Phidias
 */
export function getPhidiasAccountSubTypeLabel(subType: PhidiasAccountSubType): string {
  switch (subType) {
    case "EVAL":
      return "Évaluation"
    case "CASH":
      return "CASH"
    case "LIVE":
      return "LIVE"
    default:
      return "Évaluation"
  }
}

