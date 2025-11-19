import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateFormula } from "@/lib/custom-stat-evaluator"
import { createCustomStatSchema, validateApiRequest } from "@/lib/validation"

// GET - Récupérer toutes les statistiques personnalisées de l'utilisateur
export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const customStats = await prisma.customStat.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        order: "asc",
      },
    })

    return NextResponse.json(customStats)
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des statistiques personnalisées" },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle statistique personnalisée
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()

    // Validation avec Zod
    const validation = validateApiRequest(createCustomStatSchema, body)
    if (!validation.success) {
      return NextResponse.json({ message: validation.error }, { status: validation.status })
    }

    const { title, description, formula, icon, variant, enabled, order } = validation.data

    // Valider la formule
    const formulaValidation = validateFormula(formula)
    if (!formulaValidation.valid) {
      return NextResponse.json(
        { message: formulaValidation.error || "Formule invalide" },
        { status: 400 }
      )
    }

    // Vérifier que prisma est disponible
    if (!prisma) {
      console.error("Prisma n'est pas initialisé")
      return NextResponse.json({ message: "Erreur de configuration serveur" }, { status: 500 })
    }

    // Vérifier que customStat est disponible (avec gestion d'erreur)
    if (!prisma.customStat) {
      console.error("Prisma.customStat n'est pas disponible")
      console.error("Type de prisma:", typeof prisma)
      console.error(
        "Modèles disponibles:",
        Object.keys(prisma).filter((k) => !k.startsWith("_") && !k.startsWith("$"))
      )

      return NextResponse.json(
        { message: "Le modèle CustomStat n'est pas disponible. Veuillez redémarrer le serveur." },
        { status: 500 }
      )
    }

    // Obtenir le prochain ordre si non spécifié
    let finalOrder = order
    if (finalOrder === undefined || finalOrder === null) {
      try {
        const maxOrder = await prisma.customStat.findFirst({
          where: { userId: session.user.id },
          orderBy: { order: "desc" },
          select: { order: true },
        })
        finalOrder = (maxOrder?.order ?? -1) + 1
      } catch (orderError) {
        console.error("Erreur lors de la récupération de l'ordre:", orderError)
        // En cas d'erreur, commencer à 0
        finalOrder = 0
      }
    }

    const customStat = await prisma.customStat.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
        description: description ? description.trim() : null,
        formula: formula.trim(),
        icon: icon ? icon.trim() : null,
        variant: variant ? variant.trim() : null,
        enabled: enabled !== undefined ? enabled : true,
        order: finalOrder,
      },
    })

    return NextResponse.json(customStat, { status: 201 })
  } catch (error) {
    console.error("API Error détaillé:", error)
    console.error("Type d'erreur:", error?.constructor?.name)
    console.error("Stack:", error instanceof Error ? error.stack : "Pas de stack")

    let errorMessage = "Erreur lors de la création de la statistique personnalisée"

    if (error instanceof Error) {
      const errorMsg = error.message || ""
      console.error("Message d'erreur:", errorMsg)

      // Erreurs Prisma spécifiques
      if (errorMsg.includes("Unique constraint") || errorMsg.includes("unique")) {
        errorMessage = "Une statistique avec ce nom existe déjà"
      } else if (errorMsg.includes("Foreign key constraint") || errorMsg.includes("foreign key")) {
        errorMessage = "Erreur de référence utilisateur"
      } else if (errorMsg.includes("Invalid value") || errorMsg.includes("invalid")) {
        errorMessage = "Données invalides. Vérifiez les valeurs saisies."
      } else if (errorMsg.length > 0) {
        errorMessage = errorMsg
      }
    } else {
      console.error("Erreur non-Error:", JSON.stringify(error))
    }

    console.error("Message d'erreur final:", errorMessage)
    return NextResponse.json({ message: errorMessage }, { status: 500 })
  }
}
