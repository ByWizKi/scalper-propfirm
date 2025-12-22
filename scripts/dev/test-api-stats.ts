/**
 * Script de test pour vérifier que l'API de statistiques fonctionne
 */

import { PrismaClient } from "@prisma/client"
import { calculateTradingStats } from "../src/services/trading-stats.service"

const prisma = new PrismaClient({
  log: [], // Désactiver les logs de requêtes pour la sécurité
})

async function testStatsAPI() {
  try {
    console.info("🔍 Test de l'API de statistiques...\n")

    // 1. Vérifier que prisma.trade existe
    console.info("1. Vérification du modèle Trade...")
    if (!prisma.trade) {
      console.error("❌ prisma.trade n'est pas disponible")
      process.exit(1)
    }
    console.info("✅ prisma.trade est disponible\n")

    // 2. Tester le calcul des statistiques avec des données mockées
    console.info("2. Test du calcul des statistiques...")

    // Données mockées pour tester le service
    const mockTrades = [
      {
        id: "test-1",
        pnl: 12.0,
        fees: 2.22,
        size: 3,
        tradeDay: new Date("2025-12-18"),
        tradeDuration: 1800,
        enteredAt: new Date("2025-12-18T10:00:00"),
      },
      {
        id: "test-2",
        pnl: 25.5,
        fees: 2.22,
        size: 3,
        tradeDay: new Date("2025-12-18"),
        tradeDuration: 1800,
        enteredAt: new Date("2025-12-18T11:00:00"),
      },
      {
        id: "test-3",
        pnl: -10.0,
        fees: 2.5,
        size: 1,
        tradeDay: new Date("2025-12-19"),
        tradeDuration: 900,
        enteredAt: new Date("2025-12-19T10:00:00"),
      },
    ]

    const stats = calculateTradingStats(mockTrades)
    console.info("✅ Statistiques calculées:")
    console.info(`   - Total trades: ${stats.totalTrades}`)
    console.info(`   - Trade Win %: ${stats.tradeWinPercent.toFixed(2)}%`)
    console.info(`   - Profit Factor: ${stats.profitFactor.toFixed(2)}`)
    console.info(`   - Day Win %: ${stats.dayWinPercent.toFixed(2)}%`)
    console.info(`   - Total Lots: ${stats.totalLots}`)
    console.info(`   - Avg Trade Duration: ${stats.averageTradeDuration.toFixed(0)}s\n`)

    // 3. Tester la récupération depuis la base (si des trades existent)
    console.info("3. Test de récupération depuis la base de données...")
    const existingTrades = await prisma.trade.findMany({
      take: 5,
      orderBy: {
        tradeDay: "desc",
      },
    })
    console.info(`✅ ${existingTrades.length} trades existants dans la base\n`)

    console.info("✅ Tous les tests sont passés!")
  } catch (error) {
    console.error("❌ Erreur:", error)
    if (error instanceof Error) {
      console.error("   Message:", error.message)
      console.error("   Stack:", error.stack)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testStatsAPI()

