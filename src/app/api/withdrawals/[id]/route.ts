import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PUT - Mettre à jour un retrait
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

    // Vérifier que le retrait appartient à l'utilisateur
    const existingWithdrawal = await prisma.withdrawal.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingWithdrawal) {
      return NextResponse.json(
        { message: "Retrait non trouvé" },
        { status: 404 }
      )
    }

    const withdrawal = await prisma.withdrawal.update({
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

    return NextResponse.json(withdrawal)
  } catch (_error) {
    console.error("Erreur lors de la mise à jour du retrait:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du retrait" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un retrait
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

    // Vérifier que le retrait appartient à l'utilisateur
    const existingWithdrawal = await prisma.withdrawal.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingWithdrawal) {
      return NextResponse.json(
        { message: "Retrait non trouvé" },
        { status: 404 }
      )
    }

    await prisma.withdrawal.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ message: "Retrait supprimé avec succès" })
  } catch (_error) {
    console.error("Erreur lors de la suppression du retrait:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression du retrait" },
      { status: 500 }
    )
  }
}

