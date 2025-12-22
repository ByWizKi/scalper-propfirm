/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Hook pour gérer les mutations (CREATE, UPDATE, DELETE)
 * avec émission automatique d'événements et optimistic updates
 */

"use client"

import { useState, useCallback } from "react"
import { emitEvent, AppEvents, EventDataMap } from "@/lib/events/event-bus"

interface MutationOptions<TData, TVariables> {
  /**
   * Événement à émettre en cas de succès
   */
  successEvent?: keyof EventDataMap

  /**
   * Fonction pour extraire les données de l'événement
   */
  getEventData?: (result: TData, variables: TVariables) => any

  /**
   * Messages de notification (utilise le système de notification unifié)
   */
  messages?: {
    success?: string
    error?: string
    loading?: string
  }

  /**
   * Callback après succès
   */
  onSuccess?: (data: TData) => void

  /**
   * Callback après erreur
   */
  onError?: (error: Error) => void

  /**
   * Si true, les notifications sont gérées automatiquement par le hook
   * Si false, les composants doivent gérer les notifications manuellement
   */
  autoNotify?: boolean
}

export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: MutationOptions<TData, TVariables> = {}
) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<TData | null>(null)

  // Import dynamique pour éviter les dépendances circulaires
  const getNotification = useCallback(() => {
    // Lazy import pour éviter les problèmes de dépendances circulaires
    return import("@/hooks/use-notification").then((m) => m.useNotification())
  }, [])

  const mutate = useCallback(
    async (variables: TVariables) => {
      setIsLoading(true)
      setError(null)

      // Les notifications sont maintenant gérées par les composants qui utilisent useNotification
      // Le hook mutation ne gère plus les notifications automatiquement
      // Cela permet un meilleur contrôle et évite les conflits

      try {
        const result = await mutationFn(variables)
        setData(result)

        // Émettre l'événement immédiatement (synchrone)
        // Le cache écoute déjà les événements via useEvent, donc l'émission synchrone fonctionne
        if (options.successEvent && options.getEventData) {
          const eventData = options.getEventData(result, variables)
          console.log("[useMutation] Emitting event:", options.successEvent, "with data:", eventData)
          emitEvent(options.successEvent, eventData)
          console.log("[useMutation] Event emitted")
        } else {
          console.log("[useMutation] No event to emit - successEvent:", options.successEvent, "getEventData:", !!options.getEventData)
        }

        // Callback de succès
        if (options.onSuccess) {
          options.onSuccess(result)
        }

        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error")
        setError(error)

        // Callback d'erreur
        if (options.onError) {
          options.onError(error)
        }

        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [mutationFn, options]
  )

  return {
    mutate,
    isLoading,
    error,
    data,
  }
}

/**
 * Mutations prédéfinies pour les comptes
 */
export function useCreateAccountMutation() {
  return useMutation(
    async (data: any) => {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create account")
      }

      return response.json()
    },
    {
      successEvent: AppEvents.ACCOUNT_CREATED,
      getEventData: (result) => ({ accountId: result.id }),
      // Les notifications sont gérées par les composants via useNotification
      messages: {},
    }
  )
}

export function useUpdateAccountMutation() {
  return useMutation(
    async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update account")
      }

      const result = await response.json()

      // Si le compte a été validé, émettre également l'événement ACCOUNT_VALIDATED
      if (data.status === "VALIDATED") {
        emitEvent(AppEvents.ACCOUNT_VALIDATED, { accountId: id })
      }

      return result
    },
    {
      successEvent: AppEvents.ACCOUNT_UPDATED,
      getEventData: (result, variables) => ({ accountId: variables.id }),
      // Les notifications sont gérées par les composants via useNotification
      messages: {},
    }
  )
}

export function useDeleteAccountMutation() {
  return useMutation(
    async (id: string) => {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete account")
      }

      return response.json()
    },
    {
      successEvent: AppEvents.ACCOUNT_DELETED,
      getEventData: (result, id) => ({ accountId: id }),
      // Les notifications sont gérées par les composants via useNotification
      messages: {},
    }
  )
}

/**
 * Mutations prédéfinies pour les PnL
 */
export function useCreatePnlMutation() {
  return useMutation(
    async (data: any) => {
      // Convertir le montant en nombre si c'est une string
      const payload = {
        ...data,
        amount: typeof data.amount === "string" ? parseFloat(data.amount) : data.amount,
      }

      // Valider que le montant est un nombre valide
      if (isNaN(payload.amount)) {
        throw new Error("Montant invalide")
      }

      const response = await fetch("/api/pnl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        // Préserver les informations d'erreur pour la détection de doublons
        const errorObj = new Error(error.message || "Failed to create PnL")
        ;(errorObj as any).errorCode = error.error
        ;(errorObj as any).status = response.status
        throw errorObj
      }

      return response.json()
    },
    {
      successEvent: AppEvents.PNL_CREATED,
      getEventData: (result) => ({
        accountId: result.accountId,
        pnlId: result.id,
      }),
      // Les notifications sont gérées par les composants via useNotification
      messages: {},
    }
  )
}

export function useUpdatePnlMutation() {
  return useMutation(
    async (data: { id: string; accountId: string; date: string; amount: number; notes?: string }) => {
      const response = await fetch(`/api/pnl/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: data.date,
          amount: data.amount,
          notes: data.notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        // Préserver les informations d'erreur pour la détection de doublons
        const errorObj = new Error(error.message || "Failed to update PnL")
        ;(errorObj as any).errorCode = error.error
        ;(errorObj as any).status = response.status
        throw errorObj
      }

      return response.json()
    },
    {
      successEvent: AppEvents.PNL_UPDATED,
      getEventData: (result) => ({
        accountId: result.accountId,
        pnlId: result.id,
      }),
      // Les notifications sont gérées par les composants via useNotification
      messages: {},
    }
  )
}

export function useDeletePnlMutation() {
  const mutation = useMutation(
    async ({ id, accountId }: { id: string; accountId: string }) => {
      const response = await fetch(`/api/pnl/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        // Préserver les informations d'erreur pour la détection de doublons
        const errorObj = new Error(error.message || "Failed to delete PnL")
        ;(errorObj as any).errorCode = error.error
        ;(errorObj as any).status = response.status
        throw errorObj
      }

      return { id, accountId }
    },
    {
      successEvent: AppEvents.PNL_DELETED,
      getEventData: (result) => ({
        accountId: result.accountId,
        pnlId: result.id,
      }),
      // Les notifications sont gérées par les composants via useNotification
      messages: {},
    }
  )

  return {
    ...mutation,
    mutate: async (variables: { id: string; accountId: string }) => {
      // La confirmation sera gérée dans les composants qui utilisent cette mutation
      return mutation.mutate(variables)
    },
  }
}

/**
 * Mutation pour créer plusieurs PnL à la fois
 */
export function useCreateMultiplePnlMutation() {
  return useMutation(
    async (data: { accountIds: string[]; date: string; amount: string; notes: string }) => {
      const amountNumber = parseFloat(data.amount)
      if (isNaN(amountNumber)) {
        throw new Error("Montant invalide")
      }

      const promises = data.accountIds.map(accountId =>
        fetch("/api/pnl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            date: data.date,
            amount: amountNumber,
            notes: data.notes,
          }),
        }).then(async (response) => {
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || "Failed to create PnL")
          }
          return response.json()
        })
      )

      const results = await Promise.all(promises)

      // Émettre un événement pour chaque PnL créé
      results.forEach((result) => {
        emitEvent(AppEvents.PNL_CREATED, {
          accountId: result.accountId,
          pnlId: result.id,
        })
      })

      return results
    },
    {
      // Les notifications sont gérées par les composants via useNotification
      messages: {},
    }
  )
}

/**
 * Mutations prédéfinies pour les retraits
 */
export function useCreateWithdrawalMutation() {
  return useMutation(
    async (data: any) => {
      const response = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create withdrawal")
      }

      return response.json()
    },
    {
      successEvent: AppEvents.WITHDRAWAL_CREATED,
      getEventData: (result) => ({
        accountId: result.accountId,
        withdrawalId: result.id,
      }),
      // Les notifications sont gérées par les composants via useNotification
      messages: {},
    }
  )
}

export function useDeleteWithdrawalMutation() {
  return useMutation(
    async ({ id, accountId }: { id: string; accountId: string }) => {
      const response = await fetch(`/api/withdrawals/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete withdrawal")
      }

      return { id, accountId }
    },
    {
      successEvent: AppEvents.WITHDRAWAL_DELETED,
      getEventData: (result) => ({
        accountId: result.accountId,
        withdrawalId: result.id,
      }),
      // Les notifications sont gérées par les composants via useNotification
      messages: {},
    }
  )
}

/**
 * Mutation pour créer plusieurs retraits à la fois
 */
export function useCreateMultipleWithdrawalsMutation() {
  return useMutation(
    async (data: { accountIds: string[]; date: string; amount: string; notes: string }) => {
      const amountNum = parseFloat(data.amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Montant invalide")
      }

      const promises = data.accountIds.map(accountId =>
        fetch("/api/withdrawals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            date: data.date,
            amount: amountNum,
            notes: data.notes,
          }),
        }).then(async (response) => {
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || "Failed to create withdrawal")
          }
          return response.json()
        })
      )

      const results = await Promise.all(promises)

      // Émettre un événement pour chaque retrait créé
      results.forEach((result) => {
        emitEvent(AppEvents.WITHDRAWAL_CREATED, {
          accountId: result.accountId,
          withdrawalId: result.id,
        })
      })

      return results
    },
    {
      // Les notifications sont gérées par les composants via useNotification
      messages: {},
    }
  )
}

