"use client"

import { useCallback } from "react"
import { notificationStore } from "@/lib/notification-store"
import type { NotificationType } from "@/lib/notification-store"

export interface NotificationOptions {
  title?: string
  message?: string
  duration?: number
  onComplete?: () => void
}

export function useNotification() {
  const showSuccess = useCallback(
    (
      message: string,
      durationOrCallback?: number | (() => void) | NotificationOptions,
      callbackOrOptions?: () => void | NotificationOptions,
      options?: NotificationOptions
    ) => {
      let finalDuration = 2000
      let finalTitle = "Succès"
      let finalOnComplete: (() => void) | undefined = undefined

      if (typeof durationOrCallback === "number") {
        finalDuration = durationOrCallback
        if (typeof callbackOrOptions === "function") {
          finalOnComplete = callbackOrOptions
        }
      } else if (typeof durationOrCallback === "function") {
        finalOnComplete = durationOrCallback
      } else if (durationOrCallback && typeof durationOrCallback === "object") {
        finalDuration = durationOrCallback.duration ?? 2000
        finalTitle = durationOrCallback.title ?? "Succès"
        finalOnComplete = durationOrCallback.onComplete
      }

      if (options) {
        finalDuration = options.duration ?? finalDuration
        finalTitle = options.title ?? finalTitle
        finalOnComplete = options.onComplete ?? finalOnComplete
      }

      notificationStore.add({
        type: "success",
        message,
        title: finalTitle,
        duration: finalDuration,
        onComplete: finalOnComplete,
      })
    },
    []
  )

  const showError = useCallback((message: string, options?: NotificationOptions) => {
    notificationStore.add({
      type: "error",
      message: options?.message ?? message,
      title: options?.title ?? "Erreur",
      duration: options?.duration ?? 3000,
      onComplete: options?.onComplete,
    })
  }, [])

  const showWarning = useCallback((message: string, options?: NotificationOptions) => {
    notificationStore.add({
      type: "warning",
      message: options?.message ?? message,
      title: options?.title ?? "Avertissement",
      duration: options?.duration ?? 2500,
      onComplete: options?.onComplete,
    })
  }, [])

  const showInfo = useCallback((message: string, options?: NotificationOptions) => {
    notificationStore.add({
      type: "info",
      message: options?.message ?? message,
      title: options?.title ?? "Information",
      duration: options?.duration ?? 2000,
      onComplete: options?.onComplete,
    })
  }, [])

  const showDuplicate = useCallback((message: string, options?: NotificationOptions) => {
    notificationStore.add({
      type: "error",
      message: options?.message ?? message,
      title: options?.title ?? "Doublon détecté",
      duration: options?.duration ?? 2500,
      onComplete: options?.onComplete,
    })
  }, [])

  const showCreate = useCallback(
    (
      message: string,
      durationOrCallback?: number | (() => void) | NotificationOptions,
      callbackOrOptions?: () => void | NotificationOptions,
      options?: NotificationOptions
    ) => {
      let finalDuration = 2500
      let finalTitle = "Création"
      let finalOnComplete: (() => void) | undefined = undefined

      if (typeof durationOrCallback === "number") {
        finalDuration = durationOrCallback
        if (typeof callbackOrOptions === "function") {
          finalOnComplete = callbackOrOptions
        }
      } else if (typeof durationOrCallback === "function") {
        finalOnComplete = durationOrCallback
      } else if (durationOrCallback && typeof durationOrCallback === "object") {
        finalDuration = durationOrCallback.duration ?? 2500
        finalTitle = durationOrCallback.title ?? "Création"
        finalOnComplete = durationOrCallback.onComplete
      }

      if (options) {
        finalDuration = options.duration ?? finalDuration
        finalTitle = options.title ?? finalTitle
        finalOnComplete = options.onComplete ?? finalOnComplete
      }

      notificationStore.add({
        type: "create",
        message,
        title: finalTitle,
        duration: finalDuration,
        onComplete: finalOnComplete,
      })
    },
    []
  )

  const showUpdate = useCallback(
    (
      message: string,
      durationOrCallback?: number | (() => void) | NotificationOptions,
      callbackOrOptions?: () => void | NotificationOptions,
      options?: NotificationOptions
    ) => {
      let finalDuration = 2500
      let finalTitle = "Modification"
      let finalOnComplete: (() => void) | undefined = undefined

      if (typeof durationOrCallback === "number") {
        finalDuration = durationOrCallback
        if (typeof callbackOrOptions === "function") {
          finalOnComplete = callbackOrOptions
        }
      } else if (typeof durationOrCallback === "function") {
        finalOnComplete = durationOrCallback
      } else if (durationOrCallback && typeof durationOrCallback === "object") {
        finalDuration = durationOrCallback.duration ?? 2500
        finalTitle = durationOrCallback.title ?? "Modification"
        finalOnComplete = durationOrCallback.onComplete
      }

      if (options) {
        finalDuration = options.duration ?? finalDuration
        finalTitle = options.title ?? finalTitle
        finalOnComplete = options.onComplete ?? finalOnComplete
      }

      notificationStore.add({
        type: "update",
        message,
        title: finalTitle,
        duration: finalDuration,
        onComplete: finalOnComplete,
      })
    },
    []
  )

  const showDelete = useCallback((message: string, options?: NotificationOptions) => {
    notificationStore.add({
      type: "delete",
      message: options?.message ?? message,
      title: options?.title ?? "Suppression",
      duration: options?.duration ?? 2500,
      onComplete: options?.onComplete,
    })
  }, [])

  const handleError = useCallback(
    (error: unknown, defaultMessage = "Une erreur est survenue") => {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      const errorMessage = errorObj.message || defaultMessage
      const errorCode = (errorObj as any).errorCode || ""
      const status = (errorObj as any).status || 0

      const isDuplicate =
        errorCode === "DUPLICATE_PNL_ENTRY" ||
        errorCode === "DUPLICATE_TRADE" ||
        status === 409 ||
        errorMessage.includes("DUPLICATE_PNL_ENTRY") ||
        errorMessage.includes("DUPLICATE_TRADE") ||
        errorMessage.includes("existe déjà") ||
        errorMessage.includes("doublon") ||
        errorMessage.includes("duplicate") ||
        errorMessage.toLowerCase().includes("already exists") ||
        errorMessage.toLowerCase().includes("déjà existant") ||
        errorMessage.toLowerCase().includes("conflict")

      if (isDuplicate) {
        showDuplicate(
          errorMessage.includes("doublon") || errorMessage.includes("duplicate")
            ? errorMessage
            : "Un doublon a été détecté"
        )
      } else {
        showError(errorMessage)
      }
    },
    [showError, showDuplicate]
  )

  const executeWithNotifications = useCallback(
    async <T,>(
      action: () => Promise<T>,
      options: {
        successMessage?: string
        errorMessage?: string
        onSuccess?: (result: T) => void
        onError?: (error: unknown) => void
        onComplete?: () => void
      } = {}
    ): Promise<T | null> => {
      const { successMessage, errorMessage, onSuccess, onError, onComplete } = options

      try {
        const result = await action()

        if (successMessage) {
          showSuccess(successMessage, 2000, () => {
            onSuccess?.(result)
            onComplete?.()
          })
        } else {
          onSuccess?.(result)
          onComplete?.()
        }

        return result
      } catch (error) {
        handleError(error, errorMessage)
        onError?.(error)
        onComplete?.()

        return null
      }
    },
    [showSuccess, handleError]
  )

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showDuplicate,
    showCreate,
    showUpdate,
    showDelete,
    handleError,
    executeWithNotifications,
  }
}
