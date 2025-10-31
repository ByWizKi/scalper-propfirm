/**
 * Hook pour gérer les mutations (CREATE, UPDATE, DELETE)
 * avec émission automatique d'événements et optimistic updates
 */

"use client"

import { useState, useCallback } from "react"
import { emitEvent, AppEvents, EventDataMap } from "@/lib/events/event-bus"
import { toast } from "@/hooks/use-toast"

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
   * Messages de toast
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
}

export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: MutationOptions<TData, TVariables> = {}
) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<TData | null>(null)

  const mutate = useCallback(
    async (variables: TVariables) => {
      setIsLoading(true)
      setError(null)

      // Toast de chargement
      if (options.messages?.loading) {
        toast({
          title: options.messages.loading,
        })
      }

      try {
        const result = await mutationFn(variables)
        setData(result)

        // Émettre l'événement
        if (options.successEvent && options.getEventData) {
          const eventData = options.getEventData(result, variables)
          emitEvent(options.successEvent, eventData)
        }

        // Toast de succès
        if (options.messages?.success) {
          toast({
            title: options.messages.success,
          })
        }

        // Callback de succès
        if (options.onSuccess) {
          options.onSuccess(result)
        }

        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error")
        setError(error)

        // Toast d'erreur
        toast({
          title: "Erreur",
          description: options.messages?.error || error.message,
          variant: "destructive",
        })

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
      messages: {
        success: "Compte créé avec succès",
        error: "Erreur lors de la création du compte",
      },
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
      messages: {
        success: "Compte mis à jour",
        error: "Erreur lors de la mise à jour",
      },
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
      messages: {
        success: "Compte supprimé",
        error: "Erreur lors de la suppression",
      },
    }
  )
}

/**
 * Mutations prédéfinies pour les PnL
 */
export function useCreatePnlMutation() {
  return useMutation(
    async (data: any) => {
      const response = await fetch("/api/pnl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create PnL")
      }

      return response.json()
    },
    {
      successEvent: AppEvents.PNL_CREATED,
      getEventData: (result) => ({
        accountId: result.accountId,
        pnlId: result.id,
      }),
      messages: {
        success: "PnL ajouté",
        error: "Erreur lors de l'ajout du PnL",
      },
    }
  )
}

export function useDeletePnlMutation() {
  return useMutation(
    async ({ id, accountId }: { id: string; accountId: string }) => {
      const response = await fetch(`/api/pnl/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete PnL")
      }

      return { id, accountId }
    },
    {
      successEvent: AppEvents.PNL_DELETED,
      getEventData: (result) => ({
        accountId: result.accountId,
        pnlId: result.id,
      }),
      messages: {
        success: "PnL supprimé",
        error: "Erreur lors de la suppression",
      },
    }
  )
}

/**
 * Mutation pour créer plusieurs PnL à la fois
 */
export function useCreateMultiplePnlMutation() {
  return useMutation(
    async (data: { accountIds: string[]; date: string; amount: string; notes: string }) => {
      const promises = data.accountIds.map(accountId =>
        fetch("/api/pnl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            date: data.date,
            amount: data.amount,
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
      messages: {
        success: "PnL ajoutés avec succès",
        error: "Erreur lors de l'ajout des PnL",
      },
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
      messages: {
        success: "Retrait ajouté",
        error: "Erreur lors de l'ajout du retrait",
      },
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
      messages: {
        success: "Retrait supprimé",
        error: "Erreur lors de la suppression",
      },
    }
  )
}

/**
 * Mutation pour créer plusieurs retraits à la fois
 */
export function useCreateMultipleWithdrawalsMutation() {
  return useMutation(
    async (data: { accountIds: string[]; date: string; amount: string; notes: string }) => {
      const promises = data.accountIds.map(accountId =>
        fetch("/api/withdrawals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            date: data.date,
            amount: data.amount,
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
      messages: {
        success: "Retraits ajoutés avec succès",
        error: "Erreur lors de l'ajout des retraits",
      },
    }
  )
}

