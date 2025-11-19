/**
 * Tests pour les schémas de validation Zod
 */

import {
  createAccountSchema,
  updateAccountSchema,
  createPnlSchema,
  createWithdrawalSchema,
  changePasswordSchema,
  createCustomStatSchema,
  reorderCustomStatsSchema,
  bulkCreateAccountSchema,
  validateApiRequest,
  idSchema,
} from "../validation"

describe("Validation Zod - Comptes", () => {
  describe("createAccountSchema", () => {
    it("devrait valider un compte valide", () => {
      const validAccount = {
        name: "Mon Compte",
        propfirm: "APEX",
        size: 50000,
        accountType: "EVAL",
        status: "ACTIVE",
        pricePaid: 100,
        notes: "Notes du compte",
      }

      const result = createAccountSchema.safeParse(validAccount)
      expect(result.success).toBe(true)
    })

    it("devrait rejeter un compte sans nom", () => {
      const invalidAccount = {
        propfirm: "APEX",
        size: 50000,
        accountType: "EVAL",
        pricePaid: 100,
      }

      const result = createAccountSchema.safeParse(invalidAccount)
      expect(result.success).toBe(false)
    })

    it("devrait rejeter une propfirm invalide", () => {
      const invalidAccount = {
        name: "Mon Compte",
        propfirm: "INVALID",
        size: 50000,
        accountType: "EVAL",
        pricePaid: 100,
      }

      const result = createAccountSchema.safeParse(invalidAccount)
      expect(result.success).toBe(false)
    })

    it("devrait accepter toutes les propfirms valides", () => {
      const propfirms = [
        "TOPSTEP",
        "TAKEPROFITTRADER",
        "APEX",
        "BULENOX",
        "PHIDIAS",
        "FTMO",
        "MYFUNDEDFUTURES",
        "OTHER",
      ]

      propfirms.forEach((propfirm) => {
        const account = {
          name: "Mon Compte",
          propfirm,
          size: 50000,
          accountType: "EVAL",
          pricePaid: 100,
        }

        const result = createAccountSchema.safeParse(account)
        expect(result.success).toBe(true)
      })
    })

    it("devrait rejeter une taille négative", () => {
      const invalidAccount = {
        name: "Mon Compte",
        propfirm: "APEX",
        size: -1000,
        accountType: "EVAL",
        pricePaid: 100,
      }

      const result = createAccountSchema.safeParse(invalidAccount)
      expect(result.success).toBe(false)
    })
  })

  describe("bulkCreateAccountSchema", () => {
    it("devrait valider une liste de comptes valides", () => {
      const validBulk = {
        accounts: [
          {
            name: "Compte 1",
            propfirm: "APEX",
            size: 50000,
            accountType: "EVAL",
            pricePaid: 100,
          },
          {
            name: "Compte 2",
            propfirm: "TOPSTEP",
            size: 100000,
            accountType: "FUNDED",
            pricePaid: 200,
          },
        ],
      }

      const result = bulkCreateAccountSchema.safeParse(validBulk)
      expect(result.success).toBe(true)
    })

    it("devrait rejeter une liste vide", () => {
      const invalidBulk = {
        accounts: [],
      }

      const result = bulkCreateAccountSchema.safeParse(invalidBulk)
      expect(result.success).toBe(false)
    })

    it("devrait rejeter plus de 100 comptes", () => {
      const invalidBulk = {
        accounts: Array(101).fill({
          name: "Compte",
          propfirm: "APEX",
          size: 50000,
          accountType: "EVAL",
          pricePaid: 100,
        }),
      }

      const result = bulkCreateAccountSchema.safeParse(invalidBulk)
      expect(result.success).toBe(false)
    })
  })
})

describe("Validation Zod - PnL", () => {
  describe("createPnlSchema", () => {
    it("devrait valider une entrée PnL valide", () => {
      const validPnl = {
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        date: "2024-01-15",
        amount: 1500.5,
        notes: "Journée profitable",
      }

      const result = createPnlSchema.safeParse(validPnl)
      expect(result.success).toBe(true)
    })

    it("devrait rejeter un montant trop élevé", () => {
      const invalidPnl = {
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        date: "2024-01-15",
        amount: 2000000,
      }

      const result = createPnlSchema.safeParse(invalidPnl)
      expect(result.success).toBe(false)
    })

    it("devrait accepter un montant négatif (perte)", () => {
      const validPnl = {
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        date: "2024-01-15",
        amount: -500,
      }

      const result = createPnlSchema.safeParse(validPnl)
      expect(result.success).toBe(true)
    })
  })
})

describe("Validation Zod - Retraits", () => {
  describe("createWithdrawalSchema", () => {
    it("devrait valider un retrait valide", () => {
      const validWithdrawal = {
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        date: "2024-01-15",
        amount: 1000,
      }

      const result = createWithdrawalSchema.safeParse(validWithdrawal)
      expect(result.success).toBe(true)
    })

    it("devrait rejeter un montant négatif", () => {
      const invalidWithdrawal = {
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        date: "2024-01-15",
        amount: -1000,
      }

      const result = createWithdrawalSchema.safeParse(invalidWithdrawal)
      expect(result.success).toBe(false)
    })

    it("devrait rejeter un montant nul", () => {
      const invalidWithdrawal = {
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        date: "2024-01-15",
        amount: 0,
      }

      const result = createWithdrawalSchema.safeParse(invalidWithdrawal)
      expect(result.success).toBe(false)
    })
  })
})

describe("Validation Zod - Changement de mot de passe", () => {
  describe("changePasswordSchema", () => {
    it("devrait valider un changement de mot de passe valide", () => {
      const validPassword = {
        currentPassword: "AncienMotDePasse123",
        newPassword: "NouveauMotDePasse456",
      }

      const result = changePasswordSchema.safeParse(validPassword)
      expect(result.success).toBe(true)
    })

    it("devrait rejeter un mot de passe trop court", () => {
      const invalidPassword = {
        currentPassword: "Ancien123",
        newPassword: "Court1",
      }

      const result = changePasswordSchema.safeParse(invalidPassword)
      expect(result.success).toBe(false)
    })

    it("devrait rejeter un mot de passe sans majuscule", () => {
      const invalidPassword = {
        currentPassword: "ancien123",
        newPassword: "nouveau123",
      }

      const result = changePasswordSchema.safeParse(invalidPassword)
      expect(result.success).toBe(false)
    })

    it("devrait rejeter un mot de passe sans chiffre", () => {
      const invalidPassword = {
        currentPassword: "AncienMot",
        newPassword: "NouveauMot",
      }

      const result = changePasswordSchema.safeParse(invalidPassword)
      expect(result.success).toBe(false)
    })
  })
})

describe("Validation Zod - Statistiques personnalisées", () => {
  describe("createCustomStatSchema", () => {
    it("devrait valider une statistique personnalisée valide", () => {
      const validStat = {
        title: "Mon Stat",
        description: "Description",
        formula: "totalPnl / totalAccounts",
        icon: "trending-up",
        variant: "success",
        enabled: true,
        order: 0,
      }

      const result = createCustomStatSchema.safeParse(validStat)
      expect(result.success).toBe(true)
    })

    it("devrait rejeter une statistique sans titre", () => {
      const invalidStat = {
        formula: "totalPnl / totalAccounts",
      }

      const result = createCustomStatSchema.safeParse(invalidStat)
      expect(result.success).toBe(false)
    })

    it("devrait rejeter une statistique sans formule", () => {
      const invalidStat = {
        title: "Mon Stat",
      }

      const result = createCustomStatSchema.safeParse(invalidStat)
      expect(result.success).toBe(false)
    })
  })

  describe("reorderCustomStatsSchema", () => {
    it("devrait valider un réordonnancement valide", () => {
      const validReorder = {
        orders: [
          { id: "123e4567-e89b-12d3-a456-426614174000", order: 0 },
          { id: "223e4567-e89b-12d3-a456-426614174000", order: 1 },
        ],
      }

      const result = reorderCustomStatsSchema.safeParse(validReorder)
      expect(result.success).toBe(true)
    })

    it("devrait rejeter une liste vide", () => {
      const invalidReorder = {
        orders: [],
      }

      const result = reorderCustomStatsSchema.safeParse(invalidReorder)
      expect(result.success).toBe(false)
    })

    it("devrait rejeter un ordre négatif", () => {
      const invalidReorder = {
        orders: [{ id: "123e4567-e89b-12d3-a456-426614174000", order: -1 }],
      }

      const result = reorderCustomStatsSchema.safeParse(invalidReorder)
      expect(result.success).toBe(false)
    })
  })
})

describe("validateApiRequest", () => {
  it("devrait retourner success: true pour des données valides", () => {
    const schema = createAccountSchema
    const data = {
      name: "Mon Compte",
      propfirm: "APEX",
      size: 50000,
      accountType: "EVAL",
      pricePaid: 100,
    }

    const result = validateApiRequest(schema, data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(data)
    }
  })

  it("devrait retourner success: false avec un message d'erreur pour des données invalides", () => {
    const schema = createAccountSchema
    const data = {
      name: "",
      propfirm: "INVALID",
      size: -1000,
    }

    const result = validateApiRequest(schema, data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain("Validation échouée")
      expect(result.status).toBe(400)
    }
  })
})

describe("Validation Zod - IDs", () => {
  describe("idSchema", () => {
    it("devrait accepter un UUID valide", () => {
      const validUUID = "123e4567-e89b-12d3-a456-426614174000"
      const result = idSchema.safeParse(validUUID)
      expect(result.success).toBe(true)
    })

    it("devrait accepter un CUID valide (format Prisma)", () => {
      const validCUID = "clxxxxxxxxxxxxxxxxxxxxx"
      const result = idSchema.safeParse(validCUID)
      expect(result.success).toBe(true)
    })

    it("devrait accepter un CUID réel de Prisma", () => {
      // Format typique d'un CUID Prisma
      const validCUID = "clp1234567890abcdefghij"
      const result = idSchema.safeParse(validCUID)
      expect(result.success).toBe(true)
    })

    it("devrait accepter un ID alphanumérique simple", () => {
      const simpleId = "abc123xyz"
      const result = idSchema.safeParse(simpleId)
      expect(result.success).toBe(true)
    })

    it("devrait rejeter une chaîne vide", () => {
      const emptyId = ""
      const result = idSchema.safeParse(emptyId)
      expect(result.success).toBe(false)
    })

    it("devrait rejeter un ID avec des caractères dangereux", () => {
      const dangerousId = "clp123'; DROP TABLE users;--"
      const result = idSchema.safeParse(dangerousId)
      expect(result.success).toBe(false)
    })

    it("devrait rejeter un ID trop long", () => {
      const longId = "a".repeat(101)
      const result = idSchema.safeParse(longId)
      expect(result.success).toBe(false)
    })
  })
})

