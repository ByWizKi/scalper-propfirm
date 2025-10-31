import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Récupérer tous les retraits de l'utilisateur
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")

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
  } catch (error) {
    console.error("Erreur lors de la récupération des retraits:", error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des retraits" },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau retrait
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { accountId, date, amount, notes } = body

    // Validation
    if (!accountId || !date || amount === undefined) {
      return NextResponse.json(
        { message: "Tous les champs requis doivent être renseignés" },
        { status: 400 }
      )
    }

    // Vérifier que le compte appartient à l'utilisateur
    const account = await prisma.propfirmAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    })

    if (!account) {
      return NextResponse.json(
        { message: "Compte non trouvé" },
        { status: 404 }
      )
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: session.user.id,
        accountId,
        date: new Date(date),
        amount: parseFloat(amount),
        notes: notes || null,
      },
      include: {
        account: true,
      },
    })

    return NextResponse.json(withdrawal, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création du retrait:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création du retrait" },
      { status: 500 }
    )
  }
}

