/**
 * Tests pour l'API de statistiques de trading
 */

import { GET } from "@/app/api/accounts/[id]/trades/stats/route"
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
    trade: {
      findMany: jest.fn(),
    },
  },
}))

describe("API Routes - Trades Stats", () => {
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

  const mockTrades = [
    {
      id: "trade-1",
      userId: mockUserId,
      accountId: mockAccountId,
      pnlEntryId: "pnl-1",
      platform: "PROJECT_X",
      tradeId: "42817425",
      contractName: "MNQH6",
      enteredAt: new Date("2025-12-18T13:26:13"),
      exitedAt: new Date("2025-12-18T13:26:46"),
      entryPrice: 25097.25,
      exitPrice: 25099.25,
      size: 3,
      type: "Long",
      pnl: 12.0,
      fees: 2.22,
      commissions: null,
      tradeDay: new Date("2025-12-18"),
      tradeDuration: 32.5,
    },
    {
      id: "trade-2",
      userId: mockUserId,
      accountId: mockAccountId,
      pnlEntryId: "pnl-1",
      platform: "PROJECT_X",
      tradeId: "42817644",
      contractName: "MNQH6",
      enteredAt: new Date("2025-12-18T13:29:08"),
      exitedAt: new Date("2025-12-18T13:29:39"),
      entryPrice: 25103.0,
      exitPrice: 25098.75,
      size: 3,
      type: "Short",
      pnl: 25.5,
      fees: 2.22,
      commissions: null,
      tradeDay: new Date("2025-12-18"),
      tradeDuration: 31.2,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    const getServerSessionMock = getServerSession as jest.Mock
    getServerSessionMock.mockResolvedValue(mockSession)
    const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
    findFirstMock.mockResolvedValue(mockAccount)
    const findManyMock = prisma.trade.findMany as jest.Mock
    findManyMock.mockResolvedValue(mockTrades)
  })

  describe("GET /api/accounts/[id]/trades/stats", () => {
    it("devrait retourner les statistiques de trading", async () => {
      const request = new Request(`http://localhost/api/accounts/${mockAccountId}/trades/stats`)
      const params = Promise.resolve({ id: mockAccountId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasTrades).toBe(true)
      expect(data.totalTrades).toBe(2)
      expect(data.stats).toBeDefined()
      expect(data.stats.totalTrades).toBe(2)
      expect(data.stats.tradeWinPercent).toBeGreaterThan(0)
    })

    it("devrait retourner 401 si non authentifié", async () => {
      const getServerSessionMock = getServerSession as jest.Mock
      getServerSessionMock.mockResolvedValue(null)

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}/trades/stats`)
      const params = Promise.resolve({ id: mockAccountId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe("Non authentifié")
    })

    it("devrait retourner 404 si le compte n'existe pas", async () => {
      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      findFirstMock.mockResolvedValue(null)

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}/trades/stats`)
      const params = Promise.resolve({ id: mockAccountId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.message).toBe("Compte non trouvé")
    })

    it("devrait retourner des stats vides si aucun trade", async () => {
      const findManyMock = prisma.trade.findMany as jest.Mock
      findManyMock.mockResolvedValue([])

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}/trades/stats`)
      const params = Promise.resolve({ id: mockAccountId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasTrades).toBe(false)
      expect(data.totalTrades).toBe(0)
      expect(data.stats.totalTrades).toBe(0)
    })

    it("devrait gérer l'erreur si prisma.trade n'est pas disponible", async () => {
      // Simuler que prisma.trade est undefined
      ;(prisma as unknown as { trade?: unknown }).trade = undefined

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}/trades/stats`)
      const params = Promise.resolve({ id: mockAccountId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("PRISMA_CLIENT_NOT_UPDATED")
    })
  })
})

