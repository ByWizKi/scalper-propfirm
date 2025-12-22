/**
 * Script pour mettre à jour la durée des trades existants qui n'ont pas de tradeDuration
 * Calcule la durée à partir de enteredAt et exitedAt
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
  log: [], // Désactiver les logs de requêtes pour la sécurité
})

async function updateTradeDurations() {
  try {
    console.info("🔍 Recherche des trades sans durée...")

    if (!prisma.trade) {
      console.error("❌ prisma.trade n'est pas disponible")
      console.error("   Le client Prisma doit être régénéré avec: npx prisma generate")
      process.exit(1)
    }

    // Récupérer tous les trades sans durée ou avec durée = 0
    const tradesWithoutDuration = await prisma.trade.findMany({
      where: {
        OR: [
          { tradeDuration: null },
          { tradeDuration: 0 },
        ],
      },
      select: {
        id: true,
        enteredAt: true,
        exitedAt: true,
        tradeDuration: true,
      },
    })

    console.info(`📊 ${tradesWithoutDuration.length} trades trouvés sans durée valide`)

    if (tradesWithoutDuration.length === 0) {
      console.info("✅ Tous les trades ont déjà une durée valide!")
      return
    }

    let updated = 0
    let skipped = 0

    for (const trade of tradesWithoutDuration) {
      if (!trade.enteredAt || !trade.exitedAt) {
        console.warn(`⚠️  Trade ${trade.id} ignoré: dates manquantes`)
        skipped++
        continue
      }

      const durationMs = trade.exitedAt.getTime() - trade.enteredAt.getTime()

      if (durationMs <= 0) {
        console.warn(`⚠️  Trade ${trade.id} ignoré: durée invalide (enteredAt >= exitedAt)`)
        skipped++
        continue
      }

      const durationSeconds = durationMs / 1000

      try {
        await prisma.trade.update({
          where: { id: trade.id },
          data: { tradeDuration: durationSeconds },
        })
        updated++
        if (updated % 100 === 0) {
          console.info(`   ✅ ${updated} trades mis à jour...`)
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la mise à jour du trade ${trade.id}:`, error)
        skipped++
      }
    }

    console.info(`\n✅ Mise à jour terminée:`)
    console.info(`   - ${updated} trades mis à jour`)
    console.info(`   - ${skipped} trades ignorés`)
  } catch (error) {
    console.error("❌ Erreur:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

updateTradeDurations()

