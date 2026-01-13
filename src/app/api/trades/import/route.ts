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
    const { platform, accountId, csvContent } = body

    if (!platform || !accountId || !csvContent) {
      return NextResponse.json(
        { message: "Plateforme, compte et contenu CSV requis" },
        { status: 400 }
      )
    }

    if (platform !== "PROJECT_X" && platform !== "TRADOVATE") {
      return NextResponse.json({ message: "Plateforme non supportée" }, { status: 400 })
    }

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

    console.info(
      `[Import] 🚀 Début import - Plateforme: ${platform}, AccountId: ${accountId}, Propfirm: ${account.propfirm}, Taille CSV: ${csvContent.length} caractères`
    )

    // ÉTAPE 1: Parser le fichier CSV
    let allTrades
    try {
      if (platform === "PROJECT_X") {
        allTrades = parseProjectXCsv(csvContent)
      } else {
        allTrades = parseTradovateCsv(csvContent, account.propfirm)
      }
      console.info(`[Import] ✅ Parsing réussi: ${allTrades.length} trades parsés`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors du parsing du CSV"
      console.error(`[Import] ❌ Erreur de parsing:`, errorMessage)
      return NextResponse.json({ message: errorMessage }, { status: 400 })
    }

    if (allTrades.length === 0) {
      console.warn(`[Import] ⚠️  Aucun trade trouvé dans le fichier`)
      return NextResponse.json({ message: "Aucun trade trouvé dans le fichier" }, { status: 400 })
    }

    // Vérifier que prisma.trade est disponible
    if (!prisma.trade) {
      console.error("[Import] prisma.trade n'est pas disponible")
      return NextResponse.json(
        {
          message:
            "Le modèle Trade n'est pas disponible. Veuillez régénérer le client Prisma et redémarrer le serveur.",
          error: "PRISMA_CLIENT_NOT_UPDATED",
        },
        { status: 500 }
      )
    }

    // ÉTAPE 2: Déterminer la plage de dates (min/max) pour optimiser la recherche de doublons
    const tradeDays = allTrades.map((t) => new Date(t.tradeDay))
    const minDate = new Date(Math.min(...tradeDays.map((d) => d.getTime())))
    const maxDate = new Date(Math.max(...tradeDays.map((d) => d.getTime())))
    minDate.setHours(0, 0, 0, 0)
    maxDate.setHours(23, 59, 59, 999)

    console.info(
      `[Import] 📆 Plage de dates: ${minDate.toISOString().split("T")[0]} à ${maxDate.toISOString().split("T")[0]}`
    )

    // ÉTAPE 3: Récupérer UNIQUEMENT les trades existants dans cette plage de dates (optimisation)
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

    const existingTradeIdsSet = new Set(existingTrades.map((t) => t.tradeId))
    console.info(
      `[Import] 🔍 ${existingTradeIdsSet.size} trade(s) existant(s) trouvé(s) dans la plage de dates`
    )

    // ÉTAPE 4: Filtrer les trades en doublon (les ignorer complètement)
    const newTrades = allTrades.filter((trade) => {
      const tradeId = String(trade.id)
      const isDuplicate = existingTradeIdsSet.has(tradeId)
      return !isDuplicate
    })

    const duplicateCount = allTrades.length - newTrades.length
    console.info(
      `[Import] 🔄 ${duplicateCount} trade(s) en doublon ignoré(s), ${newTrades.length} trade(s) nouveau(x) à traiter`
    )

    if (newTrades.length === 0) {
      console.info(`[Import] ✅ Tous les trades sont déjà en base de données`)
      return NextResponse.json({
        message: "Tous les trades sont déjà en base de données",
        created: 0,
        skipped: 0,
        tradesStored: 0,
        tradesUpdated: 0,
        tradesFailed: 0,
        duplicatesIgnored: duplicateCount,
        summary: `${duplicateCount} trades déjà existants, aucun nouveau trade à importer`,
      })
    }

    // ÉTAPE 5: Grouper les nouveaux trades par jour et calculer le PnL
    const dailySummary = groupTradesByDay(newTrades)
    console.info(`[Import] 📅 ${dailySummary.length} jour(s) de trading à traiter`)

    // ÉTAPE 6: Récupérer les PnL existants dans la plage de dates (pour mise à jour)
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
        id: true,
        date: true,
        amount: true,
      },
    })

    // Créer une map des PnL par date (clé: YYYY-MM-DD)
    const existingPnlMap = new Map<string, { id: string; date: Date; amount: number }>()
    for (const entry of existingPnlEntries) {
      const date = new Date(entry.date)
      date.setHours(0, 0, 0, 0)
      const dateKey = date.toISOString().split("T")[0]
      existingPnlMap.set(dateKey, { id: entry.id, date: entry.date, amount: entry.amount })
    }

    console.info(
      `[Import] 💰 ${existingPnlMap.size} entrée(s) PnL existante(s) dans la plage de dates`
    )

    // ÉTAPE 7: Traiter les trades et les PnL
    let tradesStored = 0
    let tradesFailed = 0
    let pnlCreated = 0
    let pnlUpdated = 0

    // Traiter tous les nouveaux trades
    for (const trade of newTrades) {
      try {
        // Valider les données du trade
        if (!trade.id || !trade.enteredAt || !trade.exitedAt || !trade.tradeDay) {
          console.warn(`[Import] ⚠️  Trade invalide ignoré: ID manquant`)
          tradesFailed++
          continue
        }

        const tradeData = {
          userId: session.user.id,
          accountId,
          pnlEntryId: null as string | null, // Sera mis à jour après création/mise à jour du PnL
          platform: platform as string,
          tradeId: String(trade.id),
          contractName: String(trade.contractName || ""),
          enteredAt: new Date(trade.enteredAt),
          exitedAt: new Date(trade.exitedAt),
          entryPrice: Number(trade.entryPrice) || 0,
          exitPrice: Number(trade.exitPrice) || 0,
          size: Number(trade.size) || 0,
          type: String(trade.type || ""),
          pnl: Number(trade.pnl) || 0,
          fees: Number(trade.fees) || 0,
          commissions: trade.commissions !== null ? Number(trade.commissions) : null,
          tradeDay: new Date(trade.tradeDay),
          tradeDuration: trade.tradeDuration !== null ? Number(trade.tradeDuration) : null,
        }

        await prisma.trade.create({
          data: tradeData,
        })
        tradesStored++
      } catch (tradeError) {
        tradesFailed++
        const errorMsg = tradeError instanceof Error ? tradeError.message : String(tradeError)
        console.error(
          `[Import] ❌ Erreur création trade ${trade.id?.substring(0, 30) || "unknown"}:`,
          errorMsg
        )
      }
    }

    console.info(`[Import] 📦 Trades traités: ${tradesStored} créé(s), ${tradesFailed} échoué(s)`)

    // Traiter les PnL par jour
    for (const day of dailySummary) {
      const dayDate = new Date(day.date)
      dayDate.setHours(0, 0, 0, 0)
      const dateKey = dayDate.toISOString().split("T")[0]

      const existingPnl = existingPnlMap.get(dateKey)

      if (existingPnl) {
        // Mettre à jour le PnL existant (additionner le nouveau PnL)
        const newAmount = existingPnl.amount + day.totalPnl
        await prisma.pnlEntry.update({
          where: { id: existingPnl.id },
          data: {
            amount: newAmount,
            notes:
              existingPnl.amount !== newAmount
                ? `Import: ${day.tradeCount} trade(s) depuis ${platform} (ajouté ${day.totalPnl})`
                : undefined,
          },
        })
        pnlUpdated++
        console.info(
          `[Import] 🔄 PnL mis à jour pour ${dateKey}: ${existingPnl.amount} → ${newAmount} (+${day.totalPnl})`
        )
      } else {
        // Créer un nouveau PnL
        await prisma.pnlEntry.create({
          data: {
            userId: session.user.id,
            accountId,
            date: dayDate,
            amount: day.totalPnl,
            notes: `Import: ${day.tradeCount} trade(s) depuis ${platform}`,
          },
        })
        pnlCreated++
        console.info(
          `[Import] ➕ PnL créé pour ${dateKey}: ${day.totalPnl} (${day.tradeCount} trades)`
        )
      }

      // Lier tous les trades de ce jour au PnL
      const dayEnd = new Date(dayDate)
      dayEnd.setHours(23, 59, 59, 999)

      const pnlEntry = existingPnl
        ? await prisma.pnlEntry.findFirst({
            where: {
              accountId,
              userId: session.user.id,
              date: {
                gte: dayDate,
                lte: dayEnd,
              },
            },
          })
        : await prisma.pnlEntry.findFirst({
            where: {
              accountId,
              userId: session.user.id,
              date: dayDate,
            },
            orderBy: { createdAt: "desc" },
          })

      if (pnlEntry) {
        await prisma.trade.updateMany({
          where: {
            accountId,
            userId: session.user.id,
            platform: platform as string,
            tradeDay: {
              gte: dayDate,
              lte: dayEnd,
            },
            pnlEntryId: null, // Seulement ceux qui n'ont pas encore de PnL
          },
          data: {
            pnlEntryId: pnlEntry.id,
          },
        })
      }
    }

    console.info(
      `[Import] ✅ Import terminé - PnL: ${pnlCreated} créé(s), ${pnlUpdated} mis à jour | Trades: ${tradesStored} créé(s), ${tradesFailed} échoué(s), ${duplicateCount} ignoré(s)`
    )

    // ÉTAPE 8: Retourner le résultat (une seule fois à la fin)
    return NextResponse.json({
      message: "Import réussi",
      created: pnlCreated,
      skipped: pnlUpdated,
      tradesStored,
      tradesUpdated: 0, // On ne met plus à jour les trades existants, on les ignore
      tradesFailed,
      duplicatesIgnored: duplicateCount,
      summary: `${tradesStored} trades créés${tradesFailed > 0 ? `, ${tradesFailed} échoués` : ""}${duplicateCount > 0 ? `, ${duplicateCount} ignorés (doublons)` : ""}`,
    })
  } catch (error) {
    console.error("[Import] ❌ API Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
    const errorStack = error instanceof Error ? error.stack : undefined

    if (error instanceof Error) {
      console.error("[Import] Error name:", error.name)
      console.error("[Import] Error message:", error.message)
      if (errorStack) {
        console.error("[Import] Error stack:", errorStack)
      }
    }

    return NextResponse.json(
      {
        message: `Erreur lors de l'import: ${errorMessage}`,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    )
  }
}
