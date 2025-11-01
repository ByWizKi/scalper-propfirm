/**
 * Politique de mot de passe forte
 * Minimum 12 caractères avec complexité
 */

export const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: "@$!%*?&",
}

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/

export interface PasswordStrength {
  score: number // 0-4
  feedback: string[]
  isValid: boolean
}

export function validatePassword(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0

  // Longueur
  if (password.length < PASSWORD_POLICY.minLength) {
    feedback.push(`Le mot de passe doit contenir au moins ${PASSWORD_POLICY.minLength} caractères`)
  } else {
    score++
    if (password.length >= 16) score++ // Bonus pour longueur
  }

  // Minuscules
  if (!/[a-z]/.test(password)) {
    feedback.push("Le mot de passe doit contenir au moins une minuscule")
  } else {
    score++
  }

  // Majuscules
  if (!/[A-Z]/.test(password)) {
    feedback.push("Le mot de passe doit contenir au moins une majuscule")
  } else {
    score++
  }

  // Chiffres
  if (!/\d/.test(password)) {
    feedback.push("Le mot de passe doit contenir au moins un chiffre")
  } else {
    score++
  }

  // Caractères spéciaux
  if (!/[@$!%*?&]/.test(password)) {
    feedback.push("Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)")
  } else {
    score++
  }

  // Vérifier les patterns communs faibles
  const weakPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /azerty/i,
    /admin/i,
    /user/i,
    /^(.)\1+$/, // Caractères répétés
  ]

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      feedback.push("Le mot de passe contient un pattern trop commun")
      score = Math.max(0, score - 2)
      break
    }
  }

  const isValid = PASSWORD_REGEX.test(password) && feedback.length === 0

  return {
    score: Math.min(4, score),
    feedback,
    isValid,
  }
}

export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return "Très faible"
    case 2:
      return "Faible"
    case 3:
      return "Moyen"
    case 4:
      return "Fort"
    default:
      return "Inconnu"
  }
}

export function getPasswordStrengthColor(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return "red"
    case 2:
      return "orange"
    case 3:
      return "yellow"
    case 4:
      return "green"
    default:
      return "gray"
  }
}
