import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateFormula } from "@/lib/custom-stat-evaluator"

// GET - Récupérer une statistique personnalisée spécifique
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    const customStat = await prisma.customStat.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!customStat) {
      return NextResponse.json(
        { message: "Statistique personnalisée non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json(customStat)
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération de la statistique personnalisée" },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour une statistique personnalisée
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, formula, icon, variant, enabled, order } = body

    // Vérifier que la statistique appartient à l'utilisateur
    const existingStat = await prisma.customStat.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingStat) {
      return NextResponse.json(
        { message: "Statistique personnalisée non trouvée" },
        { status: 404 }
      )
    }

    // Valider la formule si elle est fournie
    if (formula) {
      const validation = validateFormula(formula)
      if (!validation.valid) {
        return NextResponse.json({ message: validation.error }, { status: 400 })
      }
    }

    const customStat = await prisma.customStat.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingStat.title,
        description: description !== undefined ? description : existingStat.description,
        formula: formula !== undefined ? formula : existingStat.formula,
        icon: icon !== undefined ? icon : existingStat.icon,
        variant: variant !== undefined ? variant : existingStat.variant,
        enabled: enabled !== undefined ? enabled : existingStat.enabled,
        order: order !== undefined ? order : existingStat.order,
      },
    })

    return NextResponse.json(customStat)
  } catch (error) {
    console.error("API Error:", error)
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Erreur lors de la mise à jour de la statistique personnalisée"
    return NextResponse.json({ message: errorMessage }, { status: 500 })
  }
}

// DELETE - Supprimer une statistique personnalisée
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que la statistique appartient à l'utilisateur
    const existingStat = await prisma.customStat.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingStat) {
      return NextResponse.json(
        { message: "Statistique personnalisée non trouvée" },
        { status: 404 }
      )
    }

    await prisma.customStat.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Statistique personnalisée supprimée avec succès" })
  } catch (error) {
    console.error("API Error:", error)
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Erreur lors de la suppression de la statistique personnalisée"
    return NextResponse.json({ message: errorMessage }, { status: 500 })
  }
}
