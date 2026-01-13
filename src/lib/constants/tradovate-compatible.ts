/**
 * Liste des propfirms compatibles avec Tradovate
 */

import { PropfirmType } from "@/types/account.types"

/**
 * Propfirms compatibles avec Tradovate
 * Ces propfirms utilisent Tradovate comme plateforme de trading
 */
export const TRADOVATE_COMPATIBLE_PROPFIRMS: PropfirmType[] = [
  PropfirmType.APEX,
  PropfirmType.TRADEIFY,
  PropfirmType.TAKEPROFITTRADER,
  PropfirmType.LUCID,
]

/**
 * Vérifie si une propfirm est compatible avec Tradovate
 */
export function isTradovateCompatible(propfirm: string | PropfirmType): boolean {
  // Si c'est OTHER, on considère qu'il peut être compatible (l'utilisateur sait ce qu'il fait)
  if (propfirm === PropfirmType.OTHER || propfirm === "OTHER") {
    return true
  }

  return TRADOVATE_COMPATIBLE_PROPFIRMS.includes(propfirm as PropfirmType)
}
