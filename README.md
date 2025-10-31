# 📊 Scalper Propfirm

**Plateforme professionnelle de gestion de comptes de trading propfirm**

Une application Next.js moderne pour gérer et suivre vos comptes propfirm, votre PnL, vos retraits et vos performances.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.0.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## ✨ Fonctionnalités

### 🏦 Gestion des comptes
- Support de plusieurs propfirms (TopStep, TakeProfitTrader, APEX, FTMO, etc.)
- Gestion des comptes d'évaluation et financés
- Suivi du statut et des règles spécifiques par propfirm
- Liaison entre comptes d'évaluation et financés

### 📈 Suivi des performances
- Enregistrement quotidien du PnL
- Calendrier mensuel avec résumés hebdomadaires
- Statistiques détaillées par compte
- Calcul automatique des métriques (ROI, moyenne/jour, meilleur jour)

### 💰 Gestion des retraits
- Système de retraits avec règles spécifiques par propfirm
- Calcul automatique des taxes (20% pour TakeProfitTrader)
- Gestion des cycles de trading (TopStep)
- Conversion USD/EUR pour tous les montants

### 📊 Dashboard
- Vue d'ensemble des comptes et performances
- Calendriers des dépenses et retraits nets
- Statistiques en temps réel
- Interface responsive et moderne

### 🔐 Sécurité
- Authentification sécurisée avec NextAuth.js
- Connexion par pseudo unique
- Changement de mot de passe sécurisé
- Protection des cookies et tokens
- Headers HTTP sécurisés

---

## 🚀 Installation

### Prérequis

- Node.js 20+ et npm
- PostgreSQL 14+
- Git

### Configuration

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/scalper-propfirm.git
cd scalper-propfirm
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Éditez `.env` et remplissez les variables :
```env
DATABASE_URL="postgresql://user:password@localhost:5432/propfirm?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-secret-ici"
NEXT_PUBLIC_APP_NAME="Scalper Propfirm"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

4. **Initialiser la base de données**
```bash
# Générer le client Prisma
npm run db:generate

# Créer et appliquer les migrations
npm run db:migrate

# (Optionnel) Ouvrir Prisma Studio
npm run db:studio
```

5. **Démarrer le serveur de développement**
```bash
npm run dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

---

## 📦 Scripts disponibles

| Commande              | Description                                    |
|-----------------------|------------------------------------------------|
| `npm run dev`         | Démarrer le serveur de développement          |
| `npm run build`       | Créer un build de production                  |
| `npm start`           | Démarrer le serveur de production             |
| `npm run lint`        | Vérifier le code avec ESLint                  |
| `npm run test`        | Exécuter les tests unitaires                  |
| `npm run test:watch`  | Exécuter les tests en mode watch              |
| `npm run test:coverage` | Exécuter les tests avec rapport de couverture |
| `npm run db:generate` | Générer le client Prisma                      |
| `npm run db:push`     | Pousser les changements du schéma vers la DB  |
| `npm run db:migrate`  | Créer et appliquer une migration              |
| `npm run db:studio`   | Ouvrir l'interface Prisma Studio              |

---

## 🏗️ Architecture

### Stack technique

- **Frontend** : Next.js 16, React 18, TypeScript
- **Styling** : Tailwind CSS, Radix UI
- **Backend** : Next.js API Routes
- **Database** : PostgreSQL, Prisma ORM
- **Authentification** : NextAuth.js
- **Tests** : Jest, React Testing Library
- **Qualité de code** : ESLint, Prettier, Husky, Commitlint

### Structure du projet

```
scalper-propfirm/
├── prisma/
│   ├── schema.prisma          # Schéma de base de données
│   └── migrations/            # Migrations Prisma
├── public/
│   ├── icon.svg               # Icône de l'application
│   ├── favicon.svg            # Favicon
│   ├── manifest.json          # Manifest PWA
│   ├── robots.txt             # Robots.txt pour SEO
│   └── sitemap.xml            # Sitemap pour SEO
├── src/
│   ├── app/                   # Pages Next.js (App Router)
│   │   ├── api/               # API Routes
│   │   ├── auth/              # Pages d'authentification
│   │   └── dashboard/         # Pages du dashboard
│   ├── components/            # Composants React
│   │   ├── ui/                # Composants UI de base
│   │   └── ...                # Composants métier
│   ├── hooks/                 # Hooks React personnalisés
│   ├── lib/                   # Utilitaires et configuration
│   │   ├── events/            # Event Bus pour UI réactive
│   │   ├── strategies/        # Stratégies propfirm (Pattern Strategy)
│   │   └── ...                # Autres utilitaires
│   └── types/                 # Types TypeScript
├── .husky/                    # Hooks Git
├── CONTRIBUTING.md            # Guide de contribution
├── DEPLOYMENT.md              # Guide de déploiement
├── SECURITY.md                # Documentation sécurité
└── README.md                  # Ce fichier
```

### Patterns et architecture

- **Event-Driven UI** : Utilisation d'un Event Bus pour les mises à jour réactives
- **Strategy Pattern** : Gestion des règles spécifiques par propfirm
- **Factory Pattern** : Création des instances de stratégies
- **Layered Architecture** : Séparation Repository / Service / Controller
- **Custom Hooks** : Encapsulation de la logique réutilisable

---

## 🧪 Tests

Nous utilisons Jest et React Testing Library pour les tests unitaires.

```bash
# Exécuter tous les tests
npm run test

# Mode watch (utile pendant le développement)
npm run test:watch

# Générer un rapport de couverture
npm run test:coverage
```

Les tests sont organisés par type :
- **Composants UI** : `src/components/__tests__/`
- **Hooks** : `src/hooks/__tests__/`
- **Utilitaires** : `src/lib/__tests__/`

---

## 🌿 Contribution

Nous accueillons les contributions ! Veuillez lire notre [Guide de contribution](CONTRIBUTING.md) pour les détails sur :
- Notre processus Gitflow
- Les conventions de commit (Conventional Commits)
- Les standards de code
- Le processus de Pull Request

### Workflow rapide

```bash
# Créer une branche feature depuis develop
git checkout develop
git checkout -b feature/ma-feature

# Faire vos modifications et commiter (Commitlint validera le message)
git add .
git commit -m "feat(scope): description courte"

# Pousser et créer une Pull Request vers develop
git push origin feature/ma-feature
```

---

## 🔐 Sécurité

L'application implémente plusieurs mesures de sécurité :

- **Mots de passe hashés** avec bcrypt (12 rounds)
- **Cookies sécurisés** : httpOnly, sameSite, secure en production
- **Headers HTTP** : HSTS, X-Frame-Options, CSP, etc.
- **Validation des entrées** : Zod pour la validation côté serveur
- **Tokens JWT** sécurisés pour l'authentification
- **Protection CSRF** intégrée avec NextAuth.js

Pour plus de détails, consultez [SECURITY.md](SECURITY.md).

---

## 📝 Propfirms supportées

| Propfirm           | Comptes d'éval | Comptes financés | Règles spécifiques |
|--------------------|----------------|------------------|--------------------|
| **TopStep**        | ✅             | ✅               | Cycles de 5 jours, 50% de retrait |
| **TakeProfitTrader** | ✅           | ✅               | Buffer, taxe de 20% |
| **APEX**           | ✅             | ✅               | Standard |
| **FTMO**           | ✅             | ✅               | Standard |
| **MyFundedFutures** | ✅            | ✅               | Standard |

---

## 📄 License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- [Next.js](https://nextjs.org/) - Framework React
- [Prisma](https://www.prisma.io/) - ORM moderne
- [NextAuth.js](https://next-auth.js.org/) - Authentification
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [Radix UI](https://www.radix-ui.com/) - Composants UI accessibles

---

## 📞 Support

Pour toute question ou problème :
- Ouvrez une [issue](https://github.com/votre-username/scalper-propfirm/issues)
- Consultez la [documentation](https://github.com/votre-username/scalper-propfirm/wiki)

---

**Développé avec ❤️ par l'équipe Scalper Propfirm**
