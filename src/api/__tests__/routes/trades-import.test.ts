/**
 * Tests pour l'API d'import de trades
 */

import { POST } from "@/app/api/trades/import/route"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    propfirmAccount: {
      findFirst: jest.fn(),
    },
    pnlEntry: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    trade: {
      create: jest.fn(),
    },
  },
}))

describe("API Routes - Trades Import", () => {
  const mockUserId = "user-123"
  const mockAccountId = "account-123"
  const mockSession = {
    user: {
      id: mockUserId,
    },
  }

  const mockAccount = {
    id: mockAccountId,
    userId: mockUserId,
    name: "Test Account",
    propfirm: "TOPSTEP",
    accountType: "EVAL",
    size: 50000,
    status: "ACTIVE",
  }

  const csvContent = `Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Fees,PnL,Size,Type,TradeDay,TradeDuration,Commissions
42817425,MNQH6,12/18/2025 13:26:13 +01:00,12/18/2025 13:26:46 +01:00,25097.25,25099.25,2.22,12.00,3,Long,12/18/2025 00:00:00 -06:00,32.5,
42817644,MNQH6,12/18/2025 13:29:08 +01:00,12/18/2025 13:29:39 +01:00,25103.00,25098.75,2.22,25.50,3,Short,12/18/2025 00:00:00 -06:00,31.2,`

  beforeEach(() => {
    jest.clearAllMocks()
    const getServerSessionMock = getServerSession as jest.Mock
    getServerSessionMock.mockResolvedValue(mockSession)
    const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
    findFirstMock.mockResolvedValue(mockAccount)
    const pnlFindFirstMock = prisma.pnlEntry.findFirst as jest.Mock
    pnlFindFirstMock.mockResolvedValue(null)
    const pnlCreateMock = prisma.pnlEntry.create as jest.Mock
    pnlCreateMock.mockResolvedValue({
      id: "pnl-entry-1",
      userId: mockUserId,
      accountId: mockAccountId,
      date: new Date("2025-12-18"),
      amount: 33.06,
    })
    const tradeCreateMock = prisma.trade.create as jest.Mock
    tradeCreateMock.mockResolvedValue({
      id: "trade-1",
      tradeId: "42817425",
    })
  })

  describe("POST /api/trades/import", () => {
    it("devrait importer des trades depuis Project X", async () => {
      const request = new Request("http://localhost/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "PROJECT_X",
          accountId: mockAccountId,
          csvContent,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe("Import réussi")
      expect(data.tradesStored).toBe(2)
      expect(prisma.trade.create).toHaveBeenCalledTimes(2)
    })

    it("devrait retourner 401 si non authentifié", async () => {
      const getServerSessionMock = getServerSession as jest.Mock
      getServerSessionMock.mockResolvedValue(null)

      const request = new Request("http://localhost/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "PROJECT_X",
          accountId: mockAccountId,
          csvContent,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe("Non authentifié")
    })

    it("devrait retourner 400 si des paramètres sont manquants", async () => {
      const request = new Request("http://localhost/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "PROJECT_X",
          // accountId manquant
          csvContent,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe("Plateforme, compte et contenu CSV requis")
    })

    it("devrait retourner 404 si le compte n'existe pas", async () => {
      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      findFirstMock.mockResolvedValue(null)

      const request = new Request("http://localhost/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "PROJECT_X",
          accountId: "invalid-account",
          csvContent,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.message).toBe("Compte non trouvé")
    })

    it("devrait mettre à jour une entrée PnL existante si elle existe déjà", async () => {
      const pnlFindFirstMock = prisma.pnlEntry.findFirst as jest.Mock
      pnlFindFirstMock.mockResolvedValue({
        id: "existing-pnl",
        userId: mockUserId,
        accountId: mockAccountId,
        date: new Date("2025-12-18"),
        amount: 100,
      })
      const pnlUpdateMock = prisma.pnlEntry.update as jest.Mock
      pnlUpdateMock.mockResolvedValue({
        id: "existing-pnl",
        amount: 133.06,
      })

      const request = new Request("http://localhost/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "PROJECT_X",
          accountId: mockAccountId,
          csvContent,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(prisma.pnlEntry.update).toHaveBeenCalled()
      expect(prisma.pnlEntry.create).not.toHaveBeenCalled()
      expect(data.skipped).toBe(1)
    })

    it("devrait retourner 400 si le CSV est invalide", async () => {
      const invalidCsv = "Id,ContractName\n"

      const request = new Request("http://localhost/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "PROJECT_X",
          accountId: mockAccountId,
          csvContent: invalidCsv,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toContain("Le fichier CSV ne contient que l'en-tête")
    })
  })
})

