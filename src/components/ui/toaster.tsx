"use client"

import React, { memo } from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// Composant d'icône mémorisé pour éviter les re-renders
const ToastIcon = memo(
  ({
    variant,
    className,
  }: {
    variant?: "default" | "destructive"
    className?: string
  }) => {
    if (variant === "destructive") {
      return (
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20",
            className
          )}
        >
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
      )
    }

    return (
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20",
          className
        )}
      >
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>
    )
  }
)
ToastIcon.displayName = "ToastIcon"

// Composant de toast individuel mémorisé
const ToastItem = memo(
  ({
    id,
    title,
    description,
    action,
    variant,
    ...props
  }: {
    id: string
    title?: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactElement
    variant?: "default" | "destructive"
  } & React.ComponentPropsWithoutRef<typeof Toast>) => {
    return (
      <Toast key={id} duration={props.duration || 2000} {...props} variant={variant}>
        <div className="flex items-start gap-3 w-full">
          <ToastIcon variant={variant} />
          <div className="grid gap-1 flex-1 min-w-0">
            {title && <ToastTitle className="text-sm font-semibold">{title}</ToastTitle>}
            {description && (
              <ToastDescription className="text-sm text-muted-foreground">
                {description}
              </ToastDescription>
            )}
          </div>
          {action}
          <ToastClose />
        </div>
      </Toast>
    )
  }
)
ToastItem.displayName = "ToastItem"

// Composant principal optimisé
export const Toaster = memo(() => {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={2000} swipeDirection="right">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
      <ToastViewport />
    </ToastProvider>
  )
})
Toaster.displayName = "Toaster"

