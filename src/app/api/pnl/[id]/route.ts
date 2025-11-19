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
    })

    if (!existingEntry) {
      return NextResponse.json({ message: "Entrée PnL non trouvée" }, { status: 404 })
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
