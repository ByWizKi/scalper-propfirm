"use client"

import * as React from "react"
import { StatCard } from "@/components/stat-card"
import { ExpensesCalendar } from "@/components/expenses-calendar"
import { WithdrawalsCalendar } from "@/components/withdrawals-calendar"
import { DashboardWidget, WidgetType, WidgetData } from "@/types/dashboard-widget.types"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Eye, EyeOff, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DashboardWidgetProps {
  widget: DashboardWidget
  onToggle: (widgetId: string) => void
  onDelete?: (widgetId: string) => void
  data?: WidgetData // Données pour calculer les valeurs dynamiques
}

/**
 * Composant polymorphique pour afficher un widget
 * Utilise le pattern Strategy pour gérer différents types de widgets
 */
export function DashboardWidgetRenderer({
  widget,
  onToggle,
  onDelete,
  data,
}: DashboardWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!widget.enabled) {
    return null
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Rendu polymorphique du widget */}
      {renderWidgetByType(widget, data)}

      {/* Conteneur pour les boutons en bas à droite */}
      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {/* Bouton de drag */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
        >
          <GripVertical className="h-4 w-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
        </div>

        {/* Bouton toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-1.5"
          onClick={() => onToggle(widget.id)}
          aria-label={widget.enabled ? "Masquer" : "Afficher"}
          title={widget.enabled ? "Masquer" : "Afficher"}
        >
          {widget.enabled ? (
            <Eye className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          ) : (
            <EyeOff className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          )}
        </Button>

        {/* Bouton supprimer (uniquement pour les widgets personnalisés) */}
        {onDelete && widget.id.startsWith("custom-stat-") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20"
            onClick={() => onDelete(widget.id)}
            aria-label="Supprimer"
            title="Supprimer"
          >
            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Fonction polymorphique pour rendre le widget selon son type
 */
function renderWidgetByType(widget: DashboardWidget, data?: WidgetData) {
  switch (widget.type) {
    case WidgetType.STAT_CARD:
      return renderStatCardWidget(widget, data)
    case WidgetType.CALENDAR:
      return renderCalendarWidget(widget, data)
    default:
      return null
  }
}

function renderStatCardWidget(widget: DashboardWidget, data?: WidgetData) {
  if (widget.type !== WidgetType.STAT_CARD) return null

  const { config } = widget

  // Calculer les valeurs dynamiques si ce sont des fonctions
  const value = typeof config.value === "function" ? config.value(data) : config.value
  const description =
    typeof config.description === "function" ? config.description(data) : config.description
  const secondaryText =
    typeof config.secondaryText === "function" ? config.secondaryText(data) : config.secondaryText
  const variant = typeof config.variant === "function" ? config.variant(data) : config.variant

  return (
    <StatCard
      title={config.title}
      value={value}
      icon={config.icon}
      variant={variant}
      description={description}
      secondaryText={secondaryText}
      size={config.size}
      className="min-w-0"
    />
  )
}

function renderCalendarWidget(widget: DashboardWidget, data?: WidgetData) {
  if (widget.type !== WidgetType.CALENDAR) return null

  const { config } = widget

  if (config.calendarType === "expenses") {
    const accounts = Array.isArray(data?.accounts) ? data.accounts : []
    return (
      <ExpensesCalendar
        expenses={
          accounts as Array<{ id: string; createdAt: string; pricePaid: number; name: string }>
        }
      />
    )
  }

  if (config.calendarType === "withdrawals") {
    const withdrawals = Array.isArray(data?.withdrawals) ? data.withdrawals : []
    return (
      <WithdrawalsCalendar
        withdrawals={
          withdrawals as Array<{
            id: string
            date: string
            amount: number
            notes?: string
            account: { propfirm: string }
          }>
        }
      />
    )
  }

  return null
}
