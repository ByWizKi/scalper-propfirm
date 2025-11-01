import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PUT - Mettre à jour une entrée PnL
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { date, amount, notes } = body

    // Vérifier que l'entrée appartient à l'utilisateur
    const existingEntry = await prisma.pnlEntry.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingEntry) {
      return NextResponse.json(
        { message: "Entrée PnL non trouvée" },
        { status: 404 }
      )
    }

    const pnlEntry = await prisma.pnlEntry.update({
      where: {
        id,
      },
      data: {
        date: date ? new Date(date) : undefined,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        notes,
      },
      include: {
        account: true,
      },
    })

    return NextResponse.json(pnlEntry)
  } catch (_error) {
    console.error("Erreur lors de la mise à jour du PnL:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du PnL" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une entrée PnL
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que l'entrée appartient à l'utilisateur
    const existingEntry = await prisma.pnlEntry.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingEntry) {
      return NextResponse.json(
        { message: "Entrée PnL non trouvée" },
        { status: 404 }
      )
    }

    await prisma.pnlEntry.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ message: "Entrée PnL supprimée avec succès" })
  } catch (_error) {
    console.error("Erreur lors de la suppression du PnL:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression du PnL" },
      { status: 500 }
    )
  }
}

