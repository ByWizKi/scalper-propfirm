/**
 * Script de test pour vérifier que le modèle Trade est disponible dans Prisma
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
  log: [], // Désactiver les logs de requêtes pour la sécurité
})

async function testTradeModel() {
  try {
    console.info("🔍 Vérification du modèle Trade...")

    // Vérifier que prisma.trade existe
    if (!prisma.trade) {
      console.error("❌ prisma.trade n'est pas disponible")
      console.error("   Le client Prisma doit être régénéré avec: npx prisma generate")
      process.exit(1)
    }

    console.info("✅ prisma.trade est disponible")

    // Vérifier les méthodes disponibles
    const methods = Object.keys(prisma.trade).filter(
      (key) => typeof (prisma.trade as unknown as Record<string, unknown>)[key] === "function"
    )
    console.info(`✅ Méthodes disponibles: ${methods.join(", ")}`)

    // Essayer de compter les trades (sans erreur même si la table est vide)
    try {
      const count = await prisma.trade.count()
      console.info(`✅ Connexion à la base de données OK. Nombre de trades: ${count}`)
    } catch (error) {
      console.error("❌ Erreur lors de la connexion à la base de données:")
      console.error(error)
      process.exit(1)
    }

    console.info("\n✅ Tous les tests sont passés!")
  } catch (error) {
    console.error("❌ Erreur:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testTradeModel()

