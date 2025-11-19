/**
 * Schémas de validation Zod pour toutes les entrées utilisateur
 * Protection contre les injections et données malveillantes
 */

import { z } from "zod"

/**
 * Validation pour l'authentification
 */
export const loginSchema = z.object({
  email: z.string().email("Email invalide").max(255),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(100),
})

export const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().email("Email invalide").max(255),
  password: z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(100)
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
})

/**
 * Validation pour les comptes propfirm
 */
export const createAccountSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  propfirm: z.enum([
    "TOPSTEP",
    "TAKEPROFITTRADER",
    "APEX",
    "BULENOX",
    "PHIDIAS",
    "FTMO",
    "MYFUNDEDFUTURES",
    "OTHER",
  ]),
  size: z.number().int().positive("La taille doit être positive").max(1000000),
  accountType: z.enum(["EVAL", "FUNDED"]),
  status: z.enum(["ACTIVE", "VALIDATED", "FAILED", "ARCHIVED"]).optional(),
  pricePaid: z.number().nonnegative("Le prix doit être positif ou nul").max(100000),
  linkedEvalId: z.string().min(1).refine(
    (val) => {
      // Accepter les UUIDs et les CUIDs (format Prisma)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const cuidRegex = /^c[a-z0-9]{20,}$/i
      return uuidRegex.test(val) || cuidRegex.test(val) || val.length >= 20
    },
    { message: "ID invalide" }
  ).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().nullable(),
})

export const updateAccountSchema = createAccountSchema.partial()

/**
 * Schéma pour la création en masse de comptes
 */
export const bulkCreateAccountSchema = z.object({
  accounts: z
    .array(createAccountSchema)
    .min(1, "Au moins un compte est requis")
    .max(100, "Vous ne pouvez pas créer plus de 100 comptes à la fois"),
})

/**
 * Validation pour les entrées PnL
 */
export const createPnlSchema = z.object({
  accountId: z.string().min(1, "ID de compte requis").refine(
    (val) => {
      // Accepter les UUIDs et les CUIDs (format Prisma)
      // UUID: format standard avec tirets (ex: 550e8400-e29b-41d4-a716-446655440000)
      // CUID: commence par 'c' suivi de caractères alphanumériques (ex: clh1234567890abcdef)
      // Format CUID: c + 25 caractères alphanumériques (base36)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      // CUID: commence par 'c' et contient au moins 20 caractères alphanumériques
      const cuidRegex = /^c[a-z0-9]{20,}$/i
      // Validation plus permissive pour les IDs Prisma (peut être CUID ou autre format)
      return uuidRegex.test(val) || cuidRegex.test(val) || val.length >= 20
    },
    { message: "ID de compte invalide" }
  ),
  date: z.string().datetime("Date invalide").or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  amount: z.number()
    .min(-1000000, "Montant trop bas")
    .max(1000000, "Montant trop élevé")
    .refine((val) => Math.abs(val) > 0.01 || val === 0, "Montant invalide"),
  notes: z.string().max(500).optional(),
})

export const updatePnlSchema = createPnlSchema.partial()

/**
 * Schéma pour mettre à jour un PnL (avec ID dans les params)
 */
export const updatePnlBodySchema = createPnlSchema.partial()

/**
 * Validation pour les retraits
 */
export const createWithdrawalSchema = z.object({
  accountId: z.string().min(1, "ID de compte requis").refine(
    (val) => {
      // Accepter les UUIDs et les CUIDs (format Prisma)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const cuidRegex = /^c[a-z0-9]{20,}$/i
      // Validation plus permissive pour les IDs Prisma
      return uuidRegex.test(val) || cuidRegex.test(val) || val.length >= 20
    },
    { message: "ID de compte invalide" }
  ),
  date: z.string().datetime("Date invalide").or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  amount: z.number().positive("Le montant doit être positif").max(1000000, "Montant trop élevé"),
  notes: z.string().max(500).optional(),
})

export const updateWithdrawalSchema = createWithdrawalSchema.partial()

/**
 * Schéma pour mettre à jour un retrait (avec ID dans les params)
 */
export const updateWithdrawalBodySchema = createWithdrawalSchema.partial()

/**
 * Validation pour les ID
 * Prisma utilise des CUIDs (format: c + caractères alphanumériques)
 * On valide simplement que c'est une chaîne non vide avec une longueur raisonnable
 * La validation stricte sera faite par Prisma lors de la requête
 *
 * Pour les routes GET, on peut être plus permissif car Prisma retournera simplement null
 * si l'ID n'existe pas. Pour les routes POST/PUT, cette validation empêche les injections.
 */
export const idSchema = z
  .string()
  .min(1, "ID requis")
  .max(100, "ID trop long")
  // Validation permissive : accepter toute chaîne alphanumérique avec quelques caractères spéciaux
  // Prisma validera l'ID de toute façon
  .refine(
    (val) => {
      // Rejeter seulement les chaînes qui contiennent des caractères manifestement dangereux
      // pour éviter les injections SQL basiques (même si Prisma est protégé)
      const dangerousChars = /[<>'"\\;]/g
      return !dangerousChars.test(val)
    },
    {
      message: "ID contient des caractères invalides",
    }
  )

/**
 * Helper pour valider les données de manière sécurisée
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (_error) {
    if (_error instanceof z.ZodError) {
      const messages = _error.issues.map((e) => e.message).join(", ")
      throw new Error(`Validation échouée: ${messages}`)
    }
    throw _error
  }
}

/**
 * Helper pour valider de manière asynchrone
 */
export async function validateDataAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (_error) {
    if (_error instanceof z.ZodError) {
      const messages = _error.issues.map((e) => e.message).join(", ")
      return { success: false, error: `Validation échouée: ${messages}` }
    }
    return { success: false, error: "Erreur de validation" }
  }
}

/**
 * Validation des paramètres de requête
 */
export const queryParamsSchema = z.object({
  accountId: z.string().min(1).refine(
    (val) => {
      // Accepter les UUIDs et les CUIDs (format Prisma)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const cuidRegex = /^c[a-z0-9]{20,}$/i
      return uuidRegex.test(val) || cuidRegex.test(val) || val.length >= 20
    },
    { message: "ID de compte invalide" }
  ).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
})

/**
 * Validation pour le changement de mot de passe
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z
    .string()
    .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères")
    .max(100)
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
})

/**
 * Validation pour les statistiques personnalisées
 */
export const createCustomStatSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(100),
  description: z.string().max(500).optional().nullable(),
  formula: z.string().min(1, "La formule est requise").max(1000),
  icon: z.string().max(50).optional().nullable(),
  variant: z.string().max(50).optional().nullable(),
  enabled: z.boolean().optional(),
  order: z.number().int().optional(),
})

export const updateCustomStatSchema = createCustomStatSchema.partial()

/**
 * Validation pour le réordonnancement des statistiques personnalisées
 */
export const reorderCustomStatsSchema = z.object({
  orders: z
    .array(
      z.object({
        id: z.string().min(1).refine(
          (val) => {
            // Accepter les UUIDs et les CUIDs (format Prisma)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            const cuidRegex = /^c[a-z0-9]{20,}$/i
            return uuidRegex.test(val) || cuidRegex.test(val) || val.length >= 20
          },
          { message: "ID invalide" }
        ),
        order: z.number().int().nonnegative("L'ordre doit être positif ou nul"),
      })
    )
    .min(1, "Au moins une statistique est requise"),
})

/**
 * Sanitize HTML pour éviter les XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

/**
 * Helper pour valider les données d'une requête API et retourner une réponse d'erreur si nécessaire
 * Utilisé dans les routes API pour une validation cohérente
 */
export function validateApiRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; status: number } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => e.message).join(", ")
      return { success: false, error: `Validation échouée: ${messages}`, status: 400 }
    }
    return { success: false, error: "Erreur de validation", status: 400 }
  }
}

