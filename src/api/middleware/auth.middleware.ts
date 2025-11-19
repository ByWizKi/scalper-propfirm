/**
 * Middleware d'authentification réutilisable pour l'API
 * Permet de vérifier l'authentification de manière cohérente
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export interface AuthenticatedRequest {
  userId: string
  session: {
    user: {
      id: string
    }
  }
}

/**
 * Vérifie si l'utilisateur est authentifié
 * Retourne l'ID de l'utilisateur ou null
 */
export async function requireAuth(): Promise<
  | { success: true; userId: string; session: { user: { id: string } } }
  | { success: false; response: NextResponse }
> {
  const session = (await getServerSession(authOptions)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return {
      success: false,
      response: NextResponse.json({ message: "Non authentifié" }, { status: 401 }),
    }
  }

  return {
    success: true,
    userId: session.user.id,
    session: session as { user: { id: string } },
  }
}

/**
 * Wrapper pour les handlers API qui nécessitent une authentification
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuth<T extends any[]>(
  handler: (userId: string, ...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const authResult = await requireAuth()
    if (!authResult.success) {
      return authResult.response
    }
    return handler(authResult.userId, ...args)
  }
}
