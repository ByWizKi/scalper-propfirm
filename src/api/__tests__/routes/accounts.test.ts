/**
 * Tests d'intégration pour les routes API des comptes
 */

import { GET, POST } from "@/app/api/accounts/route"
import { prisma } from "@/lib/prisma"

// Mock de NextAuth
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}))

// Mock de Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    propfirmAccount: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

import { getServerSession } from "next-auth/next"

describe("API Routes - Accounts", () => {
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

  describe("GET /api/accounts", () => {
    it("devrait retourner la liste des comptes de l'utilisateur", async () => {
      const mockAccounts = [
        {
          id: "account-1",
          userId: mockUserId,
          name: "Compte 1",
          propfirm: "APEX",
          size: 50000,
          accountType: "EVAL",
          status: "ACTIVE",
          pricePaid: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          pnlEntries: [],
          withdrawals: [],
          linkedEval: null,
        },
      ]

      const findManyMock = prisma.propfirmAccount.findMany as jest.Mock
      findManyMock.mockResolvedValue(mockAccounts)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockAccounts)
      expect(findManyMock).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
        },
        include: {
          pnlEntries: true,
          withdrawals: true,
          linkedEval: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    })

    it("devrait retourner 401 si l'utilisateur n'est pas authentifié", async () => {
      getServerSession.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe("Non authentifié")
    })
  })

  describe("POST /api/accounts", () => {
    it("devrait créer un nouveau compte avec des données valides", async () => {
      const validAccountData = {
        name: "Mon Compte",
        propfirm: "APEX",
        size: 50000,
        accountType: "EVAL",
        pricePaid: 100,
      }

      const mockCreatedAccount = {
        id: "new-account-id",
        userId: mockUserId,
        ...validAccountData,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const createMock = prisma.propfirmAccount.create as jest.Mock
      createMock.mockResolvedValue(mockCreatedAccount)

      const request = new Request("http://localhost/api/accounts", {
        method: "POST",
        body: JSON.stringify(validAccountData),
        headers: {
          "Content-Type": "application/json",
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockCreatedAccount)
      expect(createMock).toHaveBeenCalled()
    })

    it("devrait rejeter un compte avec des données invalides", async () => {
      const invalidAccountData = {
        name: "",
        propfirm: "INVALID",
        size: -1000,
      }

      const request = new Request("http://localhost/api/accounts", {
        method: "POST",
        body: JSON.stringify(invalidAccountData),
        headers: {
          "Content-Type": "application/json",
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toContain("Validation échouée")
    })

    it("devrait retourner 401 si l'utilisateur n'est pas authentifié", async () => {
      getServerSession.mockResolvedValue(null)

      const request = new Request("http://localhost/api/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: "Test",
          propfirm: "APEX",
          size: 50000,
          accountType: "EVAL",
          pricePaid: 100,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe("Non authentifié")
    })
  })
})

