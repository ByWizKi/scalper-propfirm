"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Wallet } from "lucide-react"
import { useDashboardStatsCache } from "@/hooks/use-data-cache"
import { calculateTotalNetWithdrawals } from "@/lib/withdrawal-utils"
import { DashboardWidgetsManager } from "@/components/dashboard-widgets-manager"
import { useDashboardConfig } from "@/hooks/use-dashboard-config"
import { useCustomStats } from "@/hooks/use-custom-stats"
import { evaluateCustomStat } from "@/lib/custom-stat-evaluator"
import { WidgetType, WidgetData } from "@/types/dashboard-widget.types"
import * as LucideIcons from "lucide-react"

export default function DashboardPage() {
  // Utilisation du hook de cache avec invalidation automatique
  const { data, isLoading } = useDashboardStatsCache()

  const stats = data?.stats

  // ⚡ MEMOIZATION: Memoize arrays
  const accounts = useMemo(() => data?.accounts || [], [data?.accounts])
  const withdrawals = useMemo(() => data?.withdrawals || [], [data?.withdrawals])

  // ⚡ MEMOIZATION: Calculer le total net des retraits (après taxes)
  const totalNetWithdrawals = useMemo(() => {
    return calculateTotalNetWithdrawals(withdrawals)
  }, [withdrawals])

  // Configuration des widgets avec drag and drop
  const { widgets, setWidgets } = useDashboardConfig()

  // Charger les statistiques personnalisées
  const { customStats } = useCustomStats()

  // Convertir les statistiques personnalisées en widgets
  const customStatWidgets = useMemo(() => {
    if (!customStats || customStats.length === 0) return []

    return customStats
      .filter((cs) => cs.enabled)
      .map((cs) => {
        // Récupérer l'icône Lucide
        const IconComponent =
          (cs.icon &&
            (LucideIcons[cs.icon as keyof typeof LucideIcons] as LucideIcons.LucideIcon)) ||
          LucideIcons.TrendingUp

        return {
          id: `custom-stat-${cs.id}`,
          type: WidgetType.STAT_CARD as const,
          enabled: cs.enabled,
          order: cs.order, // Utiliser l'ordre réel de la base de données
          title: cs.title,
          config: {
            title: cs.title,
            value: (data?: WidgetData) => {
              const result = evaluateCustomStat(cs.formula, data?.stats || {})
              // Formater selon le type de valeur
              if (
                cs.formula.includes("Rate") ||
                cs.formula.includes("Rate") ||
                cs.formula.includes("%")
              ) {
                return `${result.toFixed(1)}%`
              }
              return new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(result)
            },
            icon: IconComponent,
            variant: (cs.variant === "success" ||
            cs.variant === "danger" ||
            cs.variant === "warning" ||
            cs.variant === "default" ||
            cs.variant === "neutral"
              ? cs.variant
              : "neutral") as "success" | "danger" | "neutral" | "warning" | "default",
            description: cs.description || "",
            size: "md" as const,
          },
        }
      })
  }, [customStats])

  // Fusionner les widgets par défaut avec les statistiques personnalisées
  const allWidgets = useMemo(() => {
    return [...widgets, ...customStatWidgets].sort((a, b) => a.order - b.order)
  }, [widgets, customStatWidgets])

  // Préparer les données pour les widgets
  const widgetData = useMemo(
    () => ({
      stats,
      accounts,
      withdrawals,
      totalNetWithdrawals,
    }),
    [stats, accounts, withdrawals, totalNetWithdrawals]
  )

  // Afficher le loading uniquement au premier chargement, pas lors des mises à jour
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Chargement des statistiques...
          </p>
        </div>
      </div>
    )
  }

  // Fonction pour mettre à jour l'ordre des statistiques personnalisées
  const updateCustomStatsOrder = async (newWidgets: typeof allWidgets) => {
    // Extraire les widgets personnalisés avec leur nouvel ordre basé sur leur position dans la liste complète
    const customStatOrders = newWidgets
      .map((w, index) => {
        if (w.id.startsWith("custom-stat-")) {
          const customStatId = w.id.replace("custom-stat-", "")
          return {
            id: customStatId,
            order: index, // Ordre basé sur la position dans la liste complète
          }
        }
        return null
      })
      .filter((item): item is { id: string; order: number } => item !== null)

    if (customStatOrders.length > 0) {
      try {
        await fetch("/api/custom-stats/reorder", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orders: customStatOrders }),
          credentials: "include",
        })
        // Déclencher un événement pour recharger les statistiques personnalisées
        window.dispatchEvent(new Event("customStatsUpdated"))
      } catch (error) {
        console.error("Erreur lors de la mise à jour de l'ordre:", error)
      }
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <DashboardWidgetsManager
        widgets={allWidgets}
        onWidgetsChange={(newWidgets) => {
          // Filtrer les widgets personnalisés avant de sauvegarder
          const defaultWidgets = newWidgets.filter((w) => !w.id.startsWith("custom-stat-"))
          setWidgets(defaultWidgets)

          // Mettre à jour l'ordre des statistiques personnalisées
          updateCustomStatsOrder(newWidgets)
        }}
        data={widgetData}
      />

      {/* Section Bilan Financier (toujours affichée) */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 md:grid-cols-1 mb-4 sm:mb-6 md:mb-8 mt-4 sm:mt-6 md:mt-8">
        <Card className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Bilan Financier
              </h2>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                  Total Retraits Nets
                </span>
                <div className="text-right min-w-0">
                  <div className="font-medium text-green-600 text-sm sm:text-base truncate">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "USD",
                    }).format(totalNetWithdrawals)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-green-600 truncate">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    }).format(totalNetWithdrawals * 0.92)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                  Total Investi
                </span>
                <div className="text-right min-w-0">
                  <div className="font-medium text-red-600 text-sm sm:text-base truncate">
                    -
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "USD",
                    }).format(stats?.totalInvested || 0)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-red-600 truncate">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    }).format((stats?.totalInvested || 0) * 0.92)}
                  </div>
                </div>
              </div>
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 sm:pt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base sm:text-lg font-medium">Différence</span>
                  <div className="text-right min-w-0">
                    <div
                      className={`text-xl sm:text-2xl font-bold truncate ${
                        totalNetWithdrawals - (stats?.totalInvested || 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "USD",
                      }).format(totalNetWithdrawals - (stats?.totalInvested || 0))}
                    </div>
                    <div
                      className={`text-[10px] sm:text-xs truncate ${
                        totalNetWithdrawals - (stats?.totalInvested || 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      }).format((totalNetWithdrawals - (stats?.totalInvested || 0)) * 0.92)}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-zinc-500 mt-2 text-right">
                  {totalNetWithdrawals - (stats?.totalInvested || 0) >= 0
                    ? "Vous êtes en profit"
                    : "Vous êtes en perte"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats?.totalAccounts === 0 && (
        <Card className="mt-8 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun compte pour le moment</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Commencez par ajouter votre premier compte propfirm
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
