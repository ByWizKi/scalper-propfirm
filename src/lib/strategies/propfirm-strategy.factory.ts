/**
 * Factory Pattern pour créer les stratégies de propfirm
 * Centralise la création des objets et facilite l'extension
 */

import { PropfirmStrategy } from "./propfirm-strategy.interface"
import { TopStepStrategy } from "./topstep-strategy"
import { TakeProfitTraderStrategy } from "./takeprofittrader-strategy"
import { ApexStrategy } from "./apex-strategy"
import { BulenoxStrategy } from "./bulenox-strategy"
import { PhidiasStrategy } from "./phidias-strategy"
import { TradeifyStrategy } from "./tradeify-strategy"
import { LucidStrategy } from "./lucid-strategy"
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
    const propfirmType = typeof propfirm === "string" ? (propfirm as PropfirmType) : propfirm

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
      case PropfirmType.APEX:
        strategy = new ApexStrategy()
        break
      case PropfirmType.BULENOX:
        strategy = new BulenoxStrategy()
        break
      case PropfirmType.PHIDIAS:
        strategy = new PhidiasStrategy()
        break
      case PropfirmType.TRADEIFY:
        strategy = new TradeifyStrategy()
        break
      case PropfirmType.LUCID:
        strategy = new LucidStrategy()
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

  getAccountRules(
    _accountSize: number,
    _accountType?: string,
    _accountName?: string,
    _notes?: string | null
  ): null {
    return null
  }

  getWithdrawalRules(
    _accountSize?: number,
    _accountType?: string,
    _accountName?: string,
    _notes?: string | null
  ) {
    return {
      taxRate: 0,
      requiresCycles: false,
      hasBuffer: false,
    }
  }

  calculateBuffer(_accountSize: number): number {
    return 0
  }

  calculateAvailableForWithdrawal(
    _accountSize: number,
    _totalPnl: number,
    _totalWithdrawals: number,
    _pnlEntries: Array<{ date: Date; amount: number }>,
    _accountType?: string,
    _accountName?: string,
    _notes?: string | null
  ): number {
    return 0
  }

  isEligibleForValidation(
    _accountSize: number,
    _pnlEntries: Array<{ date: Date; amount: number }>,
    _accountType?: string,
    _accountName?: string,
    _notes?: string | null
  ): boolean {
    return false
  }
}
