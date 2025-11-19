/**
 * Tests d'intégration pour les routes API des PnL
 */

import { GET, POST } from "@/app/api/pnl/route"
import { prisma } from "@/lib/prisma"

import { getServerSession } from "next-auth/next"

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pnlEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    propfirmAccount: {
      findFirst: jest.fn(),
    },
  },
}))

describe("API Routes - PnL", () => {
  const mockUserId = "user-123"
  const mockSession = {
    user: {
      id: mockUserId,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  describe("GET /api/pnl", () => {
    it("devrait retourner toutes les entrées PnL de l'utilisateur", async () => {
      const mockPnlEntries = [
        {
          id: "pnl-1",
          userId: mockUserId,
          accountId: "account-1",
          date: new Date("2024-01-15"),
          amount: 1500,
          notes: "Journée profitable",
          account: {
            id: "account-1",
            name: "Mon Compte",
          },
        },
      ]

      const findManyMock = prisma.pnlEntry.findMany as jest.Mock
      findManyMock.mockResolvedValue(mockPnlEntries)

      const request = new Request("http://localhost/api/pnl")
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockPnlEntries)
    })

    it("devrait filtrer par accountId si fourni", async () => {
      const accountId = "account-123"
      const mockPnlEntries = [
        {
          id: "pnl-1",
          accountId,
          amount: 1500,
        },
      ]

      const findManyMock = prisma.pnlEntry.findMany as jest.Mock
      findManyMock.mockResolvedValue(mockPnlEntries)

      const request = new Request(`http://localhost/api/pnl?accountId=${accountId}`)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId,
          }),
        })
      )
    })
  })

  describe("POST /api/pnl", () => {
    it("devrait créer une nouvelle entrée PnL", async () => {
      const validPnlData = {
        accountId: "account-123",
        date: "2024-01-15",
        amount: 1500,
        notes: "Journée profitable",
      }

      const mockAccount = {
        id: "account-123",
        userId: mockUserId,
      }

      const mockCreatedPnl = {
        id: "pnl-new",
        userId: mockUserId,
        ...validPnlData,
        account: mockAccount,
      }

      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      const createMock = prisma.pnlEntry.create as jest.Mock
      findFirstMock.mockResolvedValue(mockAccount)
      createMock.mockResolvedValue(mockCreatedPnl)

      const request = new Request("http://localhost/api/pnl", {
        method: "POST",
        body: JSON.stringify(validPnlData),
        headers: {
          "Content-Type": "application/json",
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockCreatedPnl)
    })

    it("devrait rejeter une entrée PnL pour un compte qui n'existe pas", async () => {
      const pnlData = {
        accountId: "non-existent",
        date: "2024-01-15",
        amount: 1500,
      }

      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      findFirstMock.mockResolvedValue(null)

      const request = new Request("http://localhost/api/pnl", {
        method: "POST",
        body: JSON.stringify(pnlData),
        headers: {
          "Content-Type": "application/json",
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.message).toBe("Compte non trouvé")
    })
  })
})
