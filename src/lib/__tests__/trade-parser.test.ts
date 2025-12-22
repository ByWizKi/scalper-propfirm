/**
 * Tests pour le parser de trades CSV
 */

import {
  parseProjectXCsv,
  parseTradovateCsv,
  groupTradesByDay,
  type ParsedTrade,
} from "@/lib/parsers/trade-parser"

describe("Trade Parser", () => {
  describe("parseProjectXCsv", () => {
    it("devrait parser un fichier CSV Project X valide", () => {
      const csvContent = `Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Fees,PnL,Size,Type,TradeDay,TradeDuration,Commissions
42817425,MNQH6,12/18/2025 13:26:13 +01:00,12/18/2025 13:26:46 +01:00,25097.25,25099.25,2.22,12.00,3,Long,12/18/2025 00:00:00 -06:00,32.5,
42817644,MNQH6,12/18/2025 13:29:08 +01:00,12/18/2025 13:29:39 +01:00,25103.00,25098.75,2.22,25.50,3,Short,12/18/2025 00:00:00 -06:00,31.2,`

      const trades = parseProjectXCsv(csvContent)

      expect(trades).toHaveLength(2)
      expect(trades[0].id).toBe("42817425")
      expect(trades[0].contractName).toBe("MNQH6")
      expect(trades[0].pnl).toBe(12.0)
      expect(trades[0].fees).toBe(2.22)
      expect(trades[1].pnl).toBe(25.5)
      expect(trades[1].fees).toBe(2.22)
    })

    it("devrait gérer les retours à la ligne Windows (\\r\\n)", () => {
      const csvContent = "Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Fees,PnL,Size,Type,TradeDay,TradeDuration,Commissions\r\n42817425,MNQH6,12/18/2025 13:26:13 +01:00,12/18/2025 13:26:46 +01:00,25097.25,25099.25,2.22,12.00,3,Long,12/18/2025 00:00:00 -06:00,32.5,"

      const trades = parseProjectXCsv(csvContent)

      expect(trades).toHaveLength(1)
      expect(trades[0].id).toBe("42817425")
    })

    it("devrait lancer une erreur si le fichier ne contient que l'en-tête", () => {
      const csvContent = "Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Fees,PnL,Size,Type,TradeDay,TradeDuration,Commissions"

      expect(() => parseProjectXCsv(csvContent)).toThrow("Le fichier CSV ne contient que l'en-tête")
    })

    it("devrait lancer une erreur si une colonne requise est manquante", () => {
      const csvContent = `Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Fees,PnL,Size,Type
42817425,MNQH6,12/18/2025 13:26:13 +01:00,12/18/2025 13:26:46 +01:00,25097.25,25099.25,2.22,12.00,3,Long`

      expect(() => parseProjectXCsv(csvContent)).toThrow("Colonne requise manquante: TradeDay")
    })

    it("devrait ignorer les lignes vides", () => {
      const csvContent = `Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Fees,PnL,Size,Type,TradeDay,TradeDuration,Commissions
42817425,MNQH6,12/18/2025 13:26:13 +01:00,12/18/2025 13:26:46 +01:00,25097.25,25099.25,2.22,12.00,3,Long,12/18/2025 00:00:00 -06:00,32.5,

42817644,MNQH6,12/18/2025 13:29:08 +01:00,12/18/2025 13:29:39 +01:00,25103.00,25098.75,2.22,25.50,3,Short,12/18/2025 00:00:00 -06:00,31.2,`

      const trades = parseProjectXCsv(csvContent)

      expect(trades).toHaveLength(2)
    })
  })

  describe("groupTradesByDay", () => {
    it("devrait grouper les trades par jour", () => {
      const trades: ParsedTrade[] = [
        {
          id: "1",
          contractName: "MNQH6",
          enteredAt: new Date("2025-12-18T13:26:13"),
          exitedAt: new Date("2025-12-18T13:26:46"),
          entryPrice: 25097.25,
          exitPrice: 25099.25,
          fees: 2.22,
          pnl: 12.0,
          size: 3,
          type: "Long",
          tradeDay: new Date("2025-12-18"),
          tradeDuration: 32.5,
        },
        {
          id: "2",
          contractName: "MNQH6",
          enteredAt: new Date("2025-12-18T13:29:08"),
          exitedAt: new Date("2025-12-18T13:29:39"),
          entryPrice: 25103.0,
          exitPrice: 25098.75,
          fees: 2.22,
          pnl: 25.5,
          size: 3,
          type: "Short",
          tradeDay: new Date("2025-12-18"),
          tradeDuration: 31.2,
        },
        {
          id: "3",
          contractName: "ES",
          enteredAt: new Date("2025-12-19T10:00:00"),
          exitedAt: new Date("2025-12-19T10:30:00"),
          entryPrice: 4500.0,
          exitPrice: 4510.0,
          fees: 2.5,
          pnl: 10.0,
          size: 1,
          type: "Long",
          tradeDay: new Date("2025-12-19"),
        },
      ]

      const dailySummary = groupTradesByDay(trades)

      expect(dailySummary).toHaveLength(2)
      expect(dailySummary[0].date).toBe("2025-12-18")
      expect(dailySummary[0].totalPnl).toBe(33.06) // (12.0 + 25.5) - (2.22 + 2.22) = 33.06
      expect(dailySummary[0].tradeCount).toBe(2)
      expect(dailySummary[1].date).toBe("2025-12-19")
      expect(dailySummary[1].totalPnl).toBe(7.5) // 10.0 - 2.5 = 7.5
      expect(dailySummary[1].tradeCount).toBe(1)
    })

    it("devrait soustraire les fees et commissions du PnL net", () => {
      const trades: ParsedTrade[] = [
        {
          id: "1",
          contractName: "MNQH6",
          enteredAt: new Date("2025-12-18T13:26:13"),
          exitedAt: new Date("2025-12-18T13:26:46"),
          entryPrice: 25097.25,
          exitPrice: 25099.25,
          fees: 2.22,
          pnl: 12.0,
          size: 3,
          type: "Long",
          tradeDay: new Date("2025-12-18"),
          commissions: 1.0,
        },
      ]

      const dailySummary = groupTradesByDay(trades)

      expect(dailySummary[0].totalPnl).toBe(8.78) // 12.0 - 2.22 - 1.0 = 8.78
      expect(dailySummary[0].totalFees).toBe(2.22)
      expect(dailySummary[0].totalCommissions).toBe(1.0)
    })
  })
})

