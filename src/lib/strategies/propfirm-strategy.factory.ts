/**
 * Factory Pattern pour créer les stratégies de propfirm
 * Centralise la création des objets et facilite l'extension
 */

import { PropfirmStrategy } from "./propfirm-strategy.interface"
import { TopStepStrategy } from "./topstep-strategy"
import { TakeProfitTraderStrategy } from "./takeprofittrader-strategy"
import { PropfirmType } from "@/types/account.types"

/**
 * Factory pour créer la bonne stratégie selon la propfirm
 */
export class PropfirmStrategyFactory {
  private static strategies: Map<PropfirmType, PropfirmStrategy> = new Map()

  /**
   * Obtient la stratégie pour une propfirm donnée (avec cache)
   */
  static getStrategy(propfirm: PropfirmType | string): PropfirmStrategy {
    // Normaliser le type
    const propfirmType = typeof propfirm === "string"
      ? (propfirm as PropfirmType)
      : propfirm

    // Vérifier le cache
    if (this.strategies.has(propfirmType)) {
      return this.strategies.get(propfirmType)!
    }

    // Créer la stratégie appropriée
    let strategy: PropfirmStrategy

    switch (propfirmType) {
      case PropfirmType.TOPSTEP:
        strategy = new TopStepStrategy()
        break
      case PropfirmType.TAKEPROFITTRADER:
        strategy = new TakeProfitTraderStrategy()
        break
      // Ajouter d'autres propfirms ici
      default:
        // Stratégie par défaut (pas de règles spéciales)
        strategy = new DefaultStrategy()
        break
    }

    // Mettre en cache
    this.strategies.set(propfirmType, strategy)
    return strategy
  }

  /**
   * Réinitialise le cache (utile pour les tests)
   */
  static clearCache(): void {
    this.strategies.clear()
  }
}

/**
 * Stratégie par défaut pour les propfirms non supportées
 */
class DefaultStrategy implements PropfirmStrategy {
  getName(): string {
    return "Default"
  }

  getAccountRules(): null {
    return null
  }

  getWithdrawalRules() {
    return {
      taxRate: 0,
      requiresCycles: false,
      hasBuffer: false,
    }
  }

  calculateBuffer(): number {
    return 0
  }

  calculateAvailableForWithdrawal(): number {
    return 0
  }

  isEligibleForValidation(): boolean {
    return false
  }
}

