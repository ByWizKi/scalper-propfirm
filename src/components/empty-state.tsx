"use client"

import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-[#1e293b] bg-white/60 dark:bg-[#151b2e]/60 p-10 text-center space-y-4">
      <Icon className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500" />
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          size="lg"
          className="flex items-center gap-2 mt-4 mx-auto h-12"
        >
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  )
}
