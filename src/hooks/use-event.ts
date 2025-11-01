/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Hooks React pour utiliser le système d'événements
 */

"use client"

import { useEffect, useCallback, useRef } from "react"
import { eventBus, AppEventType, EventDataMap } from "@/lib/events/event-bus"

/**
 * Hook pour écouter un événement
 * Se désabonne automatiquement au démontage du composant
 */
export function useEvent<K extends keyof EventDataMap>(
  event: K,
  callback: (data: EventDataMap[K]) => void,
  deps: React.DependencyList = []
) {
  const callbackRef = useRef(callback)

  // Mettre à jour la référence à chaque changement
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const handler = (data: EventDataMap[K]) => {
      callbackRef.current(data)
    }

    const unsubscribe = eventBus.on(event, handler)

    return () => {
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps])
}

/**
 * Hook pour émettre des événements
 */
export function useEmitEvent() {
  return useCallback(<K extends keyof EventDataMap>(
    event: K,
    data: EventDataMap[K]
  ) => {
    eventBus.emit(event, data)
  }, [])
}

/**
 * Hook pour écouter plusieurs événements
 */
export function useEvents(
  events: Partial<{
    [K in keyof EventDataMap]: (data: EventDataMap[K]) => void
  }>
) {
  useEffect(() => {
    const unsubscribers: Array<() => void> = []

    Object.entries(events).forEach(([event, callback]) => {
      if (callback) {
        const unsubscribe = eventBus.on(event as AppEventType, callback as any)
        unsubscribers.push(unsubscribe)
      }
    })

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [events])
}

