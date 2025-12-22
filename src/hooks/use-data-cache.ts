/**
 * Hook simplifié pour le cache de données avec invalidation automatique
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { AppEvents, EventDataMap, eventBus } from "@/lib/events/event-bus"

type EventData = EventDataMap[keyof EventDataMap]

interface CacheOptions<T> {
  invalidateOn?: Array<keyof EventDataMap>
  shouldInvalidate?: (eventData: EventData) => boolean
  initialData?: T
}

export function useDataCache<T>(fetchFn: () => Promise<T>, options: CacheOptions<T> = {}) {
  const { invalidateOn = [], shouldInvalidate = () => true, initialData } = options

  const [data, setData] = useState<T | undefined>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(
    async (force = false) => {
      if (!force && data !== undefined) return

      setIsLoading(true)
      setError(null)

      try {
        const result = await fetchFn()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
      } finally {
        setIsLoading(false)
      }
    },
    [fetchFn, data]
  )

  const invalidate = useCallback(
    (eventData?: EventData) => {
      if (shouldInvalidate(eventData)) {
        setData(undefined)
        fetchData(true)
      }
    },
    [shouldInvalidate, fetchData]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const unsubscribers = invalidateOn.map((event) => eventBus.on(event, invalidate))
    return () => unsubscribers.forEach((unsub) => unsub())
  }, [invalidateOn, invalidate])

  return { data, isLoading, error, refetch: () => fetchData(true) }
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
      shouldInvalidate: (eventData) => !accountId || eventData?.accountId === accountId,
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
    }
  )
}
