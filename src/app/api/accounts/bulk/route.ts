import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Créer plusieurs comptes en une fois
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { accounts } = body

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json({ message: "La liste des comptes est requise" }, { status: 400 })
    }

    if (accounts.length > 100) {
      return NextResponse.json(
        { message: "Vous ne pouvez pas créer plus de 100 comptes à la fois" },
        { status: 400 }
      )
    }

    // Validation de chaque compte
    for (const account of accounts) {
      const { name, propfirm, size, accountType, pricePaid } = account

      if (!name || !propfirm || !size || !accountType || pricePaid === undefined) {
        return NextResponse.json(
          {
            message: `Tous les champs requis doivent être renseignés pour le compte: ${name || "sans nom"}`,
          },
          { status: 400 }
        )
      }
    }

    // Créer tous les comptes en une transaction
    const createdAccounts = await prisma.$transaction(
      accounts.map(
        (account: {
          name: string
          propfirm: string
          size: number | string
          accountType: string
          status?: string
          pricePaid: number | string
          linkedEvalId?: string
          notes?: string | null
        }) =>
          prisma.propfirmAccount.create({
            data: {
              userId: session.user.id,
              name: account.name,
              propfirm: account.propfirm,
              size: parseInt(account.size),
              accountType: account.accountType,
              status: account.status || "ACTIVE",
              pricePaid: parseFloat(account.pricePaid),
              linkedEvalId: account.linkedEvalId || null,
              notes: account.notes || null,
            },
          })
      )
    )

    return NextResponse.json(
      { accounts: createdAccounts, count: createdAccounts.length },
      { status: 201 }
    )
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ message: "Erreur lors de la création des comptes" }, { status: 500 })
  }
}
