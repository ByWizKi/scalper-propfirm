"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Calendar,
  Clock,
  Activity,
  Award,
  DollarSign,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar as CalendarIcon,
  CalendarDays,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { TradingStats } from "@/services/trading-stats.service"
import { StatCard } from "@/components/stat-card"
import { DailyPnlChart } from "@/components/daily-pnl-chart"

interface TradingStatsProps {
  accountId: string
}

interface DailyBalanceData {
  time: string
  balance: number
  timestamp: number
}

// Colors are defined inline where needed

export function TradingStatsComponent({ accountId }: TradingStatsProps) {
  const [stats, setStats] = useState<TradingStats | null>(null)
  const [hasTrades, setHasTrades] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dailyBalance, setDailyBalance] = useState<DailyBalanceData[]>([])

  // États pour la plage de dates
  const [dateRange, setDateRange] = useState<{
    start: string
    end: string
  }>(() => {
    // Par défaut, aujourd'hui
    const today = new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    return {
      start: startOfDay.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0],
    }
  })

  // Clé pour forcer le re-render des stats
  const [statsKey, setStatsKey] = useState(0)

  const calculateDailyBalance = useCallback(
    (trades: Array<{ enteredAt: string; pnl: number; fees: number; commissions?: number }>) => {
      // Filtrer les trades selon la plage de dates sélectionnée
      const startDate = dateRange.start ? new Date(dateRange.start) : null
      const endDate = dateRange.end ? new Date(dateRange.end) : null

      if (startDate) {
        startDate.setHours(0, 0, 0, 0)
      }
      if (endDate) {
        // Si début = fin, utiliser uniquement ce jour
        if (dateRange.start === dateRange.end) {
          endDate.setHours(23, 59, 59, 999)
        } else {
          // Pour une plage, inclure toute la journée de fin
          endDate.setHours(23, 59, 59, 999)
        }
      }

      const filteredTrades = trades.filter((trade) => {
        const tradeDate = new Date(trade.enteredAt)
        if (startDate && tradeDate < startDate) return false
        if (endDate) {
          // Si début = fin, utiliser <= pour inclure toute la journée
          if (dateRange.start === dateRange.end) {
            if (tradeDate > endDate) return false
          } else {
            // Pour une plage, exclure le jour suivant
            const tradeDayOnly = new Date(tradeDate)
            tradeDayOnly.setHours(0, 0, 0, 0)
            const endDayOnly = new Date(endDate)
            endDayOnly.setHours(0, 0, 0, 0)
            if (tradeDayOnly > endDayOnly) return false
          }
        }
        return true
      })

      if (filteredTrades.length === 0) {
        setDailyBalance([])
        return
      }

      // Trier par heure d'entrée
      filteredTrades.sort(
        (a, b) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime()
      )

      // Calculer la balance cumulative au fil du temps
      let cumulativeBalance = 0
      const balanceData: DailyBalanceData[] = []

      filteredTrades.forEach((trade) => {
        const netPnl = trade.pnl - trade.fees - (trade.commissions || 0)
        cumulativeBalance += netPnl

        const tradeTime = new Date(trade.enteredAt)
        // Format HH:MM en français (24h)
        const timeString = tradeTime.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })

        // Calculer le timestamp pour D3.js
        const timestamp = tradeTime.getTime()

        balanceData.push({
          time: timeString,
          balance: Math.round(cumulativeBalance * 100) / 100,
          timestamp,
        })
      })

      setDailyBalance(balanceData)
    },
    [dateRange.start, dateRange.end]
  )

  useEffect(() => {
    if (!accountId) {
      setIsLoading(false)
      return
    }

    // Réinitialiser l'état lors du changement de date
    setIsLoading(true)
    setStats(null)
    setDailyBalance([])

    const fetchData = async () => {
      try {
        const startDate = dateRange.start ? `${dateRange.start}T00:00:00.000Z` : undefined
        const endDate = dateRange.end ? `${dateRange.end}T23:59:59.999Z` : undefined

        const params = new URLSearchParams()
        if (startDate) params.append("startDate", startDate)
        if (endDate) params.append("endDate", endDate)

        const queryString = params.toString()
        const urlSuffix = queryString ? `?${queryString}` : ""

        // Fetching data with date range

        const [statsRes, tradesRes] = await Promise.all([
          fetch(`/api/accounts/${accountId}/trades/stats${urlSuffix}`),
          fetch(`/api/accounts/${accountId}/trades${urlSuffix}`),
        ])

        if (!statsRes.ok) {
          const errorData = await statsRes.json().catch(() => ({}))
          const errorMessage =
            errorData.message || `Erreur ${statsRes.status}: ${statsRes.statusText}`
          console.error("[TradingStats] Error fetching stats:", errorMessage)
          throw new Error(errorMessage)
        }

        const statsData = await statsRes.json()
        // Stats data received

        if (statsData.stats) {
          setStats(statsData.stats)
          setStatsKey((prev) => prev + 1) // Force le re-render
        } else {
          setStats(null)
        }
        setHasTrades(statsData.hasTrades)

        // Calculer la balance quotidienne si on a des trades
        if (tradesRes.ok) {
          const trades = await tradesRes.json()
          if (trades.length > 0) {
            calculateDailyBalance(trades)
          }
        }
      } catch (error) {
        console.error("Error fetching stats:", error)
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
        setError(errorMessage)
        setHasTrades(false)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [accountId, dateRange.start, dateRange.end, calculateDailyBalance])

  // Obtenir la date formatée pour le titre (format français)
  const currentDate = useMemo(() => {
    if (dateRange.start === dateRange.end) {
      const date = new Date(dateRange.start)
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    }
    const start = new Date(dateRange.start).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    const end = new Date(dateRange.end).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    return `${start} - ${end}`
  }, [dateRange])

  const handleResetDates = () => {
    const today = new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    setDateRange({
      start: startOfDay.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0],
    })
  }

  // Calculer le total P&L (balance finale)
  const totalPnl = useMemo(() => {
    if (dailyBalance.length === 0) return 0
    return dailyBalance[dailyBalance.length - 1].balance
  }, [dailyBalance])

  // Déterminer si le PnL est négatif (pour la couleur de la courbe)
  const isNegative = totalPnl < 0

  // Fonctions de formatage
  const formatPercent = (value: number) => `${value.toFixed(2)}%`
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD" }).format(value)
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    return `${hours}h ${minutes}min`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">
                Erreur lors du chargement
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasTrades || !stats) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-zinc-400" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Aucune statistique disponible</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Les statistiques de trading sont disponibles uniquement pour les comptes avec des
                trades importés.
              </p>
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 text-left max-w-2xl mx-auto space-y-3">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Comment ça fonctionne ?
                </p>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                  <p>
                    <strong>Trades importés :</strong> Lorsque vous importez un fichier CSV depuis
                    Project X ou Tradovate, chaque trade individuel est stocké dans la base de
                    données. Cela permet de calculer des statistiques détaillées comme le
                    pourcentage de trades gagnants, la durée moyenne des trades, etc.
                  </p>
                  <p>
                    <strong>PnL manuels :</strong> Quand vous ajoutez un PnL manuellement (montant
                    journalier), seul le montant total du jour est enregistré. Sans les détails
                    individuels des trades, il n&apos;est pas possible de calculer ces statistiques
                    avancées.
                  </p>
                  <p className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <strong>Solution :</strong> Pour voir les statistiques détaillées, importez vos
                    trades depuis Project X ou Tradovate via la page d&apos;import de trades. Vous
                    pouvez continuer à ajouter des PnL manuels pour les jours où vous n&apos;avez
                    pas d&apos;export disponible.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sélecteur de plage de dates */}
      <Card className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
        <CardHeader className="border-b border-zinc-200/70 dark:border-zinc-800/70 p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Plage de dates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 space-y-2">
              <Label
                htmlFor="startDate"
                className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400"
              >
                Date de début
              </Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="text-xs sm:text-sm"
                max={dateRange.end}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label
                htmlFor="endDate"
                className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400"
              >
                Date de fin
              </Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="text-xs sm:text-sm"
                min={dateRange.start}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetDates}
                className="text-xs sm:text-sm h-9 sm:h-10"
              >
                Aujourd&apos;hui
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graphique de performance journalière */}
      {dailyBalance.length > 0 && (
        <Card className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
          <CardHeader className="border-b border-zinc-200/70 dark:border-zinc-800/70">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Performance : {currentDate}
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Évolution du profit cumulé après chaque trade
                </CardDescription>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Profit cumulé</div>
                <div
                  className={`text-sm sm:text-base font-semibold ${
                    isNegative
                      ? "text-red-600 dark:text-red-500"
                      : "text-green-600 dark:text-green-500"
                  }`}
                >
                  {formatCurrency(totalPnl)}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <DailyPnlChart data={dailyBalance} currentDate={currentDate} totalPnl={totalPnl} />
          </CardContent>
        </Card>
      )}

      {/* Statistiques principales */}
      <div
        key={`stats-main-${statsKey}`}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
      >
        <StatCard
          title="Taux de Réussite"
          value={formatPercent(stats.tradeWinPercent)}
          icon={Target}
          variant={stats.tradeWinPercent >= 50 ? "success" : "danger"}
          description={`${Math.round((stats.tradeWinPercent / 100) * stats.totalTrades)} gagnants sur ${stats.totalTrades} trades`}
          size="md"
        />

        <StatCard
          title="Gain Moyen / Perte Moyenne"
          value={stats.avgWinLossRatio.toFixed(2)}
          icon={BarChart3}
          variant={stats.avgWinLossRatio >= 1 ? "success" : "danger"}
          description={`Gain: ${formatCurrency(stats.avgWin)} | Perte: ${formatCurrency(stats.avgLoss)}`}
          size="md"
        />

        <StatCard
          title="Taux de Réussite Journalier"
          value={formatPercent(stats.dayWinPercent)}
          icon={Calendar}
          variant={stats.dayWinPercent >= 50 ? "success" : "danger"}
          description="Pourcentage de jours gagnants"
          size="md"
        />

        <StatCard
          title="Facteur de Profit"
          value={stats.profitFactor.toFixed(2)}
          icon={TrendingUp}
          variant={stats.profitFactor >= 1 ? "success" : "danger"}
          description="Ratio profits / pertes"
          size="md"
        />
      </div>

      {/* Statistiques secondaires */}
      <div
        key={`stats-secondary-${statsKey}`}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6"
      >
        <StatCard
          title="Gain Moyen"
          value={formatCurrency(stats.avgWin)}
          icon={TrendingUp}
          variant="success"
          size="md"
        />

        <StatCard
          title="Perte Moyenne"
          value={formatCurrency(-stats.avgLoss)}
          icon={TrendingDown}
          variant="danger"
          size="md"
        />

        <StatCard
          title="Direction des Trades"
          value={formatPercent(stats.tradeDirectionPercent)}
          icon={BarChart3}
          variant="neutral"
          size="md"
          description={`${Math.round((stats.tradeDirectionPercent / 100) * stats.totalTrades)} longs sur ${stats.totalTrades} trades`}
        />
      </div>

      {/* Meilleur et pire trade */}
      <div
        key={`stats-trades-${statsKey}`}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6"
      >
        {stats.bestTrade && (
          <Card className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
            <CardHeader className="border-b border-zinc-200/70 dark:border-zinc-800/70 p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base font-semibold text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                <span>Meilleur Trade</span>
                <Award className="h-4 w-4 text-green-600 dark:text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                    Profit
                  </span>
                </div>
                <span className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-500">
                  {formatCurrency(stats.bestTrade.pnl)}
                </span>
              </div>
              <div className="space-y-1.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-400">Direction</span>
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50 text-right truncate ml-2">
                    {stats.bestTrade.type} {stats.bestTrade.size} {stats.bestTrade.contractName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <ArrowDownToLine className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-400">Entrée</span>
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    @ {stats.bestTrade.entryPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpFromLine className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-400">Sortie</span>
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    @ {stats.bestTrade.exitPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-400">Date</span>
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50 text-right">
                    {new Date(stats.bestTrade.exitedAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stats.worstTrade && (
          <Card className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
            <CardHeader className="border-b border-zinc-200/70 dark:border-zinc-800/70 p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base font-semibold text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                <span>Pire Trade</span>
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Perte</span>
                </div>
                <span className="text-sm sm:text-base font-semibold text-red-600 dark:text-red-500">
                  {formatCurrency(stats.worstTrade.pnl)}
                </span>
              </div>
              <div className="space-y-1.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-400">Direction</span>
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50 text-right truncate ml-2">
                    {stats.worstTrade.type} {stats.worstTrade.size} {stats.worstTrade.contractName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <ArrowDownToLine className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-400">Entrée</span>
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    @ {stats.worstTrade.entryPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpFromLine className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-400">Sortie</span>
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    @ {stats.worstTrade.exitPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-400">Date</span>
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50 text-right">
                    {new Date(stats.worstTrade.exitedAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Statistiques de volume */}
      <div
        key={`stats-volume-${statsKey}`}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6"
      >
        <StatCard
          title="Nombre Total de Trades"
          value={stats.totalTrades}
          icon={Activity}
          variant="neutral"
          size="md"
        />

        <StatCard
          title="Durée Moyenne des Trades"
          value={formatDuration(stats.averageTradeDuration)}
          icon={Clock}
          variant="neutral"
          size="md"
        />
      </div>
    </div>
  )
}
