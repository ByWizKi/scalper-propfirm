/**
 * Middleware de sécurité
 */

import { NextResponse } from "next/server"

export function securityHeaders(response: NextResponse): NextResponse {
  // CSP renforcé
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none';"
  )

  // Protection contre clickjacking
  response.headers.set("X-Frame-Options", "DENY")

  // Empêcher le MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")

  // Protection XSS
  response.headers.set("X-XSS-Protection", "1; mode=block")

  // HSTS (HTTPS uniquement)
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

  // Politique de référence
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Permissions Policy
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  return response
}

export function rateLimitResponse(resetTime: number): NextResponse {
  const waitTime = Math.ceil((resetTime - Date.now()) / 1000)

  return NextResponse.json(
    {
      error: "Trop de tentatives",
      message: `Veuillez réessayer dans ${waitTime} secondes`,
      retryAfter: waitTime,
    },
    {
      status: 429,
      headers: {
        "Retry-After": waitTime.toString(),
        "X-RateLimit-Reset": new Date(resetTime).toISOString(),
      },
    }
  )
}

export function genericErrorResponse(message: string = "Une erreur est survenue"): NextResponse {
  // Messages génériques pour ne pas révéler trop d'informations
  return NextResponse.json(
    {
      error: message,
    },
    { status: 400 }
  )
}

export function csrfErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Token de sécurité invalide",
      message: "Veuillez rafraîchir la page et réessayer",
    },
    { status: 403 }
  )
}
