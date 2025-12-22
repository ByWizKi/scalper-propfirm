import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateTradingStats } from "@/services/trading-stats.service"

/**
 * GET - Récupérer les statistiques de trading d'un compte
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

    // Vérifier que prisma.trade est disponible
    if (!prisma.trade) {
      console.error("[Stats] prisma.trade n'est pas disponible. Le client Prisma doit être régénéré.")
      return NextResponse.json(
        {
          message: "Le modèle Trade n'est pas disponible. Veuillez régénérer le client Prisma et redémarrer le serveur.",
          error: "PRISMA_CLIENT_NOT_UPDATED"
        },
        { status: 500 }
      )
    }

    // Récupérer les paramètres de date depuis l'URL
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    console.log("[Stats API] Date params received:", { startDateParam, endDateParam })

    // Récupérer tous les trades du compte dans la plage de dates
    let trades
    try {
      let whereCondition: any = {
        accountId,
        userId: session.user.id,
      }

      let startDateOnly: string | undefined
      let endDateOnly: string | undefined

      if (startDateParam && endDateParam) {
        // Extraire seulement la partie date (sans les heures)
        startDateOnly = startDateParam.split("T")[0]
        endDateOnly = endDateParam.split("T")[0]

        console.log("[Stats API] Date params:", { startDateParam, endDateParam, startDateOnly, endDateOnly })

        // Créer les dates en UTC pour éviter les problèmes de fuseau horaire
        // startDateParam est au format "YYYY-MM-DDTHH:mm:ss.sssZ"
        const startDate = new Date(startDateOnly + "T00:00:00.000Z")
        const endDate = new Date(endDateOnly + "T23:59:59.999Z")

        console.log("[Stats API] Parsed dates:", {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          startDateUTC: startDate.getTime(),
          endDateUTC: endDate.getTime(),
        })

        // Si début = fin (comparer seulement les dates sans les heures), utiliser uniquement ce jour avec lte
        if (startDateOnly === endDateOnly) {
          whereCondition.tradeDay = {
            gte: startDate,
            lte: endDate,
          }
          console.log("[Stats API] Single day filter:", {
            gte: startDate.toISOString(),
            lte: endDate.toISOString(),
          })
        } else {
          // Pour une plage, ajouter 1 jour pour inclure toute la journée de fin
          const endDateExclusive = new Date(endDate)
          endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1)
          endDateExclusive.setUTCHours(0, 0, 0, 0)
          whereCondition.tradeDay = {
            gte: startDate,
            lt: endDateExclusive,
          }
          console.log("[Stats API] Date range filter:", {
            gte: startDate.toISOString(),
            lt: endDateExclusive.toISOString(),
          })
        }
      } else {
        // Par défaut, journée courante
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayEnd = new Date(today)
        todayEnd.setHours(23, 59, 59, 999)
        whereCondition.tradeDay = {
          gte: today,
          lte: todayEnd,
        }
      }

      trades = await prisma.trade.findMany({
        where: whereCondition,
        orderBy: {
          tradeDay: "asc",
        },
      })
      const dateRange = startDateParam && endDateParam && startDateOnly && endDateOnly
        ? startDateOnly === endDateOnly
          ? startDateOnly
          : `${startDateOnly} - ${endDateOnly}`
        : "journée courante"
      console.info(`[Stats] ${trades.length} trades trouvés pour le compte ${accountId} (${dateRange})`)

      // Log des dates des trades trouvés pour déboguer
      if (trades.length > 0) {
        const tradeDates = trades.map(t => ({
          id: t.id,
          tradeDay: t.tradeDay,
          tradeDayISO: t.tradeDay instanceof Date ? t.tradeDay.toISOString() : new Date(t.tradeDay).toISOString(),
        }))
        console.log("[Stats] Sample trade dates (first 5):", tradeDates.slice(0, 5))
      } else {
        console.log("[Stats] Aucun trade trouvé avec la condition:", JSON.stringify(whereCondition, (key, value) => {
          if (value instanceof Date) {
            return value.toISOString()
          }
          return value
        }, 2))
      }
    } catch (dbError) {
      console.error("[Stats] Erreur lors de la récupération des trades:", dbError)
      // Si l'erreur vient du fait que la table n'existe pas, retourner une réponse vide
      if (dbError instanceof Error && dbError.message.includes("does not exist")) {
        return NextResponse.json({
          stats: null,
          hasTrades: false,
          totalTrades: 0,
          error: "La table trades n'existe pas encore. Veuillez appliquer les migrations.",
        })
      }
      throw dbError
    }

    // Convertir les trades Prisma en format attendu par le service
    const formattedTrades = trades.map((trade) => ({
      id: trade.id,
      pnl: trade.pnl,
      fees: trade.fees,
      size: trade.size,
      tradeDay: trade.tradeDay,
      tradeDuration: trade.tradeDuration,
      enteredAt: trade.enteredAt,
      exitedAt: trade.exitedAt,
      commissions: trade.commissions,
      type: trade.type,
      contractName: trade.contractName,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
    }))

    // Calculer les statistiques
    let stats
    try {
      console.log(`[Stats] Calculating stats for ${formattedTrades.length} trades`)
      stats = calculateTradingStats(formattedTrades)
      console.log("[Stats] Stats calculated:", {
        totalTrades: stats.totalTrades,
        avgWin: stats.avgWin,
        avgLoss: stats.avgLoss,
        tradeWinPercent: stats.tradeWinPercent,
      })
    } catch (calcError) {
      console.error("[Stats] Erreur lors du calcul:", calcError)
      throw calcError
    }

    return NextResponse.json({
      stats,
      hasTrades: trades.length > 0,
      totalTrades: trades.length,
    })
  } catch (error) {
    console.error("[Stats] API Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
    const errorStack = error instanceof Error ? error.stack : undefined

    if (errorStack) {
      console.error("[Stats] Stack:", errorStack)
    }

    return NextResponse.json(
      {
        message: `Erreur lors du calcul des statistiques: ${errorMessage}`,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}

