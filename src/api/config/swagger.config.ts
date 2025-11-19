/**
 * Configuration Swagger/OpenAPI pour la documentation de l'API
 */

import swaggerJsdoc from "swagger-jsdoc"

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PropFirm API",
      version: "1.0.0",
      description:
        "API REST pour la gestion de comptes de trading prop firm. Cette API permet de gérer les comptes, les entrées PnL, les retraits et les statistiques personnalisées.",
      contact: {
        name: "Support API",
        email: "support@propfirm.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
        description: "Serveur de développement",
      },
      {
        url: "https://api.propfirm.com",
        description: "Serveur de production",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Authentification via session NextAuth",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "next-auth.session-token",
          description: "Authentification via cookie de session",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Message d'erreur",
            },
            code: {
              type: "string",
              description: "Code d'erreur (optionnel)",
            },
          },
          required: ["message"],
        },
        Account: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID unique du compte",
            },
            name: {
              type: "string",
              description: "Nom du compte",
            },
            propfirm: {
              type: "string",
              enum: [
                "TOPSTEP",
                "TAKEPROFITTRADER",
                "APEX",
                "BULENOX",
                "PHIDIAS",
                "FTMO",
                "MYFUNDEDFUTURES",
                "OTHER",
              ],
              description: "Type de prop firm",
            },
            size: {
              type: "integer",
              description: "Taille du compte en USD",
            },
            accountType: {
              type: "string",
              enum: ["EVAL", "FUNDED"],
              description: "Type de compte (évaluation ou financé)",
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "VALIDATED", "FAILED", "ARCHIVED"],
              description: "Statut du compte",
            },
            pricePaid: {
              type: "number",
              description: "Prix payé pour le compte",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        PnlEntry: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            accountId: {
              type: "string",
              format: "uuid",
            },
            date: {
              type: "string",
              format: "date",
            },
            amount: {
              type: "number",
              description: "Montant du PnL (peut être négatif)",
            },
            notes: {
              type: "string",
              nullable: true,
            },
          },
        },
        Withdrawal: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            accountId: {
              type: "string",
              format: "uuid",
            },
            date: {
              type: "string",
              format: "date",
            },
            amount: {
              type: "number",
              description: "Montant du retrait (toujours positif)",
            },
            notes: {
              type: "string",
              nullable: true,
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
        cookieAuth: [],
      },
    ],
    tags: [
      {
        name: "Accounts",
        description: "Gestion des comptes prop firm",
      },
      {
        name: "PnL",
        description: "Gestion des entrées Profit & Loss",
      },
      {
        name: "Withdrawals",
        description: "Gestion des retraits",
      },
      {
        name: "Stats",
        description: "Statistiques et analyses",
      },
      {
        name: "Custom Stats",
        description: "Statistiques personnalisées",
      },
      {
        name: "Auth",
        description: "Authentification et gestion des utilisateurs",
      },
    ],
  },
  apis: [
    "./src/app/api/**/*.ts", // Chemin vers les fichiers de routes API
  ],
}

export const swaggerSpec = swaggerJsdoc(options)

