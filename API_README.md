# PropFirm API Documentation

## Vue d'ensemble

L'API PropFirm est une API REST complète pour la gestion de comptes de trading prop firm. Elle permet de gérer les comptes, les entrées PnL, les retraits et les statistiques personnalisées.

## Base URL

- **Développement**: `http://localhost:3000/api`
- **Production**: `https://api.propfirm.com`

## Authentification

L'API utilise NextAuth pour l'authentification. Deux méthodes sont supportées :

1. **Cookie de session** : Authentification automatique via cookie `next-auth.session-token`
2. **Bearer Token** : Token JWT dans le header `Authorization: Bearer <token>`

### Exemple d'authentification

```bash
# Avec cookie (automatique dans le navigateur)
curl -X GET http://localhost:3000/api/accounts \
  --cookie "next-auth.session-token=your-session-token"

# Avec Bearer Token
curl -X GET http://localhost:3000/api/accounts \
  -H "Authorization: Bearer your-jwt-token"
```

## Documentation Swagger

La documentation interactive Swagger est disponible à :

- **URL**: `/api-docs`
- **Spec JSON**: `/api/docs`

## Endpoints

### Comptes (`/api/accounts`)

#### GET `/api/accounts`

Récupère tous les comptes de l'utilisateur authentifié.

**Réponse 200**:

```json
[
  {
    "id": "uuid",
    "name": "Mon Compte",
    "propfirm": "APEX",
    "size": 50000,
    "accountType": "EVAL",
    "status": "ACTIVE",
    "pricePaid": 100,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

#### POST `/api/accounts`

Crée un nouveau compte.

**Body**:

```json
{
  "name": "Mon Compte",
  "propfirm": "APEX",
  "size": 50000,
  "accountType": "EVAL",
  "status": "ACTIVE",
  "pricePaid": 100,
  "linkedEvalId": "uuid-optional",
  "notes": "Notes optionnelles"
}
```

**Réponse 201**:

```json
{
  "id": "uuid",
  "name": "Mon Compte",
  ...
}
```

#### GET `/api/accounts/{id}`

Récupère un compte spécifique.

#### PUT `/api/accounts/{id}`

Met à jour un compte.

#### DELETE `/api/accounts/{id}`

Supprime un compte.

### PnL (`/api/pnl`)

#### GET `/api/pnl`

Récupère toutes les entrées PnL de l'utilisateur.

**Query Parameters**:

- `accountId` (optionnel): Filtrer par compte

#### POST `/api/pnl`

Crée une nouvelle entrée PnL.

**Body**:

```json
{
  "accountId": "uuid",
  "date": "2024-01-15",
  "amount": 1500.5,
  "notes": "Journée profitable"
}
```

### Retraits (`/api/withdrawals`)

#### GET `/api/withdrawals`

Récupère tous les retraits de l'utilisateur.

#### POST `/api/withdrawals`

Crée un nouveau retrait.

**Body**:

```json
{
  "accountId": "uuid",
  "date": "2024-01-15",
  "amount": 1000,
  "notes": "Premier retrait"
}
```

### Statistiques (`/api/stats`)

#### GET `/api/stats`

Récupère les statistiques globales de l'utilisateur.

**Réponse 200**:

```json
{
  "totalAccounts": 10,
  "activeAccounts": 8,
  "totalPnl": 50000,
  "totalWithdrawals": 20000,
  "netProfit": 30000,
  "globalRoi": 150.5,
  ...
}
```

### Statistiques personnalisées (`/api/custom-stats`)

#### GET `/api/custom-stats`

Récupère toutes les statistiques personnalisées.

#### POST `/api/custom-stats`

Crée une nouvelle statistique personnalisée.

## Codes de statut HTTP

- `200` : Succès
- `201` : Créé avec succès
- `400` : Requête invalide (validation échouée)
- `401` : Non authentifié
- `404` : Ressource non trouvée
- `500` : Erreur serveur

## Gestion des erreurs

Toutes les erreurs suivent le format standard :

```json
{
  "message": "Description de l'erreur",
  "code": "ERROR_CODE" // Optionnel
}
```

## Validation

Toutes les entrées sont validées avec Zod. Les erreurs de validation retournent un code 400 avec les détails :

```json
{
  "message": "Validation échouée: Le nom est requis, La taille doit être positive"
}
```

## Types de données

### PropfirmType

- `TOPSTEP`
- `TAKEPROFITTRADER`
- `APEX`
- `BULENOX`
- `PHIDIAS`
- `FTMO`
- `MYFUNDEDFUTURES`
- `OTHER`

### AccountType

- `EVAL` : Compte d'évaluation
- `FUNDED` : Compte financé

### AccountStatus

- `ACTIVE` : Actif
- `VALIDATED` : Validé
- `FAILED` : Échoué
- `ARCHIVED` : Archivé

## Tests

Les tests d'intégration sont disponibles dans `src/api/__tests__/routes/`.

Pour exécuter les tests :

```bash
npm test
```

## Structure de l'API

```
src/
├── api/
│   ├── middleware/        # Middlewares réutilisables
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── config/            # Configuration
│   │   └── swagger.config.ts
│   └── __tests__/         # Tests d'intégration
│       └── routes/
├── app/
│   └── api/               # Routes API Next.js
│       ├── accounts/
│       ├── pnl/
│       ├── withdrawals/
│       └── docs/          # Documentation Swagger
└── lib/                   # Utilitaires partagés
    └── validation.ts      # Schémas Zod
```

## Utilisation avec un autre front-end

L'API est complètement indépendante et peut être utilisée avec n'importe quel front-end :

1. **Authentification** : Utilisez NextAuth ou implémentez votre propre système d'authentification
2. **CORS** : Configurez CORS dans `next.config.ts` si nécessaire
3. **Base URL** : Pointez vers l'URL de l'API déployée

### Exemple avec React

```typescript
const API_BASE_URL = "https://api.propfirm.com/api"

async function getAccounts() {
  const response = await fetch(`${API_BASE_URL}/accounts`, {
    credentials: "include", // Pour les cookies
    headers: {
      Authorization: `Bearer ${token}`, // Ou utilisez les cookies
    },
  })
  return response.json()
}
```

## Déploiement

L'API peut être déployée indépendamment en tant que service Next.js :

```bash
# Build
npm run build

# Start
npm start
```

## Support

Pour toute question ou problème, consultez la documentation Swagger interactive à `/api-docs`.
