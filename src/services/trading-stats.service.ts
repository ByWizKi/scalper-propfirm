/**
 * Service pour calculer les statistiques de trading à partir des trades importés
 */

export interface BestWorstTrade {
  pnl: number
  contractName: string
  type: string
  size: number
  entryPrice: number
  exitPrice: number
  enteredAt: Date | string
  exitedAt: Date | string
}

export interface TradingStats {
  // Statistiques de base
  tradeWinPercent: number // Pourcentage de trades gagnants
  avgWin: number // Gain moyen par trade gagnant
  avgLoss: number // Perte moyenne par trade perdant
  avgWinLossRatio: number // Ratio avgWin / avgLoss
  dayWinPercent: number // Pourcentage de jours gagnants
  profitFactor: number // Ratio profits totaux / pertes totales
  bestDayPercentOfTotal: number // % du profit total du meilleur jour

  // Statistiques par jour de la semaine
  mostActiveDay: string // Jour de la semaine le plus actif
  mostProfitableDay: string // Jour de la semaine le plus profitable
  leastProfitableDay: string // Jour de la semaine le moins profitable

  // Statistiques de volume
  totalTrades: number // Nombre total de trades
  totalLots: number // Nombre total de lots tradés
  averageTradeDuration: number // Durée moyenne des trades en secondes

  // Nouvelles statistiques
  tradeDirectionPercent: number // Pourcentage de trades longs
  bestTrade: BestWorstTrade | null // Meilleur trade
  worstTrade: BestWorstTrade | null // Pire trade
}

export interface Trade {
  id: string
  pnl: number
  fees: number
  size: number
  tradeDay: Date | string
  tradeDuration?: number | null
  enteredAt: Date | string
  exitedAt?: Date | string
  commissions?: number | null
  type?: string | null
  contractName?: string | null
  entryPrice?: number | null
  exitPrice?: number | null
}

const DAYS_OF_WEEK = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

/**
 * Calcule toutes les statistiques de trading à partir d'une liste de trades
 */
export function calculateTradingStats(trades: Trade[]): TradingStats {
  if (trades.length === 0) {
    return {
      tradeWinPercent: 0,
      avgWin: 0,
      avgLoss: 0,
      avgWinLossRatio: 0,
      dayWinPercent: 0,
      profitFactor: 0,
      bestDayPercentOfTotal: 0,
      mostActiveDay: "N/A",
      mostProfitableDay: "N/A",
      leastProfitableDay: "N/A",
      totalTrades: 0,
      totalLots: 0,
      averageTradeDuration: 0,
      tradeDirectionPercent: 0,
      bestTrade: null,
      worstTrade: null,
    }
  }

  // Valider et nettoyer les trades
  const validTrades = trades.filter((trade) => {
    // Vérifier que les champs essentiels sont présents
    return (
      trade.pnl !== null &&
      trade.fees !== null &&
      trade.size !== null &&
      trade.tradeDay !== null &&
      !isNaN(Number(trade.pnl)) &&
      !isNaN(Number(trade.fees)) &&
      !isNaN(Number(trade.size))
    )
  })

  if (validTrades.length === 0) {
    throw new Error("Aucun trade valide trouvé pour le calcul des statistiques")
  }

  // Calculer le PnL net (PnL brut - fees - commissions) pour chaque trade
  const tradesWithNetPnl = validTrades.map((trade) => {
    const pnl = Number(trade.pnl) || 0
    const fees = Number(trade.fees) || 0
    const commissions = Number(trade.commissions) || 0
    return {
      ...trade,
      pnl,
      fees,
      commissions,
      netPnl: pnl - fees - commissions,
    }
  })

  // 1. Trade Win %
  const winningTrades = tradesWithNetPnl.filter((t) => t.netPnl > 0)
  const losingTrades = tradesWithNetPnl.filter((t) => t.netPnl < 0)
  const breakEvenTrades = tradesWithNetPnl.filter((t) => t.netPnl === 0)
  const totalValidTrades = tradesWithNetPnl.length
  const tradeWinPercent = totalValidTrades > 0 ? (winningTrades.length / totalValidTrades) * 100 : 0

  // 2. Avg Win / Avg Loss
  const totalWinAmount = winningTrades.reduce((sum, t) => sum + t.netPnl, 0)
  const totalLossAmount = losingTrades.reduce((sum, t) => sum + t.netPnl, 0) // Déjà négatif

  const avgWin = winningTrades.length > 0 ? totalWinAmount / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? Math.abs(totalLossAmount) / losingTrades.length : 0
  const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0

  // Log pour déboguer
  console.info("[TradingStats] Calculs:", {
    totalValidTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakEvenTrades: breakEvenTrades.length,
    totalWinAmount,
    totalLossAmount,
    avgWin,
    avgLoss,
    avgWinLossRatio,
  })

  // 3. Day Win % - Grouper par jour
  const dailyPnl = new Map<string, number>()
  tradesWithNetPnl.forEach((trade) => {
    // Convertir tradeDay en Date si c'est une string
    const tradeDayDate = trade.tradeDay instanceof Date ? trade.tradeDay : new Date(trade.tradeDay)
    const dateKey = tradeDayDate.toISOString().split("T")[0]
    dailyPnl.set(dateKey, (dailyPnl.get(dateKey) || 0) + trade.netPnl)
  })

  const winningDays = Array.from(dailyPnl.values()).filter((pnl) => pnl > 0).length
  const dayWinPercent = dailyPnl.size > 0 ? (winningDays / dailyPnl.size) * 100 : 0

  // 4. Profit Factor
  const totalProfits = winningTrades.reduce((sum, t) => sum + t.netPnl, 0)
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.netPnl, 0))
  const profitFactor = totalLosses > 0 ? totalProfits / totalLosses : totalProfits > 0 ? 999 : 0

  // 5. Best Day % of Total Profit
  const totalProfit = tradesWithNetPnl.reduce((sum, t) => sum + Math.max(0, t.netPnl), 0)
  const positiveDays = Array.from(dailyPnl.values()).filter((pnl) => pnl > 0)
  const bestDayPnl = positiveDays.length > 0 ? Math.max(...positiveDays) : 0
  const bestDayPercentOfTotal =
    totalProfit > 0 && bestDayPnl > 0 ? (bestDayPnl / totalProfit) * 100 : 0

  // 6. Most Active Day, Most Profitable Day, Least Profitable Day
  const dayOfWeekStats = new Map<number, { count: number; pnl: number }>()

  tradesWithNetPnl.forEach((trade) => {
    // Convertir tradeDay en Date si c'est une string
    let tradeDayDate: Date
    try {
      tradeDayDate = trade.tradeDay instanceof Date ? trade.tradeDay : new Date(trade.tradeDay)
      if (isNaN(tradeDayDate.getTime())) {
        console.warn(`Date invalide pour le trade ${trade.id}: ${trade.tradeDay}`)
        return // Ignorer ce trade
      }
    } catch (_error) {
      console.warn(`Erreur lors de la conversion de la date pour le trade ${trade.id}`)
      return // Ignorer ce trade
    }

    const dayOfWeek = tradeDayDate.getDay()

    const current = dayOfWeekStats.get(dayOfWeek) || { count: 0, pnl: 0 }
    dayOfWeekStats.set(dayOfWeek, {
      count: current.count + 1,
      pnl: current.pnl + trade.netPnl,
    })
  })

  let mostActiveDay = "N/A"
  let mostProfitableDay = "N/A"
  let leastProfitableDay = "N/A"

  if (dayOfWeekStats.size > 0) {
    let maxCount = 0
    let maxPnl = -Infinity
    let minPnl = Infinity

    dayOfWeekStats.forEach((stats, dayOfWeek) => {
      if (stats.count > maxCount) {
        maxCount = stats.count
        mostActiveDay = DAYS_OF_WEEK[dayOfWeek]
      }
      if (stats.pnl > maxPnl) {
        maxPnl = stats.pnl
        mostProfitableDay = DAYS_OF_WEEK[dayOfWeek]
      }
      if (stats.pnl < minPnl) {
        minPnl = stats.pnl
        leastProfitableDay = DAYS_OF_WEEK[dayOfWeek]
      }
    })
  }

  // 7. Total Number of Trades (utiliser uniquement les trades valides)
  const totalTrades = totalValidTrades

  // 8. Total Number of Lots (utiliser uniquement les trades valides)
  const totalLots = validTrades.reduce((sum, t) => sum + (Number(t.size) || 0), 0)

  // 9. Average Trade Duration
  const tradesWithDuration = validTrades.filter(
    (t) =>
      t.tradeDuration !== null && !isNaN(Number(t.tradeDuration)) && Number(t.tradeDuration) > 0
  )
  const averageTradeDuration =
    tradesWithDuration.length > 0
      ? tradesWithDuration.reduce((sum, t) => sum + (Number(t.tradeDuration) || 0), 0) /
        tradesWithDuration.length
      : 0

  // 10. Trade Direction % (pourcentage de trades longs)
  const longTrades = validTrades.filter((t) => t.type?.toLowerCase() === "long")
  const tradeDirectionPercent =
    totalValidTrades > 0 ? (longTrades.length / totalValidTrades) * 100 : 0

  // 11. Best Trade et Worst Trade
  let bestTrade: BestWorstTrade | null = null
  let worstTrade: BestWorstTrade | null = null

  if (tradesWithNetPnl.length > 0) {
    // Trouver le meilleur trade (netPnl le plus élevé)
    const best = tradesWithNetPnl.reduce((best, current) => {
      return current.netPnl > best.netPnl ? current : best
    }, tradesWithNetPnl[0])

    // Trouver le pire trade (netPnl le plus bas)
    const worst = tradesWithNetPnl.reduce((worst, current) => {
      return current.netPnl < worst.netPnl ? current : worst
    }, tradesWithNetPnl[0])

    if (best) {
      const bestExitedAt = best.exitedAt || best.enteredAt
      bestTrade = {
        pnl: best.netPnl,
        contractName: best.contractName || "N/A",
        type: best.type || "N/A",
        size: best.size,
        entryPrice: best.entryPrice || 0,
        exitPrice: best.exitPrice || 0,
        enteredAt: best.enteredAt,
        exitedAt: bestExitedAt instanceof Date ? bestExitedAt : new Date(bestExitedAt),
      }
    }

    if (worst) {
      const worstExitedAt = worst.exitedAt || worst.enteredAt
      worstTrade = {
        pnl: worst.netPnl,
        contractName: worst.contractName || "N/A",
        type: worst.type || "N/A",
        size: worst.size,
        entryPrice: worst.entryPrice || 0,
        exitPrice: worst.exitPrice || 0,
        enteredAt: worst.enteredAt,
        exitedAt: worstExitedAt instanceof Date ? worstExitedAt : new Date(worstExitedAt),
      }
    }
  }

  return {
    tradeWinPercent: Math.round(tradeWinPercent * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    avgWinLossRatio: Math.round(avgWinLossRatio * 100) / 100,
    dayWinPercent: Math.round(dayWinPercent * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    bestDayPercentOfTotal: Math.round(bestDayPercentOfTotal * 100) / 100,
    mostActiveDay,
    mostProfitableDay,
    leastProfitableDay,
    totalTrades,
    totalLots: Math.round(totalLots * 100) / 100,
    averageTradeDuration: Math.round(averageTradeDuration * 100) / 100,
    tradeDirectionPercent: Math.round(tradeDirectionPercent * 100) / 100,
    bestTrade,
    worstTrade,
  }
}
