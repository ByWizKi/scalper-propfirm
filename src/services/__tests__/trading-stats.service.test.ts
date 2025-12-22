/**
 * Tests pour le service de calcul des statistiques de trading
 */

import { calculateTradingStats } from "@/services/trading-stats.service"
import type { Trade } from "@/services/trading-stats.service"

describe("Trading Stats Service", () => {
  describe("calculateTradingStats", () => {
    it("devrait retourner des stats vides si aucun trade", () => {
      const stats = calculateTradingStats([])

      expect(stats.totalTrades).toBe(0)
      expect(stats.tradeWinPercent).toBe(0)
      expect(stats.profitFactor).toBe(0)
    })

    it("devrait calculer le Trade Win % correctement", () => {
      const trades: Trade[] = [
        {
          id: "1",
          pnl: 10,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T10:00:00"),
        },
        {
          id: "2",
          pnl: -5,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T11:00:00"),
        },
        {
          id: "3",
          pnl: 15,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T12:00:00"),
        },
      ]

      const stats = calculateTradingStats(trades)

      // 2 trades gagnants sur 3 = 66.67%
      expect(stats.tradeWinPercent).toBeCloseTo(66.67, 1)
      expect(stats.totalTrades).toBe(3)
    })

    it("devrait calculer Avg Win / Avg Loss correctement", () => {
      const trades: Trade[] = [
        {
          id: "1",
          pnl: 20,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T10:00:00"),
        },
        {
          id: "2",
          pnl: 10,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T11:00:00"),
        },
        {
          id: "3",
          pnl: -10,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T12:00:00"),
        },
      ]

      const stats = calculateTradingStats(trades)

      // Avg Win = (18 + 8) / 2 = 13
      // Avg Loss = 12 (abs(-10 - 2))
      // Ratio = 13 / 12 = 1.08
      expect(stats.avgWin).toBeCloseTo(13, 1)
      expect(stats.avgLoss).toBeCloseTo(12, 1)
      expect(stats.avgWinLossRatio).toBeCloseTo(1.08, 1)
    })

    it("devrait calculer le Profit Factor correctement", () => {
      const trades: Trade[] = [
        {
          id: "1",
          pnl: 30,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T10:00:00"),
        },
        {
          id: "2",
          pnl: 20,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T11:00:00"),
        },
        {
          id: "3",
          pnl: -10,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T12:00:00"),
        },
      ]

      const stats = calculateTradingStats(trades)

      // Total profits = 28 + 18 = 46
      // Total losses = 12
      // Profit Factor = 46 / 12 = 3.83
      expect(stats.profitFactor).toBeCloseTo(3.83, 1)
    })

    it("devrait calculer le Day Win % correctement", () => {
      const trades: Trade[] = [
        {
          id: "1",
          pnl: 10,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T10:00:00"),
        },
        {
          id: "2",
          pnl: 5,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T11:00:00"),
        },
        {
          id: "3",
          pnl: -10,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-19"),
          enteredAt: new Date("2025-12-19T10:00:00"),
        },
      ]

      const stats = calculateTradingStats(trades)

      // Jour 1: PnL net = 8 + 3 = 11 (gagnant)
      // Jour 2: PnL net = -12 (perdant)
      // Day Win % = 1/2 = 50%
      expect(stats.dayWinPercent).toBeCloseTo(50, 1)
    })

    it("devrait calculer le Most Active Day", () => {
      const trades: Trade[] = [
        // Lundi (1 trade)
        {
          id: "1",
          pnl: 10,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-15"), // Lundi
          enteredAt: new Date("2025-12-15T10:00:00"),
        },
        // Mardi (2 trades)
        {
          id: "2",
          pnl: 10,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-16"), // Mardi
          enteredAt: new Date("2025-12-16T10:00:00"),
        },
        {
          id: "3",
          pnl: 10,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-16"), // Mardi
          enteredAt: new Date("2025-12-16T11:00:00"),
        },
      ]

      const stats = calculateTradingStats(trades)

      expect(stats.mostActiveDay).toBe("Mardi")
    })

    it("devrait calculer le total de lots correctement", () => {
      const trades: Trade[] = [
        {
          id: "1",
          pnl: 10,
          fees: 2,
          size: 3,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T10:00:00"),
        },
        {
          id: "2",
          pnl: 5,
          fees: 2,
          size: 2,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T11:00:00"),
        },
      ]

      const stats = calculateTradingStats(trades)

      expect(stats.totalLots).toBe(5) // 3 + 2
    })

    it("devrait calculer la durée moyenne des trades", () => {
      const trades: Trade[] = [
        {
          id: "1",
          pnl: 10,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          tradeDuration: 60,
          enteredAt: new Date("2025-12-18T10:00:00"),
        },
        {
          id: "2",
          pnl: 5,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          tradeDuration: 120,
          enteredAt: new Date("2025-12-18T11:00:00"),
        },
        {
          id: "3",
          pnl: 5,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          tradeDuration: null, // Ignoré
          enteredAt: new Date("2025-12-18T12:00:00"),
        },
      ]

      const stats = calculateTradingStats(trades)

      // Moyenne de 60 et 120 = 90
      expect(stats.averageTradeDuration).toBe(90)
    })

    it("devrait filtrer les trades invalides", () => {
      const trades: Trade[] = [
        {
          id: "1",
          pnl: 10,
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T10:00:00"),
        },
        {
          id: "2",
          pnl: NaN, // Invalide
          fees: 2,
          size: 1,
          tradeDay: new Date("2025-12-18"),
          enteredAt: new Date("2025-12-18T11:00:00"),
        },
        {
          id: "3",
          pnl: 5,
          fees: 2,
          size: 1,
          tradeDay: null as unknown as Date, // Invalide
          enteredAt: new Date("2025-12-18T12:00:00"),
        },
      ]

      // Ne devrait pas lancer d'erreur, mais filtrer les trades invalides
      expect(() => calculateTradingStats(trades)).not.toThrow()
    })
  })
})

