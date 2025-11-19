/**
 * Middleware de gestion d'erreurs pour l'API
 */

import { NextResponse } from "next/server"

export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * Gère les erreurs de manière cohérente
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error)

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        message: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    // Ne pas exposer les détails des erreurs internes en production
    const isDevelopment = process.env.NODE_ENV === "development"
    return NextResponse.json(
      {
        message: isDevelopment ? error.message : "Une erreur est survenue",
        ...(isDevelopment && { stack: error.stack }),
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { message: "Une erreur inattendue est survenue" },
    { status: 500 }
  )
}

/**
 * Wrapper pour les handlers API avec gestion d'erreurs
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

