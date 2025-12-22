import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET - Récupérer tous les trades d'un compte
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

    // Récupérer les paramètres de date depuis l'URL
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    // Construire la condition where
    const whereCondition: any = {
      accountId,
      userId: session.user.id,
    }

    // Ajouter le filtre de date si fourni
    if (startDateParam && endDateParam) {
      // Extraire seulement la partie date (sans les heures)
      const startDateOnly = startDateParam.split("T")[0]
      const endDateOnly = endDateParam.split("T")[0]

      // Créer les dates en UTC pour éviter les problèmes de fuseau horaire
      const startDate = new Date(startDateOnly + "T00:00:00.000Z")
      const endDate = new Date(endDateOnly + "T23:59:59.999Z")

      // Si début = fin (comparer seulement les dates sans les heures), utiliser uniquement ce jour
      if (startDateOnly === endDateOnly) {
        whereCondition.tradeDay = {
          gte: startDate,
          lte: endDate,
        }
      } else {
        // Pour une plage, inclure toute la journée de fin
        const endDateExclusive = new Date(endDate)
        endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1)
        endDateExclusive.setUTCHours(0, 0, 0, 0)

        whereCondition.tradeDay = {
          gte: startDate,
          lt: endDateExclusive,
        }
      }
    }

    // Récupérer les trades du compte (filtrés par date si fourni)
    const trades = await prisma.trade.findMany({
      where: whereCondition,
      orderBy: {
        tradeDay: "desc",
      },
    })

    return NextResponse.json(trades)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des trades" },
      { status: 500 }
    )
  }
}

