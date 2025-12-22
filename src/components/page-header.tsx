"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
}

export function PageHeader({
  title,
  description,
  primaryAction,
  secondaryAction,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        {description && (
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">{description}</p>
        )}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              size="lg"
              variant="default"
              className="w-full sm:w-auto flex items-center gap-2 text-sm font-semibold h-12"
            >
              {primaryAction.icon || <Plus className="h-5 w-5" />}
              <span>{primaryAction.label}</span>
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              size="lg"
              variant="outline"
              className="w-full sm:w-auto flex items-center gap-2 text-sm font-semibold h-12"
            >
              {secondaryAction.icon || <Plus className="h-5 w-5" />}
              <span>{secondaryAction.label}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
