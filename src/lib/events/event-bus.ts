/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Event Bus - Pub/Sub Pattern pour la communication entre composants
 * Permet de déclencher et écouter des événements globalement
 */

type EventCallback<T = any> = (data: T) => void

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map()

  /**
   * S'abonner à un événement
   */
  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }

    this.events.get(event)!.add(callback)

    // Retourner une fonction de désabonnement
    return () => this.off(event, callback)
  }

  /**
   * S'abonner à un événement (une seule fois)
   */
  once<T = any>(event: string, callback: EventCallback<T>): void {
    const onceWrapper: EventCallback<T> = (data) => {
      callback(data)
      this.off(event, onceWrapper)
    }

    this.on(event, onceWrapper)
  }

  /**
   * Se désabonner d'un événement
   */
  off<T = any>(event: string, callback: EventCallback<T>): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.events.delete(event)
      }
    }
  }

  /**
   * Émettre un événement
   */
  emit<T = any>(event: string, data?: T): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data)
        } catch (_error) {
          console.error(`Error in event handler for "${event}":`, error)
        }
      })
    }
  }

  /**
   * Supprimer tous les listeners d'un événement
   */
  clear(event?: string): void {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }

  /**
   * Obtenir le nombre de listeners pour un événement
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.size || 0
  }
}

// Instance singleton
export const eventBus = new EventBus()

/**
 * Événements disponibles dans l'application
 */
export const AppEvents = {
  // Comptes
  ACCOUNT_CREATED: "account:created",
  ACCOUNT_UPDATED: "account:updated",
  ACCOUNT_DELETED: "account:deleted",
  ACCOUNT_VALIDATED: "account:validated",

  // PnL
  PNL_CREATED: "pnl:created",
  PNL_UPDATED: "pnl:updated",
  PNL_DELETED: "pnl:deleted",

  // Retraits
  WITHDRAWAL_CREATED: "withdrawal:created",
  WITHDRAWAL_UPDATED: "withdrawal:updated",
  WITHDRAWAL_DELETED: "withdrawal:deleted",

  // Statistiques
  STATS_INVALIDATED: "stats:invalidated",

  // UI
  TOAST_SHOW: "ui:toast:show",
  MODAL_OPEN: "ui:modal:open",
  MODAL_CLOSE: "ui:modal:close",
} as const

export type AppEventType = (typeof AppEvents)[keyof typeof AppEvents]

/**
 * Types de données pour chaque événement
 */
export interface EventDataMap {
  [AppEvents.ACCOUNT_CREATED]: { accountId: string }
  [AppEvents.ACCOUNT_UPDATED]: { accountId: string }
  [AppEvents.ACCOUNT_DELETED]: { accountId: string }
  [AppEvents.ACCOUNT_VALIDATED]: { accountId: string }
  [AppEvents.PNL_CREATED]: { accountId: string; pnlId: string }
  [AppEvents.PNL_UPDATED]: { accountId: string; pnlId: string }
  [AppEvents.PNL_DELETED]: { accountId: string; pnlId: string }
  [AppEvents.WITHDRAWAL_CREATED]: { accountId: string; withdrawalId: string }
  [AppEvents.WITHDRAWAL_UPDATED]: { accountId: string; withdrawalId: string }
  [AppEvents.WITHDRAWAL_DELETED]: { accountId: string; withdrawalId: string }
  [AppEvents.STATS_INVALIDATED]: { accountId?: string }
  [AppEvents.TOAST_SHOW]: { title: string; description?: string; variant?: "default" | "destructive" }
  [AppEvents.MODAL_OPEN]: { modalId: string }
  [AppEvents.MODAL_CLOSE]: { modalId: string }
}

/**
 * Helper typé pour émettre des événements
 */
export function emitEvent<K extends keyof EventDataMap>(
  event: K,
  data: EventDataMap[K]
): void {
  eventBus.emit(event, data)
}

