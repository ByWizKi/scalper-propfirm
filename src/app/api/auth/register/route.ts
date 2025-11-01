import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { rateLimit, getRateLimitKey, RateLimitConfigs } from "@/lib/rate-limit"
import { rateLimitResponse, genericErrorResponse } from "@/middleware/security"
import { validatePassword } from "@/lib/password-policy"
import { sanitizeString } from "@/lib/sanitization"
import { getClientInfo } from "@/lib/audit-logger"

export async function POST(request: Request) {
  try {
    const { username, name, password } = await request.json()

    // Rate limiting
    const clientInfo = getClientInfo(request)
    const rateLimitKey = getRateLimitKey("register", clientInfo.ipAddress)
    const rateLimitResult = rateLimit(rateLimitKey, RateLimitConfigs.register)

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime)
    }

    // Validation
    if (!username || !password) {
      return genericErrorResponse("Informations manquantes")
    }

    if (username.length < 3) {
      return genericErrorResponse("Pseudo invalide")
    }

    // Validation mot de passe forte
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: "Mot de passe trop faible",
          feedback: passwordValidation.feedback,
        },
        { status: 400 }
      )
    }

    // Sanitization
    const sanitizedUsername = sanitizeString(username)
    const sanitizedName = name ? sanitizeString(name) : null

    // Vérifier si l'utilisateur existe déjà (message générique pour sécurité)
    const existingUser = await prisma.user.findUnique({
      where: { username: sanitizedUsername },
    })

    if (existingUser) {
      return genericErrorResponse("Inscription impossible")
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        username: sanitizedUsername,
        name: sanitizedName,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
      },
    })

    // Log audit (sera activé après migration de la DB)
    // await logAudit({
    //   userId: user.id,
    //   action: AuditAction.REGISTER,
    //   ipAddress: clientInfo.ipAddress,
    //   userAgent: clientInfo.userAgent,
    //   metadata: { username: sanitizedUsername },
    // })

    return NextResponse.json(
      {
        message: "Compte créé avec succès",
        user,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error)
    return genericErrorResponse("Une erreur est survenue")
  }
}
