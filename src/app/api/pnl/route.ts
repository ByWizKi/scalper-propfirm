import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Récupérer toutes les entrées PnL de l'utilisateur
export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")

    const where = {
      userId: session.user.id,
      ...(accountId && { accountId }),
    }

    const pnlEntries = await prisma.pnlEntry.findMany({
      where,
      include: {
        account: true,
      },
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json(pnlEntries)
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json({ message: "Erreur lors de la récupération des PnL" }, { status: 500 })
  }
}

// POST - Créer une nouvelle entrée PnL
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

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
      return NextResponse.json({ message: "Compte non trouvé" }, { status: 404 })
    }

    const pnlEntry = await prisma.pnlEntry.create({
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

    return NextResponse.json(pnlEntry, { status: 201 })
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json({ message: "Erreur lors de la création du PnL" }, { status: 500 })
  }
}
