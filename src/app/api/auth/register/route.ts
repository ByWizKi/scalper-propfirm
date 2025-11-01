import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { username, name, password } = await request.json()

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: "Pseudo et mot de passe requis" },
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Le pseudo doit contenir au moins 3 caractères" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte avec ce pseudo existe déjà" },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        username,
        name: name || null,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
      }
    })

    return NextResponse.json(
      {
        message: "Compte créé avec succès",
        user
      },
      { status: 201 }
    )
  } catch (_error) {
    console.error("Erreur lors de l'inscription:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'inscription" },
      { status: 500 }
    )
  }
}


