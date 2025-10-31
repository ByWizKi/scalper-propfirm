/**
 * Hook pour gérer le cache de données avec invalidation automatique
 * basée sur les événements
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useEvent } from "./use-event"
import { AppEvents, EventDataMap } from "@/lib/events/event-bus"

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
  const refetchTimeoutRef = useRef<NodeJS.Timeout>()

  /**
   * Fonction pour fetch les données
   */
  const fetchData = useCallback(async (force = false) => {
    // Éviter les fetches multiples rapides
    const now = Date.now()
    if (!force && now - lastFetchTime < 500) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchFn()

      if (isMountedRef.current) {
        setData(result)
        setLastFetchTime(Date.now())
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [fetchFn, lastFetchTime])

  /**
   * Fonction pour invalider le cache et refetch
   */
  const invalidate = useCallback((eventData?: any) => {
    if (!shouldInvalidate(eventData)) {
      return
    }

    // Nettoyer le timeout précédent
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current)
    }

    // Refetch avec délai optionnel
    if (refetchDelay > 0) {
      refetchTimeoutRef.current = setTimeout(() => {
        fetchData(true)
      }, refetchDelay)
    } else {
      fetchData(true)
    }
  }, [shouldInvalidate, refetchDelay, fetchData])

  /**
   * Fetch initial
   */
  useEffect(() => {
    fetchData()
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
   */
  invalidateOn.forEach((event) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEvent(event, invalidate)
  })

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchData(true),
    invalidate,
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
        return !accountId || eventData?.accountId === accountId
      },
      refetchDelay: 100, // Petit délai pour regrouper les événements
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

