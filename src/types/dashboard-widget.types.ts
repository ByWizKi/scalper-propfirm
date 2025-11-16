import { LucideIcon } from "lucide-react"
import { StatCardProps } from "@/components/stat-card"

/**
 * Types de widgets disponibles pour le tableau de bord
 */
export enum WidgetType {
  STAT_CARD = "stat_card",
  CALENDAR = "calendar",
  CHART = "chart",
}

/**
 * Interface de base pour tous les widgets (polymorphisme)
 */
export interface BaseWidget {
  id: string
  type: WidgetType
  enabled: boolean
  order: number
  title: string
}

/**
 * Widget de type StatCard
 */
export interface StatCardWidget extends BaseWidget {
  type: WidgetType.STAT_CARD
  config: {
    title: string
    value: string | number | ((data?: WidgetData) => string | number)
    icon: LucideIcon
    variant?: StatCardProps["variant"] | ((data?: WidgetData) => StatCardProps["variant"])
    description?: string | ((data?: WidgetData) => string)
    secondaryText?: string | ((data?: WidgetData) => string)
    size?: StatCardProps["size"]
    explanation?: string
  }
}

/**
 * Widget de type Calendar
 */
export interface CalendarWidget extends BaseWidget {
  type: WidgetType.CALENDAR
  config: {
    calendarType: "expenses" | "withdrawals"
  }
}

/**
 * Type pour les données passées aux widgets
 */
export type WidgetData = Record<string, unknown>

/**
 * Union type pour tous les widgets (polymorphisme)
 */
export type DashboardWidget = StatCardWidget | CalendarWidget

/**
 * Configuration par défaut des widgets du tableau de bord
 */
export interface DashboardConfig {
  widgets: DashboardWidget[]
  layout: "grid" | "list"
}
