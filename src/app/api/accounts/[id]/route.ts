import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Récupérer un compte spécifique
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    const account = await prisma.propfirmAccount.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        pnlEntries: {
          orderBy: { date: "desc" },
        },
        withdrawals: {
          orderBy: { date: "desc" },
        },
        linkedEval: true,
        fundedAccounts: true,
      },
    })

    if (!account) {
      return NextResponse.json(
        { message: "Compte non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json(account)
  } catch (_error) {
    console.error("Erreur lors de la récupération du compte:", error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération du compte" },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un compte
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
    const { name, propfirm, size, accountType, status, pricePaid, linkedEvalId, notes } = body

    // Vérifier que le compte appartient à l'utilisateur
    const existingAccount = await prisma.propfirmAccount.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingAccount) {
      return NextResponse.json(
        { message: "Compte non trouvé" },
        { status: 404 }
      )
    }

    const account = await prisma.propfirmAccount.update({
      where: {
        id,
      },
      data: {
        name,
        propfirm,
        size: size ? parseInt(size) : undefined,
        accountType,
        status,
        pricePaid: pricePaid !== undefined ? parseFloat(pricePaid) : undefined,
        linkedEvalId: linkedEvalId || null,
        notes,
      },
    })

    return NextResponse.json(account)
  } catch (_error) {
    console.error("Erreur lors de la mise à jour du compte:", error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du compte" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un compte
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

    // Vérifier que le compte appartient à l'utilisateur
    const existingAccount = await prisma.propfirmAccount.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingAccount) {
      return NextResponse.json(
        { message: "Compte non trouvé" },
        { status: 404 }
      )
    }

    await prisma.propfirmAccount.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ message: "Compte supprimé avec succès" })
  } catch (_error) {
    console.error("Erreur lors de la suppression du compte:", error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression du compte" },
      { status: 500 }
    )
  }
}

