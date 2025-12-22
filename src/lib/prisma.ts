import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Vérifier si l'instance existante a le modèle Trade
const existingPrisma = globalForPrisma.prisma
const needsRefresh = existingPrisma && !(existingPrisma as { trade?: unknown }).trade

if (needsRefresh) {
  // Déconnecter l'ancienne instance
  if (existingPrisma) {
    existingPrisma.$disconnect().catch(() => {
      // Ignorer les erreurs de déconnexion
    })
  }
  // Supprimer l'instance du cache
  globalForPrisma.prisma = undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [], // Aucun log pour la sécurité (pas de queries, pas d'erreurs exposées)
    // Note: Les logs peuvent aussi être désactivés via la variable d'environnement DEBUG
    // Assurez-vous que DEBUG ne contient pas "prisma:query" ou "prisma:*"
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
