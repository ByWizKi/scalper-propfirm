"use client"

import { useState, useCallback } from "react"
import { DashboardWidget, WidgetType, WidgetData } from "@/types/dashboard-widget.types"
import {
  Wallet,
  TrendingUp,
  DollarSign,
  Target,
  Percent,
  Award,
  Clock,
  Calendar,
  BarChart3,
  Activity,
  Zap,
  ArrowUpCircle,
  ArrowDownCircle,
  Coins,
  Layers,
  FileText,
  PieChart,
  ShieldCheck,
} from "lucide-react"

const STORAGE_KEY = "dashboard-widgets-config"

/**
 * Configuration par défaut des widgets
 */
function getDefaultWidgets(): DashboardWidget[] {
  return [
    {
      id: "total-accounts",
      type: WidgetType.STAT_CARD,
      enabled: true,
      order: 0,
      title: "Total Comptes",
      config: {
        title: "Total Comptes",
        value: (data?: WidgetData) => data?.stats?.totalAccounts || 0,
        icon: Wallet,
        variant: "neutral",
        description: (data?: WidgetData) =>
          `${data?.stats?.activeAccounts || 0} actifs, ${data?.stats?.fundedAccounts || 0} financés`,
      },
    },
    {
      id: "total-invested",
      type: WidgetType.STAT_CARD,
      enabled: true,
      order: 1,
      title: "Investi Total",
      config: {
        title: "Investi Total",
        value: (data?: WidgetData) => {
          const amount = data?.stats?.totalInvested || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: Target,
        variant: "neutral",
        secondaryText: (data?: WidgetData) => {
          const amount = (data?.stats?.totalInvested || 0) * 0.92
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
          }).format(amount)
        },
        description: "Argent dépensé pour tous les comptes",
      },
    },
    {
      id: "net-withdrawals",
      type: WidgetType.STAT_CARD,
      enabled: true,
      order: 2,
      title: "Retraits Nets",
      config: {
        title: "Retraits Nets",
        value: (data?: WidgetData) => {
          const amount = data?.totalNetWithdrawals || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: DollarSign,
        variant: "success",
        secondaryText: (data?: WidgetData) => {
          const amount = (data?.totalNetWithdrawals || 0) * 0.92
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
          }).format(amount)
        },
        description: "Argent retiré après les taxes",
      },
    },
    {
      id: "balance",
      type: WidgetType.STAT_CARD,
      enabled: true,
      order: 3,
      title: "Bilan",
      config: {
        title: "Bilan",
        value: (data?: WidgetData) => {
          const amount = (data?.totalNetWithdrawals || 0) - (data?.stats?.totalInvested || 0)
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: TrendingUp,
        variant: (data?: WidgetData) => {
          const amount = (data?.totalNetWithdrawals || 0) - (data?.stats?.totalInvested || 0)
          if (amount > 0) return "success"
          if (amount < 0) return "danger"
          return "neutral"
        },
        secondaryText: (data?: WidgetData) => {
          const amount =
            ((data?.totalNetWithdrawals || 0) - (data?.stats?.totalInvested || 0)) * 0.92
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
          }).format(amount)
        },
        description: "Gain ou perte total",
      },
    },
    {
      id: "global-roi",
      type: WidgetType.STAT_CARD,
      enabled: true,
      order: 4,
      title: "ROI Global",
      config: {
        title: "ROI Global",
        value: (data?: WidgetData) => `${(data?.stats?.globalRoi || 0).toFixed(1)}%`,
        icon: Percent,
        variant: (data?: WidgetData) => {
          const roi = data?.stats?.globalRoi || 0
          if (roi > 0) return "success"
          if (roi < 0) return "danger"
          return "neutral"
        },
        description: "Pourcentage de gain sur votre investissement",
        secondaryText: (data?: WidgetData) =>
          `${data?.stats?.validatedEval || 0} validées • ${data?.stats?.failedEval || 0} échouées`,
        explanation:
          "Mesure la rentabilité réelle basée sur les retraits nets effectués (après taxes). Compare les retraits nets à votre investissement initial.",
      },
    },
    {
      id: "eval-success-rate",
      type: WidgetType.STAT_CARD,
      enabled: true,
      order: 5,
      title: "Taux de réussite évaluations",
      config: {
        title: "Taux de réussite évaluations",
        value: (data?: WidgetData) => `${(data?.stats?.evalSuccessRate || 0).toFixed(1)}%`,
        icon: Award,
        variant: (data?: WidgetData) => {
          const rate = data?.stats?.evalSuccessRate || 0
          return rate >= 50 ? "success" : "danger"
        },
        description: "Pourcentage de comptes d'évaluation réussis",
        secondaryText: (data?: WidgetData) =>
          `${data?.stats?.validatedEval || 0} validées sur ${(data?.stats?.validatedEval || 0) + (data?.stats?.failedEval || 0)} terminées`,
        explanation:
          "Pourcentage d'évaluations validées parmi celles terminées (validées ou échouées). Les comptes encore actifs ne sont pas comptabilisés.",
      },
    },
    {
      id: "avg-validation-days",
      type: WidgetType.STAT_CARD,
      enabled: true,
      order: 6,
      title: "Durée moyenne validation",
      config: {
        title: "Durée moyenne validation",
        value: (data?: WidgetData) =>
          data?.stats?.avgValidationDays ? `${data.stats.avgValidationDays} jours` : "—",
        icon: Clock,
        variant: "neutral",
        description: "Temps moyen pour réussir une évaluation",
        secondaryText: (data?: WidgetData) =>
          data?.stats?.avgValidationDays
            ? `Basé sur ${data.stats.validatedEval || 0} validation${(data.stats.validatedEval || 0) > 1 ? "s" : ""}`
            : "Aucune validation",
        explanation:
          "Temps moyen (en jours) entre la création d'un compte d'évaluation et sa validation. Aide à estimer le temps nécessaire pour valider une évaluation.",
      },
    },
    {
      id: "monthly-pnl",
      type: WidgetType.STAT_CARD,
      enabled: true,
      order: 7,
      title: "PnL Mensuel",
      config: {
        title: "PnL Mensuel",
        value: (data?: WidgetData) => {
          const amount = data?.stats?.monthlyPnl || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: TrendingUp,
        variant: (data?: WidgetData) => {
          const pnl = data?.stats?.monthlyPnl || 0
          if (pnl > 0) return "success"
          if (pnl < 0) return "danger"
          return "neutral"
        },
        description: "Gains et pertes sur 30 jours",
        secondaryText: (data?: WidgetData) => {
          const amount = (data?.stats?.monthlyPnl || 0) * 0.92
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
          }).format(amount)
        },
        explanation:
          "Somme des profits et pertes sur les 30 derniers jours pour les comptes actifs financés uniquement. Les entrées buffer sont exclues.",
      },
    },
    {
      id: "total-pnl",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 8,
      title: "Gains Totaux",
      config: {
        title: "Gains Totaux",
        value: (data?: WidgetData) => {
          const amount = data?.stats?.totalPnl || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: TrendingUp,
        variant: (data?: WidgetData) => {
          const pnl = data?.stats?.totalPnl || 0
          if (pnl > 0) return "success"
          if (pnl < 0) return "danger"
          return "neutral"
        },
        description: "Total de tous les gains et pertes",
      },
    },
    {
      id: "total-withdrawals",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 9,
      title: "Retraits Bruts",
      config: {
        title: "Retraits Bruts",
        value: (data?: WidgetData) => {
          const amount = (data?.stats?.totalWithdrawals as number) || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: DollarSign,
        variant: "success",
        description: "Total retiré avant les taxes",
      },
    },
    {
      id: "total-taxes",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 10,
      title: "Taxes Payées",
      config: {
        title: "Taxes Payées",
        value: (data?: WidgetData) => {
          const amount = (data?.stats?.totalTaxes as number) || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: Coins,
        variant: "neutral",
        description: "Total des taxes payées sur les retraits",
      },
    },
    {
      id: "withdrawal-count",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 11,
      title: "Nombre de Retraits",
      config: {
        title: "Nombre de Retraits",
        value: (data?: WidgetData) => data?.stats?.totalWithdrawalCount || 0,
        icon: ArrowUpCircle,
        variant: "neutral",
        description: "Nombre total de retraits effectués",
      },
    },
    {
      id: "avg-pnl-per-account",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 12,
      title: "Gain Moyen par Compte",
      config: {
        title: "Gain Moyen par Compte",
        value: (data?: WidgetData) => {
          const amount = data?.stats?.avgPnlPerAccount || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: BarChart3,
        variant: (data?: WidgetData) => {
          const avg = data?.stats?.avgPnlPerAccount || 0
          if (avg > 0) return "success"
          if (avg < 0) return "danger"
          return "neutral"
        },
        description: "Gain moyen pour chaque compte",
      },
    },
    {
      id: "best-day",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 13,
      title: "Meilleur Jour",
      config: {
        title: "Meilleur Jour",
        value: (data?: WidgetData) => {
          const amount = data?.stats?.bestDay || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: ArrowUpCircle,
        variant: "success",
        description: "Votre meilleur jour de trading",
      },
    },
    {
      id: "worst-day",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 14,
      title: "Pire Jour",
      config: {
        title: "Pire Jour",
        value: (data?: WidgetData) => {
          const amount = data?.stats?.worstDay || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: ArrowDownCircle,
        variant: "danger",
        description: "Votre pire jour de trading",
      },
    },
    {
      id: "trading-days",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 15,
      title: "Jours de Trading",
      config: {
        title: "Jours de Trading",
        value: (data?: WidgetData) => `${data?.stats?.tradingDays || 0} jours`,
        icon: Calendar,
        variant: "neutral",
        description: "Nombre de jours où vous avez tradé",
      },
    },
    {
      id: "active-accounts-rate",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 16,
      title: "Taux de Comptes Actifs",
      config: {
        title: "Taux de Comptes Actifs",
        value: (data?: WidgetData) => `${(data?.stats?.activeAccountsRate || 0).toFixed(1)}%`,
        icon: Activity,
        variant: (data?: WidgetData) => {
          const rate = data?.stats?.activeAccountsRate || 0
          return rate >= 50 ? "success" : "neutral"
        },
        description: "Pourcentage de comptes actifs",
      },
    },
    {
      id: "weekly-pnl",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 17,
      title: "Gains de la Semaine",
      config: {
        title: "Gains de la Semaine",
        value: (data?: WidgetData) => {
          const amount = data?.stats?.weeklyPnl || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: Zap,
        variant: (data?: WidgetData) => {
          const pnl = data?.stats?.weeklyPnl || 0
          if (pnl > 0) return "success"
          if (pnl < 0) return "danger"
          return "neutral"
        },
        description: "Gains et pertes sur 7 jours",
      },
    },
    {
      id: "avg-pnl-per-day",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 18,
      title: "Gain Moyen par Jour",
      config: {
        title: "Gain Moyen par Jour",
        value: (data?: WidgetData) => {
          const amount = data?.stats?.avgPnlPerTradingDay || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: BarChart3,
        variant: (data?: WidgetData) => {
          const avg = data?.stats?.avgPnlPerTradingDay || 0
          if (avg > 0) return "success"
          if (avg < 0) return "danger"
          return "neutral"
        },
        description: "Gain moyen pour chaque jour de trading",
      },
    },
    {
      id: "active-funded-accounts",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 19,
      title: "Comptes Financés Actifs",
      config: {
        title: "Comptes Financés Actifs",
        value: (data?: WidgetData) => data?.stats?.activeFundedAccounts || 0,
        icon: ShieldCheck,
        variant: "neutral",
        description: "Nombre de comptes financés actifs",
      },
    },
    {
      id: "total-capital",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 20,
      title: "Capital Total",
      config: {
        title: "Capital Total",
        value: (data?: WidgetData) => {
          const amount = data?.stats?.totalCapitalUnderManagement || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(amount)
        },
        icon: Layers,
        variant: "neutral",
        description: "Total du capital sous gestion",
      },
    },
    {
      id: "global-success-rate",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 21,
      title: "Taux de Réussite Global",
      config: {
        title: "Taux de Réussite Global",
        value: (data?: WidgetData) => `${(data?.stats?.globalSuccessRate || 0).toFixed(1)}%`,
        icon: PieChart,
        variant: (data?: WidgetData) => {
          const rate = data?.stats?.globalSuccessRate || 0
          return rate >= 50 ? "success" : "danger"
        },
        description: "Pourcentage de comptes réussis",
      },
    },
    {
      id: "avg-withdrawal",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 22,
      title: "Retrait Moyen",
      config: {
        title: "Retrait Moyen",
        value: (data?: WidgetData) => {
          const amount = (data?.stats?.avgWithdrawal as number) || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: DollarSign,
        variant: "neutral",
        description: "Montant moyen par retrait",
      },
    },
    {
      id: "funded-pnl",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 23,
      title: "Gains Comptes Financés",
      config: {
        title: "Gains Comptes Financés",
        value: (data?: WidgetData) => {
          const amount = data?.stats?.fundedAccountsPnl || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: TrendingUp,
        variant: (data?: WidgetData) => {
          const pnl = data?.stats?.fundedAccountsPnl || 0
          if (pnl > 0) return "success"
          if (pnl < 0) return "danger"
          return "neutral"
        },
        description: "Total des gains des comptes financés",
      },
    },
    {
      id: "eval-pnl",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 24,
      title: "Gains Comptes Évaluation",
      config: {
        title: "Gains Comptes Évaluation",
        value: (data?: WidgetData) => {
          const amount = data?.stats?.evalAccountsPnl || 0
          return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        },
        icon: Target,
        variant: (data?: WidgetData) => {
          const pnl = data?.stats?.evalAccountsPnl || 0
          if (pnl > 0) return "success"
          if (pnl < 0) return "danger"
          return "neutral"
        },
        description: "Total des gains des comptes d'évaluation",
      },
    },
    {
      id: "days-since-first",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 25,
      title: "Jours depuis le Premier",
      config: {
        title: "Jours depuis le Premier",
        value: (data?: WidgetData) => `${data?.stats?.daysSinceFirstAccount || 0} jours`,
        icon: Calendar,
        variant: "neutral",
        description: "Nombre de jours depuis votre premier compte",
      },
    },
    {
      id: "withdrawal-rate",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 26,
      title: "Taux de Retrait",
      config: {
        title: "Taux de Retrait",
        value: (data?: WidgetData) => `${(data?.stats?.withdrawalRate || 0).toFixed(1)}%`,
        icon: Percent,
        variant: (data?: WidgetData) => {
          const rate = data?.stats?.withdrawalRate || 0
          return rate > 0 ? "success" : "neutral"
        },
        description: "Pourcentage retiré du capital total",
      },
    },
    {
      id: "archived-accounts",
      type: WidgetType.STAT_CARD,
      enabled: false,
      order: 27,
      title: "Comptes Archivés",
      config: {
        title: "Comptes Archivés",
        value: (data?: WidgetData) => data?.stats?.archivedAccounts || 0,
        icon: FileText,
        variant: "neutral",
        description: "Nombre de comptes archivés",
      },
    },
    {
      id: "expenses-calendar",
      type: WidgetType.CALENDAR,
      enabled: true,
      order: 28,
      title: "Calendrier des dépenses",
      config: {
        calendarType: "expenses",
      },
    },
    {
      id: "withdrawals-calendar",
      type: WidgetType.CALENDAR,
      enabled: true,
      order: 29,
      title: "Calendrier des retraits",
      config: {
        calendarType: "withdrawals",
      },
    },
  ]
}

/**
 * Hook pour gérer la configuration du tableau de bord
 */
export function useDashboardConfig() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    if (typeof window === "undefined") return getDefaultWidgets()

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Valider et fusionner avec les widgets par défaut
        return mergeWithDefaults(parsed)
      }
    } catch (_error) {
      // En cas d'erreur, utiliser les valeurs par défaut
    }

    return getDefaultWidgets()
  })

  const saveConfig = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets))
      } catch (_error) {
        console.error("Erreur lors de la sauvegarde de la configuration")
      }
    }
  }, [])

  return { widgets, setWidgets: saveConfig }
}

/**
 * Fusionner la configuration sauvegardée avec les widgets par défaut
 * pour gérer l'ajout de nouveaux widgets
 */
function mergeWithDefaults(saved: DashboardWidget[]): DashboardWidget[] {
  const defaults = getDefaultWidgets()
  const savedMap = new Map(saved.map((w) => [w.id, w]))

  // Mettre à jour les widgets sauvegardés avec les nouvelles configurations
  const merged = defaults.map((defaultWidget) => {
    const savedWidget = savedMap.get(defaultWidget.id)
    if (savedWidget) {
      return {
        ...defaultWidget,
        enabled: savedWidget.enabled,
        order: savedWidget.order,
      }
    }
    return defaultWidget
  })

  return merged
}
