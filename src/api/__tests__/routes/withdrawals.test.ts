/**
 * Tests d'intégration pour les routes API des retraits
 */

import { GET, POST } from "@/app/api/withdrawals/route"
import { prisma } from "@/lib/prisma"

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    withdrawal: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    propfirmAccount: {
      findFirst: jest.fn(),
    },
  },
}))

import { getServerSession } from "next-auth/next"

describe("API Routes - Withdrawals", () => {
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

  describe("GET /api/withdrawals", () => {
    it("devrait retourner tous les retraits de l'utilisateur", async () => {
      const mockWithdrawals = [
        {
          id: "withdrawal-1",
          userId: mockUserId,
          accountId: "account-1",
          date: new Date("2024-01-15"),
          amount: 1000,
          notes: "Premier retrait",
          account: {
            id: "account-1",
            name: "Mon Compte",
          },
        },
      ]

      const findManyMock = prisma.withdrawal.findMany as jest.Mock
      findManyMock.mockResolvedValue(mockWithdrawals)

      const request = new Request("http://localhost/api/withdrawals")
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockWithdrawals)
    })

    it("devrait filtrer par accountId si fourni", async () => {
      const accountId = "account-123"
      const findManyMock = prisma.withdrawal.findMany as jest.Mock
      findManyMock.mockResolvedValue([])

      const request = new Request(`http://localhost/api/withdrawals?accountId=${accountId}`)
      await GET(request)

      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId,
          }),
        })
      )
    })
  })

  describe("POST /api/withdrawals", () => {
    it("devrait créer un nouveau retrait", async () => {
      const validWithdrawalData = {
        accountId: "account-123",
        date: "2024-01-15",
        amount: 1000,
        notes: "Premier retrait",
      }

      const mockAccount = {
        id: "account-123",
        userId: mockUserId,
      }

      const mockCreatedWithdrawal = {
        id: "withdrawal-new",
        userId: mockUserId,
        ...validWithdrawalData,
        account: mockAccount,
      }

      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      const createMock = prisma.withdrawal.create as jest.Mock
      findFirstMock.mockResolvedValue(mockAccount)
      createMock.mockResolvedValue(mockCreatedWithdrawal)

      const request = new Request("http://localhost/api/withdrawals", {
        method: "POST",
        body: JSON.stringify(validWithdrawalData),
        headers: {
          "Content-Type": "application/json",
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockCreatedWithdrawal)
    })

    it("devrait rejeter un retrait avec un montant négatif", async () => {
      const invalidWithdrawalData = {
        accountId: "account-123",
        date: "2024-01-15",
        amount: -1000,
      }

      const request = new Request("http://localhost/api/withdrawals", {
        method: "POST",
        body: JSON.stringify(invalidWithdrawalData),
        headers: {
          "Content-Type": "application/json",
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toContain("Validation échouée")
    })

    it("devrait rejeter un retrait pour un compte qui n'existe pas", async () => {
      const withdrawalData = {
        accountId: "non-existent",
        date: "2024-01-15",
        amount: 1000,
      }

      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      findFirstMock.mockResolvedValue(null)

      const request = new Request("http://localhost/api/withdrawals", {
        method: "POST",
        body: JSON.stringify(withdrawalData),
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

