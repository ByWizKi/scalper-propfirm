/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
/**
 * Configuration de sécurité pour l'application
 */

/**
 * Options de cookies sécurisées pour NextAuth
 */
export const secureCookieOptions = {
  sessionToken: {
    name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
  callbackUrl: {
    name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.callback-url`,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
  csrfToken: {
    name: `${process.env.NODE_ENV === "production" ? "__Host-" : ""}next-auth.csrf-token`,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
}

/**
 * Headers de sécurité HTTP
 */
export const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
]

/**
 * Content Security Policy
 */
export const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'self';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, " ").trim()

/**
 * Rate limiting simple en mémoire (pour production, utiliser Redis)
 */
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): { success: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)

  // Nettoyer les anciennes entrées
  if (entry && entry.resetTime < now) {
    rateLimitMap.delete(identifier)
  }

  const currentEntry = rateLimitMap.get(identifier)

  if (!currentEntry) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return { success: true, remaining: maxRequests - 1 }
  }

  if (currentEntry.count >= maxRequests) {
    return { success: false, remaining: 0 }
  }

  currentEntry.count += 1
  return { success: true, remaining: maxRequests - currentEntry.count }
}

/**
 * Nettoyer périodiquement le cache de rate limiting
 */
if (typeof window === "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap.entries()) {
      if (entry.resetTime < now) {
        rateLimitMap.delete(key)
      }
    }
  }, 60000) // Nettoyer toutes les minutes
}

/**
 * Générer un token CSRF sécurisé
 */
export function generateCsrfToken(): string {
  if (typeof window !== "undefined") {
    // Client-side
    return crypto.randomUUID()
  }
  // Server-side
  return require("crypto").randomBytes(32).toString("hex")
}

/**
 * Valider l'origine de la requête
 */
export function validateOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false
  return allowedOrigins.some((allowed) => {
    if (allowed === "*") return true
    if (allowed.endsWith("*")) {
      const baseOrigin = allowed.slice(0, -1)
      return origin.startsWith(baseOrigin)
    }
    return origin === allowed
  })
}

/**
 * Hashing sécurisé des mots de passe
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = require("bcryptjs")
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const bcrypt = require("bcryptjs")
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Logger sécurisé qui masque les données sensibles
 */
export function secureLog(message: string, data?: any) {
  if (process.env.NODE_ENV === "development") {
    const sanitizedData = sanitizeSensitiveData(data)
    console.info(`[${new Date().toISOString()}] ${message}`, sanitizedData || "")
  }
}

function sanitizeSensitiveData(data: any): any {
  if (!data) return data

  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "apiKey",
    "api_key",
    "accessToken",
    "refreshToken",
  ]

  if (typeof data === "object") {
    const sanitized = { ...data }
    for (const key in sanitized) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = "***REDACTED***"
      } else if (typeof sanitized[key] === "object") {
        sanitized[key] = sanitizeSensitiveData(sanitized[key])
      }
    }
    return sanitized
  }

  return data
}

