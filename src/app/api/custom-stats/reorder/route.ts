import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Mettre à jour l'ordre de plusieurs statistiques personnalisées
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const userId = session.user.id

    const body = await request.json()
    const { orders } = body // Array of { id: string, order: number }

    if (!Array.isArray(orders)) {
      return NextResponse.json({ message: "Format invalide" }, { status: 400 })
    }

    // Mettre à jour l'ordre de chaque statistique personnalisée
    const updatePromises = orders.map(({ id, order }: { id: string; order: number }) => {
      // Vérifier que la statistique appartient à l'utilisateur
      return prisma.customStat.updateMany({
        where: {
          id,
          userId,
        },
        data: {
          order,
        },
      })
    })

    await Promise.all(updatePromises)

    return NextResponse.json({ message: "Ordre mis à jour avec succès" })
  } catch (error) {
    console.error("API Error:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Erreur lors de la mise à jour de l'ordre"
    return NextResponse.json({ message: errorMessage }, { status: 500 })
  }
}
