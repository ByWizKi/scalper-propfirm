/**
 * Protection CSRF (Cross-Site Request Forgery)
 */

import { nanoid } from "nanoid"

export function generateCsrfToken(): string {
  return nanoid(32)
}

export function validateCsrfToken(token: string | null, expectedToken: string): boolean {
  if (!token || !expectedToken) {
    return false
  }
  return token === expectedToken
}

export function getCsrfTokenFromRequest(req: Request): string | null {
  // Vérifier le header
  const headerToken = req.headers.get("x-csrf-token")
  if (headerToken) {
    return headerToken
  }

  // Vérifier le body (pour les formulaires)
  // Note: nécessite de parser le body avant
  return null
}
