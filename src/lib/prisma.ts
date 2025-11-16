import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

// Vérification que customStat est disponible (pour debug)
if (process.env.NODE_ENV === "development" && !prisma.customStat) {
  console.warn(
    "⚠️  Prisma.customStat n'est pas disponible. Vérifiez que Prisma Client a été régénéré."
  )
}
