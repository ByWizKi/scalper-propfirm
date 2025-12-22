import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET - Récupérer les données pour les graphiques de trading
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { id: accountId } = await params

    // Vérifier que le compte appartient à l'utilisateur
    const account = await prisma.propfirmAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    })

    if (!account) {
      return NextResponse.json({ message: "Compte non trouvé" }, { status: 404 })
    }

    // Récupérer tous les trades du compte
    const trades = await prisma.trade.findMany({
      where: {
        accountId,
        userId: session.user.id,
      },
      orderBy: {
        tradeDay: "asc",
      },
    })

    if (trades.length === 0) {
      return NextResponse.json({
        dailyPnl: [],
        cumulativePnl: [],
        durationAnalysis: [],
        winRateByDuration: [],
      })
    }

    // Calculer le PnL net par jour
    const dailyPnlMap = new Map<string, number>()
    trades.forEach((trade) => {
      const tradeDayDate = trade.tradeDay instanceof Date ? trade.tradeDay : new Date(trade.tradeDay)
      const dateKey = tradeDayDate.toISOString().split("T")[0]
      const netPnl = trade.pnl - trade.fees - (trade.commissions || 0)
      dailyPnlMap.set(dateKey, (dailyPnlMap.get(dateKey) || 0) + netPnl)
    })

    // Convertir en tableau trié par date
    const dailyPnl = Array.from(dailyPnlMap.entries())
      .map(([date, pnl]) => ({
        date,
        pnl: Math.round(pnl * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculer le PnL cumulatif
    let cumulative = 0
    const cumulativePnl = dailyPnl.map((day) => {
      cumulative += day.pnl
      return {
        date: day.date,
        cumulative: Math.round(cumulative * 100) / 100,
      }
    })

    // Analyser par durée de trade
    const durationRanges = [
      { label: "Under 15 sec", min: 0, max: 15 },
      { label: "15-45 sec", min: 15, max: 45 },
      { label: "45 sec - 1 min", min: 45, max: 60 },
      { label: "1 min - 2 min", min: 60, max: 120 },
      { label: "2 min - 5 min", min: 120, max: 300 },
      { label: "5 min - 10 min", min: 300, max: 600 },
      { label: "10 min - 30 min", min: 600, max: 1800 },
      { label: "30 min - 1 hour", min: 1800, max: 3600 },
      { label: "1 hour - 2 hours", min: 3600, max: 7200 },
      { label: "2 hours - 4 hours", min: 7200, max: 14400 },
      { label: "4 hours and up", min: 14400, max: Infinity },
    ]

    const durationAnalysis = durationRanges.map((range) => {
      const tradesInRange = trades.filter((trade) => {
        if (!trade.tradeDuration) return false
        return trade.tradeDuration >= range.min && trade.tradeDuration < range.max
      })
      return {
        duration: range.label,
        count: tradesInRange.length,
      }
    })

    // Win Rate par durée
    const winRateByDuration = durationRanges.map((range) => {
      const tradesInRange = trades.filter((trade) => {
        if (!trade.tradeDuration) return false
        return trade.tradeDuration >= range.min && trade.tradeDuration < range.max
      })

      if (tradesInRange.length === 0) {
        return {
          duration: range.label,
          winRate: 0,
          count: 0,
        }
      }

      const winningTrades = tradesInRange.filter((trade) => {
        const netPnl = trade.pnl - trade.fees - (trade.commissions || 0)
        return netPnl > 0
      })

      const winRate = (winningTrades.length / tradesInRange.length) * 100

      return {
        duration: range.label,
        winRate: Math.round(winRate * 100) / 100,
        count: tradesInRange.length,
      }
    })

    return NextResponse.json({
      dailyPnl,
      cumulativePnl,
      durationAnalysis,
      winRateByDuration,
    })
  } catch (error) {
    console.error("[Charts] API Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
    return NextResponse.json(
      { message: `Erreur lors de la récupération des données: ${errorMessage}` },
      { status: 500 }
    )
  }
}

