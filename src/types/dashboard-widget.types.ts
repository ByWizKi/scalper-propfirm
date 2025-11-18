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
export interface WidgetData {
  stats?: {
    totalAccounts?: number
    activeAccounts?: number
    fundedAccounts?: number
    totalInvested?: number
    totalPnl?: number
    totalWithdrawals?: number
    globalRoi?: number
    evalSuccessRate?: number
    avgValidationDays?: number
    monthlyPnl?: number
    totalWithdrawalCount?: number
    avgPnlPerAccount?: number
    bestDay?: number
    worstDay?: number
    tradingDays?: number
    activeAccountsRate?: number
    weeklyPnl?: number
    avgPnlPerTradingDay?: number
    activeFundedAccounts?: number
    totalCapitalUnderManagement?: number
    globalSuccessRate?: number
    avgWithdrawal?: number
    totalTaxes?: number
    fundedAccountsPnl?: number
    evalAccountsPnl?: number
    daysSinceFirstAccount?: number
    withdrawalRate?: number
    archivedAccounts?: number
    validatedEval?: number
    failedEval?: number
    [key: string]: unknown
  }
  accounts?: unknown[]
  withdrawals?: unknown[]
  totalNetWithdrawals?: number
  [key: string]: unknown
}

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
