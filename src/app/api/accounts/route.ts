import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PropfirmType, AccountType, AccountStatus } from "@prisma/client"
import { createAccountSchema, validateApiRequest } from "@/lib/validation"

/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: Récupère tous les comptes de l'utilisateur authentifié
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Liste des comptes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  try {
    console.info("[API Accounts] Début de la requête GET")

    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null
    console.info("[API Accounts] Session:", session ? "authentifiée" : "non authentifiée")

    if (!session?.user?.id) {
      console.warn("[API Accounts] Utilisateur non authentifié")
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    console.info("[API Accounts] Récupération des comptes pour userId:", session.user.id)

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

    console.info(`[API Accounts] ${accounts.length} comptes trouvés`)

    return NextResponse.json(accounts)
  } catch (error) {
    console.error("[API Accounts] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
    const errorStack = error instanceof Error ? error.stack : undefined

    if (errorStack) {
      console.error("[API Accounts] Stack:", errorStack)
    }

    return NextResponse.json(
      {
        message: `Erreur lors de la récupération des comptes: ${errorMessage}`,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/accounts:
 *   post:
 *     summary: Crée un nouveau compte prop firm
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - propfirm
 *               - size
 *               - accountType
 *               - pricePaid
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Mon Compte Apex"
 *               propfirm:
 *                 type: string
 *                 enum: [TOPSTEP, TAKEPROFITTRADER, APEX, BULENOX, PHIDIAS, FTMO, MYFUNDEDFUTURES, OTHER]
 *                 example: "APEX"
 *               size:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000000
 *                 example: 50000
 *               accountType:
 *                 type: string
 *                 enum: [EVAL, FUNDED]
 *                 example: "EVAL"
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, VALIDATED, FAILED, ARCHIVED]
 *                 default: ACTIVE
 *                 example: "ACTIVE"
 *               pricePaid:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100000
 *                 example: 100
 *               linkedEvalId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 example: null
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *                 example: "Notes sur le compte"
 *     responses:
 *       201:
 *         description: Compte créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()

    // Validation avec Zod
    const validation = validateApiRequest(createAccountSchema, body)
    if (!validation.success) {
      return NextResponse.json({ message: validation.error }, { status: validation.status })
    }

    const { name, propfirm, size, accountType, status, pricePaid, linkedEvalId, notes } =
      validation.data

    const account = await prisma.propfirmAccount.create({
      data: {
        userId: session.user.id,
        name,
        propfirm: propfirm as PropfirmType,
        size,
        accountType: accountType as AccountType,
        status: (status || "ACTIVE") as AccountStatus,
        pricePaid,
        linkedEvalId: linkedEvalId || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error("API Error:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Erreur lors de la création du compte"
    return NextResponse.json({ message: errorMessage }, { status: 500 })
  }
}
