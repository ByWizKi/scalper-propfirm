/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Hook pour gérer le cache de données avec invalidation automatique
 * basée sur les événements
 */

"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { AppEvents, EventDataMap, eventBus } from "@/lib/events/event-bus"

interface CacheOptions<T> {
  /**
   * Événements qui invalident le cache
   */
  invalidateOn?: Array<keyof EventDataMap>

  /**
   * Fonction pour vérifier si l'événement concerne ces données
   */
  shouldInvalidate?: (eventData: any) => boolean

  /**
   * Délai avant de refetch après invalidation (ms)
   */
  refetchDelay?: number

  /**
   * Valeur initiale
   */
  initialData?: T
}

/**
 * Hook pour gérer le cache avec invalidation automatique
 */
export function useDataCache<T>(
  fetchFn: () => Promise<T>,
  options: CacheOptions<T> = {}
) {
  const {
    invalidateOn = [],
    shouldInvalidate = () => true,
    refetchDelay = 0,
    initialData,
  } = options

  const [data, setData] = useState<T | undefined>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)

  const isMountedRef = useRef(true)
  const refetchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const fetchDataRef = useRef<((force?: boolean, silent?: boolean) => Promise<void>) | null>(null)
  const invalidateRef = useRef<((eventData?: any) => void) | null>(null)

  /**
   * Fonction pour fetch les données
   */
  const fetchData = useCallback(async (force = false, silent = false) => {
    console.log("[useDataCache] fetchData called - force:", force, "silent:", silent)
    // Éviter les fetches multiples rapides (sauf si forcé ou silencieux)
    // En mode silencieux, on force toujours le fetch pour mettre à jour l'affichage immédiatement
    const now = Date.now()
    if (!force && !silent && now - lastFetchTime < 500) {
      console.log("[useDataCache] Skipping fetch - too soon")
      return
    }

    // Ne pas mettre isLoading à true lors des mises à jour silencieuses (évite le scroll vers le haut)
    if (!silent) {
      setIsLoading(true)
    }
    setError(null)

    try {
      console.log("[useDataCache] Fetching data...")
      const result = await fetchFn()
      console.log("[useDataCache] Data fetched:", result)

      if (isMountedRef.current) {
        console.log("[useDataCache] Setting data...")
        // Utiliser la fonction de mise à jour de setState pour garantir que React détecte le changement
        setData((prevData) => {
          console.log("[useDataCache] setData callback - prevData:", prevData)
          console.log("[useDataCache] setData callback - new result:", result)

          // Comparer les données pour voir si elles ont vraiment changé
          const prevJson = JSON.stringify(prevData)
          const newJson = JSON.stringify(result)
          const hasChanged = prevJson !== newJson
          console.log("[useDataCache] Data has changed:", hasChanged)

          if (!hasChanged) {
            console.log("[useDataCache] Data is the same, but forcing update with new reference")
            // Même si les données sont identiques, créer une nouvelle référence pour forcer le re-render
            return result ? JSON.parse(JSON.stringify(result)) : result
          }

          // Les données ont changé, retourner le nouveau résultat
          return result
        })
        setLastFetchTime(Date.now())
        console.log("[useDataCache] Data set successfully")
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
      }
    } finally {
      if (isMountedRef.current) {
        if (!silent) {
          setIsLoading(false)
        }
      }
    }
  }, [fetchFn, lastFetchTime])

  // Mettre à jour les références immédiatement (pas dans useEffect pour éviter les retards)
  fetchDataRef.current = fetchData

  /**
   * Fonction pour invalider le cache et refetch
   */
  const invalidate = useCallback((eventData?: any) => {
    console.log("[useDataCache] invalidate called with eventData:", eventData)
    const shouldInvalidateResult = shouldInvalidate(eventData)
    console.log("[useDataCache] shouldInvalidate result:", shouldInvalidateResult, "for eventData:", eventData)
    if (!shouldInvalidateResult) {
      console.log("[useDataCache] shouldInvalidate returned false, skipping")
      return
    }

    console.log("[useDataCache] Invalidating cache and fetching new data...")
    // Nettoyer le timeout précédent
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current)
    }

    // Refetch immédiat en mode silencieux (pas de isLoading, évite le scroll vers le haut)
    // Le délai est ignoré pour les mises à jour automatiques pour une meilleure réactivité
    // Utiliser fetchDataRef pour éviter les dépendances qui changent
    if (fetchDataRef.current) {
      console.log("[useDataCache] Calling fetchData from ref")
      fetchDataRef.current(true, true) // silent = true pour éviter le scroll, force = true pour forcer le fetch
    } else {
      console.error("[useDataCache] fetchDataRef.current is null! This should not happen.")
    }
  }, [shouldInvalidate]) // Ne pas inclure fetchData pour éviter les réinscriptions constantes

  // Mettre à jour la référence invalidate immédiatement (pas dans useEffect pour éviter les retards)
  // Cela garantit que la ref est toujours à jour quand les event listeners sont appelés
  invalidateRef.current = invalidate

  /**
   * Fetch initial
   */
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // On veut juste le premier fetch

  /**
   * Cleanup au démontage
   */
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current)
      }
    }
  }, [])

  /**
   * S'abonner aux événements d'invalidation
   * On utilise useEffect pour s'abonner à tous les événements d'un coup
   * car on ne peut pas appeler useEvent dans une boucle (règles des hooks React)
   */
  const eventsKey = useMemo(() => invalidateOn.join(","), [invalidateOn])

  useEffect(() => {
    console.log("[useDataCache] Setting up event listeners for events:", invalidateOn)
    const unsubscribers: Array<() => void> = []

    invalidateOn.forEach((event) => {
      const handler = (eventData: any) => {
        console.log("[useDataCache] Event received:", event, "with data:", eventData)
        // Utiliser invalidateRef pour éviter les closures obsolètes
        if (invalidateRef.current) {
          console.log("[useDataCache] Calling invalidate from ref")
          invalidateRef.current(eventData)
        } else {
          console.error("[useDataCache] invalidateRef.current is null! This should not happen.")
        }
      }
      const unsubscribe = eventBus.on(event, handler)
      unsubscribers.push(unsubscribe)
      console.log("[useDataCache] Listener registered for event:", event)
    })

    return () => {
      console.log("[useDataCache] Cleaning up event listeners")
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
    // Utiliser invalidateRef pour éviter les réinscriptions constantes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsKey]) // eventsKey change uniquement quand les événements à écouter changent

  /**
   * Fonction pour mettre à jour les données localement (optimistic update)
   */
  const updateData = useCallback((updater: (current: T | undefined) => T | undefined) => {
    setData((current) => updater(current))
  }, [])

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchData(true, false), // Mode normal pour les refetch manuels
    invalidate,
    updateData, // Permet de mettre à jour les données localement
  }
}

/**
 * Hook spécialisé pour les comptes
 */
export function useAccountCache(accountId?: string) {
  return useDataCache(
    async () => {
      if (!accountId) return null

      const response = await fetch(`/api/accounts/${accountId}`, {
        cache: "no-store",
      })

      if (!response.ok) throw new Error("Failed to fetch account")

      return response.json()
    },
    {
      invalidateOn: [
        AppEvents.ACCOUNT_UPDATED,
        AppEvents.ACCOUNT_VALIDATED,
        AppEvents.PNL_CREATED,
        AppEvents.PNL_UPDATED,
        AppEvents.PNL_DELETED,
        AppEvents.WITHDRAWAL_CREATED,
        AppEvents.WITHDRAWAL_UPDATED,
        AppEvents.WITHDRAWAL_DELETED,
      ],
      shouldInvalidate: (eventData) => {
        // Invalider uniquement si l'événement concerne ce compte
        const result = !accountId || eventData?.accountId === accountId
        console.log("[useAccountCache] shouldInvalidate check:", { accountId, eventAccountId: eventData?.accountId, result })
        return result
      },
      refetchDelay: 0, // Pas de délai pour une mise à jour immédiate de l'affichage
    }
  )
}

/**
 * Hook spécialisé pour la liste des comptes
 */
export function useAccountsListCache() {
  return useDataCache(
    async () => {
      const response = await fetch("/api/accounts", { cache: "no-store" })
      if (!response.ok) throw new Error("Failed to fetch accounts")
      return response.json()
    },
    {
      invalidateOn: [
        AppEvents.ACCOUNT_CREATED,
        AppEvents.ACCOUNT_UPDATED,
        AppEvents.ACCOUNT_DELETED,
        AppEvents.ACCOUNT_VALIDATED,
      ],
      refetchDelay: 100,
    }
  )
}

/**
 * Hook spécialisé pour les statistiques du dashboard
 */
export function useDashboardStatsCache() {
  return useDataCache(
    async () => {
      const [accountsRes, statsRes, withdrawalsRes] = await Promise.all([
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/stats", { cache: "no-store" }),
        fetch("/api/withdrawals", { cache: "no-store" }),
      ])

      if (!accountsRes.ok || !statsRes.ok || !withdrawalsRes.ok) {
        throw new Error("Failed to fetch dashboard data")
      }

      const accounts = await accountsRes.json()
      const stats = await statsRes.json()
      const withdrawals = await withdrawalsRes.json()

      return { accounts, stats, withdrawals }
    },
    {
      invalidateOn: [
        AppEvents.ACCOUNT_CREATED,
        AppEvents.ACCOUNT_UPDATED,
        AppEvents.ACCOUNT_DELETED,
        AppEvents.PNL_CREATED,
        AppEvents.PNL_UPDATED,
        AppEvents.PNL_DELETED,
        AppEvents.WITHDRAWAL_CREATED,
        AppEvents.WITHDRAWAL_UPDATED,
        AppEvents.WITHDRAWAL_DELETED,
      ],
      refetchDelay: 100,
    }
  )
}

