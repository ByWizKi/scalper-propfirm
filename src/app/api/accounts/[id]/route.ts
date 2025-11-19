import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateAccountSchema, idSchema, validateApiRequest } from "@/lib/validation"
import { PropfirmType, AccountType, AccountStatus } from "@prisma/client"

// GET - Récupérer un compte spécifique
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions)) as {
      user?: { id?: string }
    } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    // Validation de l'ID
    const idValidation = validateApiRequest(idSchema, id)
    if (!idValidation.success) {
      return NextResponse.json({ message: idValidation.error }, { status: idValidation.status })
    }

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
      return NextResponse.json({ message: "Compte non trouvé" }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération du compte" },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un compte
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
    const validation = validateApiRequest(updateAccountSchema, body)
    if (!validation.success) {
      return NextResponse.json({ message: validation.error }, { status: validation.status })
    }

    // Vérifier que le compte appartient à l'utilisateur
    const existingAccount = await prisma.propfirmAccount.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingAccount) {
      return NextResponse.json({ message: "Compte non trouvé" }, { status: 404 })
    }

    const updateData: {
      name?: string
      propfirm?: PropfirmType
      size?: number
      accountType?: AccountType
      status?: AccountStatus
      pricePaid?: number
      linkedEvalId?: string | null
      notes?: string | null
    } = {}

    if (validation.data.name !== undefined) updateData.name = validation.data.name
    if (validation.data.propfirm !== undefined)
      updateData.propfirm = validation.data.propfirm as PropfirmType
    if (validation.data.size !== undefined) updateData.size = validation.data.size
    if (validation.data.accountType !== undefined)
      updateData.accountType = validation.data.accountType as AccountType
    if (validation.data.status !== undefined)
      updateData.status = validation.data.status as AccountStatus
    if (validation.data.pricePaid !== undefined) updateData.pricePaid = validation.data.pricePaid
    if (validation.data.linkedEvalId !== undefined)
      updateData.linkedEvalId = validation.data.linkedEvalId || null
    if (validation.data.notes !== undefined) updateData.notes = validation.data.notes || null

    const account = await prisma.propfirmAccount.update({
      where: {
        id,
      },
      data: updateData,
    })

    return NextResponse.json(account)
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du compte" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un compte
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

    // Vérifier que le compte appartient à l'utilisateur
    const existingAccount = await prisma.propfirmAccount.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingAccount) {
      return NextResponse.json({ message: "Compte non trouvé" }, { status: 404 })
    }

    await prisma.propfirmAccount.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ message: "Compte supprimé avec succès" })
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json(
      { message: "Erreur lors de la suppression du compte" },
      { status: 500 }
    )
  }
}
