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
  propfirm: z.enum(["TOPSTEP", "TAKEPROFITTRADER"], {
    errorMap: () => ({ message: "Propfirm invalide" }),
  }),
  size: z.number().int().positive("La taille doit être positive").max(1000000),
  accountType: z.enum(["EVAL", "FUNDED"], {
    errorMap: () => ({ message: "Type de compte invalide" }),
  }),
  status: z.enum(["ACTIVE", "VALIDATED", "FAILED", "ARCHIVED"], {
    errorMap: () => ({ message: "Statut invalide" }),
  }),
  pricePaid: z.number().nonnegative("Le prix doit être positif ou nul").max(100000),
  linkedEvalId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
})

export const updateAccountSchema = createAccountSchema.partial()

/**
 * Validation pour les entrées PnL
 */
export const createPnlSchema = z.object({
  accountId: z.string().uuid("ID de compte invalide"),
  date: z.string().datetime("Date invalide").or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  amount: z.number()
    .min(-1000000, "Montant trop bas")
    .max(1000000, "Montant trop élevé")
    .refine((val) => Math.abs(val) > 0.01 || val === 0, "Montant invalide"),
  notes: z.string().max(500).optional(),
})

export const updatePnlSchema = createPnlSchema.partial().extend({
  id: z.string().uuid("ID invalide"),
})

/**
 * Validation pour les retraits
 */
export const createWithdrawalSchema = z.object({
  accountId: z.string().uuid("ID de compte invalide"),
  date: z.string().datetime("Date invalide").or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  amount: z.number().positive("Le montant doit être positif").max(1000000, "Montant trop élevé"),
  notes: z.string().max(500).optional(),
})

export const updateWithdrawalSchema = createWithdrawalSchema.partial().extend({
  id: z.string().uuid("ID invalide"),
})

/**
 * Validation pour les ID
 */
export const idSchema = z.string().uuid("ID invalide")

/**
 * Helper pour valider les données de manière sécurisée
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(", ")
      throw new Error(`Validation échouée: ${messages}`)
    }
    throw error
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(", ")
      return { success: false, error: `Validation échouée: ${messages}` }
    }
    return { success: false, error: "Erreur de validation" }
  }
}

/**
 * Validation des paramètres de requête
 */
export const queryParamsSchema = z.object({
  accountId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
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

