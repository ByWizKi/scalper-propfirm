/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Sanitization des entrées utilisateur
 * Protection contre XSS et injection
 */

export function sanitizeString(input: string): string {
  // Supprimer tous les tags HTML et caractères dangereux
  return input
    .replace(/<[^>]*>/g, "") // Supprimer tags HTML
    .replace(/[<>]/g, "") // Supprimer chevrons restants
    .trim()
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }

  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeString(sanitized[key]) as any
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key])
    }
  }

  return sanitized
}

export function sanitizeAccountData(data: { name?: string; notes?: string; [key: string]: any }) {
  return {
    ...data,
    name: data.name ? sanitizeString(data.name) : undefined,
    notes: data.notes ? sanitizeString(data.notes) : undefined,
  }
}

export function sanitizePnlData(data: { notes?: string; [key: string]: any }) {
  return {
    ...data,
    notes: data.notes ? sanitizeString(data.notes) : undefined,
  }
}

export function sanitizeWithdrawalData(data: { notes?: string; [key: string]: any }) {
  return {
    ...data,
    notes: data.notes ? sanitizeString(data.notes) : undefined,
  }
}

// Validation supplémentaire pour les noms de compte
export function isValidAccountName(name: string): boolean {
  // Autoriser lettres, chiffres, espaces, tirets et underscores
  const validPattern = /^[a-zA-Z0-9\s\-_]+$/
  return validPattern.test(name) && name.length <= 100
}

// Validation pour les notes
export function isValidNotes(notes: string): boolean {
  // Limiter la longueur et les caractères
  return notes.length <= 500
}
