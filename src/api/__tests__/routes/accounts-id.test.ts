/**
 * Tests d'intégration pour les routes API des comptes (GET, PUT, DELETE par ID)
 */

import { GET, PUT, DELETE } from "@/app/api/accounts/[id]/route"
import { prisma } from "@/lib/prisma"

// Mock de NextAuth
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}))

// Mock de Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    propfirmAccount: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import { getServerSession } from "next-auth/next"

describe("API Routes - Accounts by ID", () => {
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
    name: "Mon Compte",
    propfirm: "APEX",
    size: 50000,
    accountType: "EVAL",
    status: "ACTIVE",
    pricePaid: 100,
    linkedEvalId: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    pnlEntries: [],
    withdrawals: [],
    linkedEval: null,
    fundedAccounts: [],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  describe("GET /api/accounts/[id]", () => {
    it("devrait retourner un compte spécifique", async () => {
      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      findFirstMock.mockResolvedValue(mockAccount)

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`)
      const params = Promise.resolve({ id: mockAccountId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockAccount)
      expect(findFirstMock).toHaveBeenCalledWith({
        where: {
          id: mockAccountId,
          userId: mockUserId,
        },
        include: {
          pnlEntries: {
            orderBy: { date: "desc" },
          },
          withdrawals: {
            orderBy: { date: "desc" },
          },
          linkedEval: true,
          fundedAccounts: true,
        },
      })
    })

    it("devrait retourner 404 si le compte n'existe pas", async () => {
      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      findFirstMock.mockResolvedValue(null)

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`)
      const params = Promise.resolve({ id: mockAccountId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.message).toBe("Compte non trouvé")
    })

    it("devrait retourner 401 si l'utilisateur n'est pas authentifié", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`)
      const params = Promise.resolve({ id: mockAccountId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe("Non authentifié")
    })
  })

  describe("PUT /api/accounts/[id]", () => {
    it("devrait mettre à jour le nom d'un compte", async () => {
      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      const updateMock = prisma.propfirmAccount.update as jest.Mock

      findFirstMock.mockResolvedValue(mockAccount)
      updateMock.mockResolvedValue({
        ...mockAccount,
        name: "Nouveau nom",
      })

      const updateData = {
        name: "Nouveau nom",
      }

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
        headers: {
          "Content-Type": "application/json",
        },
      })
      const params = Promise.resolve({ id: mockAccountId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe("Nouveau nom")
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: mockAccountId },
        data: { name: "Nouveau nom" },
      })
    })

    it("devrait mettre à jour le statut d'un compte", async () => {
      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      const updateMock = prisma.propfirmAccount.update as jest.Mock

      findFirstMock.mockResolvedValue(mockAccount)
      updateMock.mockResolvedValue({
        ...mockAccount,
        status: "VALIDATED",
      })

      const updateData = {
        status: "VALIDATED",
      }

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
        headers: {
          "Content-Type": "application/json",
        },
      })
      const params = Promise.resolve({ id: mockAccountId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe("VALIDATED")
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: mockAccountId },
        data: { status: "VALIDATED" },
      })
    })

    it("devrait mettre à jour plusieurs champs à la fois", async () => {
      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      const updateMock = prisma.propfirmAccount.update as jest.Mock

      findFirstMock.mockResolvedValue(mockAccount)
      updateMock.mockResolvedValue({
        ...mockAccount,
        name: "Compte mis à jour",
        status: "VALIDATED",
        size: 100000,
        pricePaid: 200,
      })

      const updateData = {
        name: "Compte mis à jour",
        status: "VALIDATED",
        size: 100000,
        pricePaid: 200,
      }

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
        headers: {
          "Content-Type": "application/json",
        },
      })
      const params = Promise.resolve({ id: mockAccountId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe("Compte mis à jour")
      expect(data.status).toBe("VALIDATED")
      expect(data.size).toBe(100000)
      expect(data.pricePaid).toBe(200)
    })

    it("devrait rejeter une mise à jour avec un statut invalide", async () => {
      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      findFirstMock.mockResolvedValue(mockAccount)

      const updateData = {
        status: "INVALID_STATUS",
      }

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
        headers: {
          "Content-Type": "application/json",
        },
      })
      const params = Promise.resolve({ id: mockAccountId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toContain("Validation échouée")
    })

    it("devrait rejeter une mise à jour avec une taille invalide", async () => {
      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      findFirstMock.mockResolvedValue(mockAccount)

      const updateData = {
        size: -1000,
      }

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
        headers: {
          "Content-Type": "application/json",
        },
      })
      const params = Promise.resolve({ id: mockAccountId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toContain("Validation échouée")
    })

    it("devrait retourner 404 si le compte n'existe pas", async () => {
      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      findFirstMock.mockResolvedValue(null)

      const updateData = {
        name: "Nouveau nom",
      }

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
        headers: {
          "Content-Type": "application/json",
        },
      })
      const params = Promise.resolve({ id: mockAccountId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.message).toBe("Compte non trouvé")
    })

    it("devrait retourner 401 si l'utilisateur n'est pas authentifié", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const updateData = {
        name: "Nouveau nom",
      }

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
        headers: {
          "Content-Type": "application/json",
        },
      })
      const params = Promise.resolve({ id: mockAccountId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe("Non authentifié")
    })
  })

  describe("DELETE /api/accounts/[id]", () => {
    it("devrait supprimer un compte", async () => {
      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      const deleteMock = prisma.propfirmAccount.delete as jest.Mock

      findFirstMock.mockResolvedValue(mockAccount)
      deleteMock.mockResolvedValue(mockAccount)

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`, {
        method: "DELETE",
      })
      const params = Promise.resolve({ id: mockAccountId })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe("Compte supprimé avec succès")
      expect(deleteMock).toHaveBeenCalledWith({
        where: { id: mockAccountId },
      })
    })

    it("devrait retourner 404 si le compte n'existe pas", async () => {
      const findFirstMock = prisma.propfirmAccount.findFirst as jest.Mock
      findFirstMock.mockResolvedValue(null)

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`, {
        method: "DELETE",
      })
      const params = Promise.resolve({ id: mockAccountId })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.message).toBe("Compte non trouvé")
    })

    it("devrait retourner 401 si l'utilisateur n'est pas authentifié", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const request = new Request(`http://localhost/api/accounts/${mockAccountId}`, {
        method: "DELETE",
      })
      const params = Promise.resolve({ id: mockAccountId })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe("Non authentifié")
    })
  })
})
