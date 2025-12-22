import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updatePnlBodySchema, idSchema, validateApiRequest } from "@/lib/validation"

// PUT - Mettre à jour une entrée PnL
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    // Validation de l'ID
    const idValidation = validateApiRequest(idSchema, id)
    if (!idValidation.success) {
      return NextResponse.json({ message: idValidation.error }, { status: idValidation.status })
    }

    const body = await request.json()

    // Validation avec Zod
    const validation = validateApiRequest(updatePnlBodySchema, body)
    if (!validation.success) {
      return NextResponse.json({ message: validation.error }, { status: validation.status })
    }

    // Vérifier que l'entrée appartient à l'utilisateur
    const existingEntry = await prisma.pnlEntry.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingEntry) {
      return NextResponse.json({ message: "Entrée PnL non trouvée" }, { status: 404 })
    }

    const updateData: {
      date?: Date
      amount?: number
      notes?: string | null
    } = {}

    if (validation.data.date !== undefined) updateData.date = new Date(validation.data.date)
    if (validation.data.amount !== undefined) updateData.amount = validation.data.amount
    if (validation.data.notes !== undefined) updateData.notes = validation.data.notes || null

    // Vérifier les doublons si la date est modifiée
    if (updateData.date) {
      // Normaliser la date pour la comparaison (début de journée)
      const normalizedDate = new Date(updateData.date)
      normalizedDate.setHours(0, 0, 0, 0)
      const endOfDay = new Date(normalizedDate)
      endOfDay.setHours(23, 59, 59, 999)

      // Vérifier s'il existe déjà un PnL pour ce compte et cette date (en excluant l'entrée actuelle)
      const duplicateEntry = await prisma.pnlEntry.findFirst({
        where: {
          userId: session.user.id,
          accountId: existingEntry.accountId,
          date: {
            gte: normalizedDate,
            lte: endOfDay,
          },
          id: {
            not: id, // Exclure l'entrée actuelle
          },
        },
      })

      if (duplicateEntry) {
        return NextResponse.json(
          {
            message: "Une entrée PnL existe déjà pour ce compte à cette date",
            error: "DUPLICATE_PNL_ENTRY",
          },
          { status: 409 }
        )
      }
    }

    const pnlEntry = await prisma.pnlEntry.update({
      where: {
        id,
      },
      data: updateData,
      include: {
        account: true,
      },
    })

    return NextResponse.json(pnlEntry)
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json({ message: "Erreur lors de la mise à jour du PnL" }, { status: 500 })
  }
}

// DELETE - Supprimer une entrée PnL
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    // Validation de l'ID
    const idValidation = validateApiRequest(idSchema, id)
    if (!idValidation.success) {
      return NextResponse.json({ message: idValidation.error }, { status: idValidation.status })
    }

    // Vérifier que l'entrée appartient à l'utilisateur
    const existingEntry = await prisma.pnlEntry.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        trades: true,
      },
    })

    if (!existingEntry) {
      return NextResponse.json({ message: "Entrée PnL non trouvée" }, { status: 404 })
    }

    // Supprimer les trades associés à cette entrée PnL si elle a été créée par import
    // On détecte cela en vérifiant si des trades sont liés à cette entrée
    if (existingEntry.trades && existingEntry.trades.length > 0) {
      console.info(`[Delete PnL] Suppression de ${existingEntry.trades.length} trades associés`)

      // Vérifier que prisma.trade est disponible
      if (prisma.trade) {
        await prisma.trade.deleteMany({
          where: {
            pnlEntryId: id,
            userId: session.user.id,
          },
        })
        console.info(`[Delete PnL] ✅ ${existingEntry.trades.length} trades supprimés`)
      } else {
        console.warn(`[Delete PnL] ⚠️  prisma.trade n'est pas disponible, les trades ne seront pas supprimés`)
      }
    }

    await prisma.pnlEntry.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ message: "Entrée PnL supprimée avec succès" })
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json({ message: "Erreur lors de la suppression du PnL" }, { status: 500 })
  }
}
