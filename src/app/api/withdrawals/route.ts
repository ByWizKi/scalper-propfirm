import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createWithdrawalSchema, queryParamsSchema, validateApiRequest } from "@/lib/validation"

// GET - Récupérer tous les retraits de l'utilisateur
export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")

    // Validation des paramètres de requête
    if (accountId) {
      const queryValidation = validateApiRequest(queryParamsSchema, { accountId })
      if (!queryValidation.success) {
        return NextResponse.json(
          { message: queryValidation.error },
          { status: queryValidation.status }
        )
      }
    }

    const where = {
      userId: session.user.id,
      ...(accountId && { accountId }),
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where,
      include: {
        account: true,
      },
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json(withdrawals)
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des retraits" },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau retrait
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()

    // Validation avec Zod
    const validation = validateApiRequest(createWithdrawalSchema, body)
    if (!validation.success) {
      return NextResponse.json({ message: validation.error }, { status: validation.status })
    }

    const { accountId, date, amount, notes } = validation.data

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

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: session.user.id,
        accountId,
        date: new Date(date),
        amount,
        notes: notes || null,
      },
      include: {
        account: true,
      },
    })

    return NextResponse.json(withdrawal, { status: 201 })
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json({ message: "Erreur lors de la création du retrait" }, { status: 500 })
  }
}
