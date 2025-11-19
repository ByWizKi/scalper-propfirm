import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateFormula } from "@/lib/custom-stat-evaluator"
import { updateCustomStatSchema, idSchema, validateApiRequest } from "@/lib/validation"

// GET - Récupérer une statistique personnalisée spécifique
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    // Validation de l'ID
    const idValidation = validateApiRequest(idSchema, id)
    if (!idValidation.success) {
      return NextResponse.json(
        { message: idValidation.error },
        { status: idValidation.status }
      )
    }

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

    // Validation de l'ID
    const idValidation = validateApiRequest(idSchema, id)
    if (!idValidation.success) {
      return NextResponse.json(
        { message: idValidation.error },
        { status: idValidation.status }
      )
    }

    const body = await request.json()

    // Validation avec Zod
    const validation = validateApiRequest(updateCustomStatSchema, body)
    if (!validation.success) {
      return NextResponse.json({ message: validation.error }, { status: validation.status })
    }

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
    if (validation.data.formula) {
      const formulaValidation = validateFormula(validation.data.formula)
      if (!formulaValidation.valid) {
        return NextResponse.json(
          { message: formulaValidation.error || "Formule invalide" },
          { status: 400 }
        )
      }
    }

    const updateData: {
      title?: string
      description?: string | null
      formula?: string
      icon?: string | null
      variant?: string | null
      enabled?: boolean
      order?: number
    } = {}

    if (validation.data.title !== undefined) updateData.title = validation.data.title
    if (validation.data.description !== undefined)
      updateData.description = validation.data.description || null
    if (validation.data.formula !== undefined) updateData.formula = validation.data.formula
    if (validation.data.icon !== undefined) updateData.icon = validation.data.icon || null
    if (validation.data.variant !== undefined) updateData.variant = validation.data.variant || null
    if (validation.data.enabled !== undefined) updateData.enabled = validation.data.enabled
    if (validation.data.order !== undefined) updateData.order = validation.data.order

    const customStat = await prisma.customStat.update({
      where: { id },
      data: updateData,
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

    // Validation de l'ID
    const idValidation = validateApiRequest(idSchema, id)
    if (!idValidation.success) {
      return NextResponse.json(
        { message: idValidation.error },
        { status: idValidation.status }
      )
    }

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
