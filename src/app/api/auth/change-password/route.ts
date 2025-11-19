import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { changePasswordSchema, validateApiRequest } from "@/lib/validation"

export async function PUT(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()

    // Validation avec Zod
    const validation = validateApiRequest(changePasswordSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status })
    }

    const { currentPassword, newPassword } = validation.data

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    // Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Le mot de passe actuel est incorrect" }, { status: 400 })
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ message: "Mot de passe modifié avec succès" }, { status: 200 })
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json(
      { error: "Une erreur est survenue lors du changement de mot de passe" },
      { status: 500 }
    )
  }
}
