import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Récupérer tous les comptes de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const accounts = await prisma.propfirmAccount.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        pnlEntries: true,
        withdrawals: true,
        linkedEval: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error("Erreur lors de la récupération des comptes:", error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des comptes" },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau compte
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { name, propfirm, size, accountType, status, pricePaid, linkedEvalId, notes } = body

    // Validation
    if (!name || !propfirm || !size || !accountType || pricePaid === undefined) {
      return NextResponse.json(
        { message: "Tous les champs requis doivent être renseignés" },
        { status: 400 }
      )
    }

    const account = await prisma.propfirmAccount.create({
      data: {
        userId: session.user.id,
        name,
        propfirm,
        size: parseInt(size),
        accountType,
        status: status || "ACTIVE",
        pricePaid: parseFloat(pricePaid),
        linkedEvalId: linkedEvalId || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création du compte:", error)
    return NextResponse.json(
      { message: "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}

