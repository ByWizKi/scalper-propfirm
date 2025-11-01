/**
 * Rate Limiting simple en mémoire
 * Pour une app en production, utiliser Redis
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Nettoyer les anciennes entrées toutes les heures
setInterval(
  () => {
    const now = Date.now()
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  },
  60 * 60 * 1000
)

export interface RateLimitConfig {
  windowMs: number // Fenêtre de temps en millisecondes
  max: number // Nombre maximum de requêtes
}

export const RateLimitConfigs = {
  // Login : 5 tentatives par 15 minutes
  login: {
    windowMs: 15 * 60 * 1000,
    max: 5,
  },
  // Register : 3 inscriptions par heure
  register: {
    windowMs: 60 * 60 * 1000,
    max: 3,
  },
  // API générale : 100 requêtes par minute
  api: {
    windowMs: 60 * 1000,
    max: 100,
  },
  // Changement de mot de passe : 3 tentatives par heure
  passwordChange: {
    windowMs: 60 * 60 * 1000,
    max: 3,
  },
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = identifier

  let entry = rateLimitStore.get(key)

  // Si l'entrée n'existe pas ou a expiré, créer une nouvelle
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)
    return {
      success: true,
      remaining: config.max - 1,
      resetTime: entry.resetTime,
    }
  }

  // Incrémenter le compteur
  entry.count++

  // Vérifier si la limite est dépassée
  if (entry.count > config.max) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  return {
    success: true,
    remaining: config.max - entry.count,
    resetTime: entry.resetTime,
  }
}

export function getRateLimitKey(type: string, identifier: string): string {
  return `${type}:${identifier}`
}
