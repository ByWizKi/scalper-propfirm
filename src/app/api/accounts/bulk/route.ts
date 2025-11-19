import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PropfirmType, AccountType, AccountStatus } from "@prisma/client"
import { bulkCreateAccountSchema, validateApiRequest } from "@/lib/validation"

// POST - Créer plusieurs comptes en une fois
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const userId = session.user.id

    const body = await request.json()

    // Validation avec Zod
    const validation = validateApiRequest(bulkCreateAccountSchema, body)
    if (!validation.success) {
      return NextResponse.json({ message: validation.error }, { status: validation.status })
    }

    const { accounts } = validation.data

    // Créer tous les comptes en une transaction
    const createdAccounts = await prisma.$transaction(
      accounts.map((account) =>
        prisma.propfirmAccount.create({
          data: {
            userId: userId,
            name: account.name,
            propfirm: account.propfirm as PropfirmType,
            size: account.size,
            accountType: account.accountType as AccountType,
            status: (account.status || "ACTIVE") as AccountStatus,
            pricePaid: account.pricePaid,
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
