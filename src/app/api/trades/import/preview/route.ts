import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseProjectXCsv, parseTradovateCsv, groupTradesByDay } from "@/lib/parsers/trade-parser"
import { isProjectXCompatible } from "@/lib/constants/project-x-compatible"
import { isTradovateCompatible } from "@/lib/constants/tradovate-compatible"

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { platform, csvContent, accountId } = body

    if (!platform || !csvContent) {
      return NextResponse.json({ message: "Plateforme et contenu CSV requis" }, { status: 400 })
    }

    if (platform !== "PROJECT_X" && platform !== "TRADOVATE") {
      return NextResponse.json({ message: "Plateforme non supportée" }, { status: 400 })
    }

    // Vérifier la compatibilité plateforme / propfirm si un compte est fourni
    if (accountId) {
      const account = await prisma.propfirmAccount.findFirst({
        where: {
          id: accountId,
          userId: session.user.id,
        },
      })

      if (account) {
        // Vérifier la compatibilité plateforme / propfirm
        if (platform === "PROJECT_X" && !isProjectXCompatible(account.propfirm)) {
          return NextResponse.json(
            {
              message: `Les comptes ${account.propfirm} ne sont pas compatibles avec Project X. Utilisez Tradovate.`,
              error: "INCOMPATIBLE_PLATFORM",
            },
            { status: 400 }
          )
        }

        if (platform === "TRADOVATE" && !isTradovateCompatible(account.propfirm)) {
          return NextResponse.json(
            {
              message: `Les comptes ${account.propfirm} ne sont pas compatibles avec Tradovate. Utilisez Project X.`,
              error: "INCOMPATIBLE_PLATFORM",
            },
            { status: 400 }
          )
        }
      }
    }

    console.info(
      `[API Preview] 🚀 Début - Plateforme: ${platform}, AccountId: ${accountId ? "fourni" : "non fourni"}, Taille CSV: ${csvContent.length} caractères`
    )

    // ÉTAPE 1: Parser le fichier CSV
    let allTrades
    try {
      if (platform === "PROJECT_X") {
        allTrades = parseProjectXCsv(csvContent)
      } else {
        allTrades = parseTradovateCsv(csvContent)
      }
      console.info(`[API Preview] ✅ Parsing réussi: ${allTrades.length} trades parsés`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors du parsing du CSV"
      console.error(`[API Preview] ❌ Erreur de parsing:`, errorMessage)
      return NextResponse.json({ message: errorMessage }, { status: 400 })
    }

    if (allTrades.length === 0) {
      console.warn(`[API Preview] ⚠️  Aucun trade trouvé dans le fichier`)
      return NextResponse.json({ message: "Aucun trade trouvé dans le fichier" }, { status: 400 })
    }

    // ÉTAPE 2: Grouper par jour pour calculer les PnL
    const dailySummary = groupTradesByDay(allTrades)
    console.info(`[API Preview] 📅 Groupement par jour: ${dailySummary.length} jour(s) de trading`)

    // Si un accountId est fourni, analyser les doublons
    const existingPnlMap: Map<string, { date: Date; amount: number }> = new Map()
    let existingTradeIdsSet: Set<string> = new Set()

    if (accountId) {
      // Vérifier que le compte appartient à l'utilisateur
      const account = await prisma.propfirmAccount.findFirst({
        where: {
          id: accountId,
          userId: session.user.id,
        },
      })

      if (account) {
        // ÉTAPE 3: Déterminer la plage de dates (min/max) pour optimiser la recherche
        const dates = dailySummary.map((day) => new Date(day.date))
        if (dates.length > 0) {
          const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
          const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
          minDate.setHours(0, 0, 0, 0)
          maxDate.setHours(23, 59, 59, 999)

          console.info(
            `[API Preview] 📆 Plage de dates: ${minDate.toISOString().split("T")[0]} à ${maxDate.toISOString().split("T")[0]}`
          )

          // ÉTAPE 4: Récupérer UNIQUEMENT les données existantes dans cette plage de dates
          // Récupérer les entrées PnL existantes
          const existingPnlEntries = await prisma.pnlEntry.findMany({
            where: {
              accountId,
              userId: session.user.id,
              date: {
                gte: minDate,
                lte: maxDate,
              },
            },
            select: {
              date: true,
              amount: true,
            },
          })

          // Créer une map des PnL par date (clé: YYYY-MM-DD)
          for (const entry of existingPnlEntries) {
            const date = new Date(entry.date)
            date.setHours(0, 0, 0, 0)
            const dateKey = date.toISOString().split("T")[0]
            existingPnlMap.set(dateKey, { date: entry.date, amount: entry.amount })
          }

          // Récupérer tous les tradeIds existants dans cette plage de dates
          const existingTrades = await prisma.trade.findMany({
            where: {
              accountId,
              userId: session.user.id,
              platform: platform as string,
              tradeDay: {
                gte: minDate,
                lte: maxDate,
              },
            },
            select: {
              tradeId: true,
            },
          })

          // Créer un Set des tradeIds existants
          existingTradeIdsSet = new Set(existingTrades.map((t) => t.tradeId))

          console.info(
            `[API Preview] 🔍 Doublons trouvés: ${existingPnlMap.size} jour(s) avec PnL, ${existingTradeIdsSet.size} trade(s) existant(s)`
          )
        }
      }
    }

    // ÉTAPE 5: Filtrer les trades en doublon et calculer le PnL réel
    const newTrades = allTrades.filter((trade) => {
      const tradeId = String(trade.id)
      return !existingTradeIdsSet.has(tradeId)
    })

    const duplicateCount = allTrades.length - newTrades.length
    console.info(
      `[API Preview] 🔄 ${duplicateCount} trade(s) en doublon détecté(s), ${newTrades.length} trade(s) nouveau(x)`
    )

    // Recalculer le PnL avec seulement les nouveaux trades
    const newDailySummary = groupTradesByDay(newTrades)

    // ÉTAPE 6: Formater pour l'aperçu avec information sur les doublons
    const preview = dailySummary.map((day) => {
      const dayDate = new Date(day.date)
      dayDate.setHours(0, 0, 0, 0)
      const dateKey = dayDate.toISOString().split("T")[0]

      // Vérifier si un PnL existe déjà pour ce jour
      const existingPnl = existingPnlMap.get(dateKey)

      // Compter combien de trades de ce jour sont en doublon
      const duplicateTradesCount = day.trades.filter((trade) =>
        existingTradeIdsSet.has(String(trade.id))
      ).length

      // Trouver le PnL réel pour ce jour (seulement les nouveaux trades)
      const newDayData = newDailySummary.find((d) => {
        const dDate = new Date(d.date)
        dDate.setHours(0, 0, 0, 0)
        return dDate.toISOString().split("T")[0] === dateKey
      })

      // Considérer comme doublon si au moins un trade est en doublon
      const isDuplicate = duplicateTradesCount > 0

      // Le PnL à ajouter est celui des nouveaux trades uniquement
      const pnlToAdd = newDayData?.totalPnl || 0

      return {
        date: day.date,
        totalPnl: day.totalPnl, // PnL total du jour (tous les trades)
        pnlToAdd, // PnL à ajouter (seulement les nouveaux trades)
        totalFees: day.totalFees,
        totalCommissions: day.totalCommissions,
        tradeCount: day.tradeCount, // Nombre total de trades dans le CSV
        newTradesCount: newDayData?.tradeCount || 0, // Nombre de nouveaux trades (non doublons)
        duplicateTradesCount, // Nombre de trades en doublon
        isDuplicate,
        existingAmount: existingPnl?.amount, // Montant PnL existant
      }
    })

    console.info(`[API Preview] ✅ Prévisualisation terminée: ${preview.length} jour(s) préparé(s)`)
    return NextResponse.json({ preview })
  } catch (error) {
    console.error(
      "[API Preview] ❌ Erreur:",
      error instanceof Error ? error.message : String(error)
    )
    if (error instanceof Error && error.stack) {
      console.error("[API Preview] Stack:", error.stack)
    }
    return NextResponse.json({ message: "Erreur lors de la prévisualisation" }, { status: 500 })
  }
}
