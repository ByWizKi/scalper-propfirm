/**
 * Liste des propfirms compatibles avec Project X
 * Source: https://projectx.trading/
 */

import { PropfirmType } from "@/types/account.types"

/**
 * Propfirms compatibles avec Project X
 * Ces propfirms utilisent le même format d'export CSV que Project X
 */
export const PROJECT_X_COMPATIBLE_PROPFIRMS: PropfirmType[] = [
  PropfirmType.TOPSTEP,
  PropfirmType.BULENOX,
  // Note: Les autres propfirms listées (Alpha Futures, TickTickTrader, etc.)
  // ne sont pas encore dans notre enum PropfirmType
  // Elles peuvent être ajoutées plus tard ou utilisées avec PropfirmType.OTHER
]

/**
 * Vérifie si une propfirm est compatible avec Project X
 */
export function isProjectXCompatible(propfirm: string | PropfirmType): boolean {
  // Si c'est OTHER, on considère qu'il peut être compatible (l'utilisateur sait ce qu'il fait)
  if (propfirm === PropfirmType.OTHER || propfirm === "OTHER") {
    return true
  }

  return PROJECT_X_COMPATIBLE_PROPFIRMS.includes(propfirm as PropfirmType)
}

/**
 * Liste complète des propfirms compatibles avec Project X (pour affichage)
 */
export const PROJECT_X_COMPATIBLE_LIST = [
  "TopStep",
  "Alpha Futures",
  "TickTickTrader",
  "Bulenox",
  "TradeDay",
  "Blusky",
  "Goat Futures",
  "The Futures Desk",
  "DayTraders",
  "E8 Futures",
  "Blue Guardian Futures",
  "FuturesElite",
  "FXIFY",
  "Hola Prime",
  "Top One Futures",
  "Funding Futures",
  "TX3 Funding",
  "Lucid Trading",
  "Tradeify",
]

