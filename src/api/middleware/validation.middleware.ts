/**
 * Middleware de validation pour l'API
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { validateApiRequest } from "@/lib/validation"

/**
 * Valide les données de la requête avec un schéma Zod
 */
export function validateRequest<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse } {
  const validation = validateApiRequest(schema, data)
  if (!validation.success) {
    return {
      success: false,
      response: NextResponse.json(
        { message: validation.error },
        { status: validation.status }
      ),
    }
  }
  return { success: true, data: validation.data as z.infer<T> }
}

/**
 * Wrapper pour valider le body de la requête
 */
export function withValidation<T extends z.ZodSchema>(
  schema: T,
  handler: (data: z.infer<T>, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: Request, ...args: any[]): Promise<NextResponse> => {
    const body = await request.json()
    const validation = validateRequest(schema, body)
    if (!validation.success) {
      return validation.response
    }
    return handler(validation.data, ...args)
  }
}

