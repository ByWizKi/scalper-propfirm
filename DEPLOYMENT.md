# 🚀 Guide de Déploiement - Scalper Propfirm

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Configuration](#configuration)
3. [Sécurité](#sécurité)
4. [Déploiement Vercel](#déploiement-vercel)
5. [Variables d'environnement](#variables-denvironnement)
6. [Post-déploiement](#post-déploiement)

---

## 🔧 Prérequis

- Node.js 18+
- PostgreSQL database (Vercel Postgres, Supabase, Neon, etc.)
- Compte Vercel (recommandé) ou autre plateforme Next.js

---

## ⚙️ Configuration

### 1. Base de données

**Option A : Vercel Postgres** (Recommandé)
```bash
# Dans votre projet Vercel
# Storage → PostgreSQL → Create
```

**Option B : Supabase**
```bash
# Créer un projet sur https://supabase.com
# Récupérer la DATABASE_URL dans Settings → Database
```

**Option C : Neon**
```bash
# Créer un projet sur https://neon.tech
# Récupérer la DATABASE_URL
```

### 2. Générer les secrets

```bash
# Générer NEXTAUTH_SECRET
openssl rand -base64 32

# Alternative si openssl n'est pas disponible
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🔒 Sécurité

### ✅ Checklist de sécurité

- [x] Protection contre les injections SQL (Prisma ORM)
- [x] Validation des entrées (Zod)
- [x] Cookies sécurisés (HttpOnly, Secure, SameSite)
- [x] Headers de sécurité HTTP
- [x] Hashing des mots de passe (bcrypt)
- [x] Rate limiting basique
- [x] CSRF protection (NextAuth)
- [x] XSS protection
- [x] Variables d'environnement sécurisées

### 🔑 Variables sensibles

**CRITIQUE : Ne JAMAIS commit ces valeurs dans Git**

```bash
# ❌ NE PAS FAIRE
DATABASE_URL="postgresql://user:password@localhost..."

# ✅ À FAIRE
DATABASE_URL="${DATABASE_URL}"
```

---

## 🌐 Déploiement Vercel

### Méthode 1 : Via GitHub (Recommandé)

1. **Push votre code sur GitHub**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Importer dans Vercel**
   - Aller sur [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import votre repository GitHub
   - Vercel détecte automatiquement Next.js

3. **Configurer les variables d'environnement**
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_URL=https://votre-domaine.vercel.app
   NEXTAUTH_SECRET=votre-secret-généré
   NODE_ENV=production
   ```

4. **Deploy**
   - Click "Deploy"
   - Attendre le build (~2-3 minutes)

### Méthode 2 : Via CLI

```bash
# Installer Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Configurer les variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
```

---

## 📝 Variables d'environnement

### Production

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"

# NextAuth
NEXTAUTH_URL="https://votre-domaine.com"
NEXTAUTH_SECRET="votre-secret-ultra-securise-32-chars"

# App
NODE_ENV="production"
```

### Staging

```bash
# Database (utiliser une DB séparée)
DATABASE_URL="postgresql://user:password@host:5432/db_staging"

# NextAuth
NEXTAUTH_URL="https://staging.votre-domaine.com"
NEXTAUTH_SECRET="secret-different-du-prod"

# App
NODE_ENV="staging"
```

---

## 🔨 Post-déploiement

### 1. Migrer la base de données

```bash
# Via Vercel CLI
vercel env pull .env.production
npx prisma migrate deploy

# Ou directement sur Vercel
# Settings → Functions → Add Environment Variable
# Puis redéployer
```

### 2. Vérifications

#### ✅ Sécurité
```bash
# Tester les headers
curl -I https://votre-domaine.com

# Devrait afficher :
# - Strict-Transport-Security
# - X-Frame-Options
# - X-Content-Type-Options
# - X-XSS-Protection
```

#### ✅ SEO
```bash
# Vérifier robots.txt
curl https://votre-domaine.com/robots.txt

# Vérifier sitemap
curl https://votre-domaine.com/sitemap.xml

# Vérifier meta tags
curl https://votre-domaine.com | grep "<meta"
```

#### ✅ Performance
```bash
# Google PageSpeed Insights
# https://pagespeed.web.dev/

# Lighthouse CI
npx lighthouse https://votre-domaine.com --view
```

### 3. Configuration DNS (Si domaine personnalisé)

```bash
# Ajouter dans votre registrar de domaine :
Type: CNAME
Name: @
Value: cname.vercel-dns.com

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 4. Configuration SSL

- ✅ **Automatique avec Vercel** (Let's Encrypt)
- Vercel gère automatiquement le renouvellement
- HTTPS forcé par défaut

---

## 🧪 Tests de production

### Test d'authentification
```bash
# 1. Créer un compte
curl -X POST https://votre-domaine.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# 2. Login
curl -X POST https://votre-domaine.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

### Test des API
```bash
# Avec token de session
curl https://votre-domaine.com/api/accounts \
  -H "Cookie: next-auth.session-token=..."
```

---

## 📊 Monitoring

### Vercel Analytics
```bash
# Activé par défaut
# Dashboard → Analytics
```

### Logs
```bash
# Voir les logs en temps réel
vercel logs --follow

# Logs d'une fonction spécifique
vercel logs /api/accounts
```

### Sentry (Optionnel)
```bash
# Installer Sentry
npm install --save @sentry/nextjs

# Suivre la doc : https://docs.sentry.io/platforms/javascript/guides/nextjs/
```

---

## 🔄 CI/CD

### Auto-déploiement

Vercel déploie automatiquement :
- **Production** : Chaque push sur `main`
- **Preview** : Chaque PR GitHub

### Git workflow recommandé

```bash
# Development
git checkout -b feature/nouvelle-fonctionnalite
git commit -m "feat: nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite

# Preview déployé automatiquement sur Vercel
# https://scalper-propfirm-git-feature-xxx.vercel.app

# Merge → Production
git checkout main
git merge feature/nouvelle-fonctionnalite
git push origin main

# Production mise à jour automatiquement
# https://scalper-propfirm.vercel.app
```

---

## 🆘 Troubleshooting

### Erreur : "Module not found"
```bash
# Nettoyer et rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Erreur : "Database connection failed"
```bash
# Vérifier DATABASE_URL
echo $DATABASE_URL

# Tester la connexion
npx prisma db push
```

### Erreur : "Authentication failed"
```bash
# Vérifier NEXTAUTH_SECRET
# Doit être le même dans Vercel et .env

# Régénérer si nécessaire
openssl rand -base64 32
```

---

## 📚 Ressources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Docs](https://vercel.com/docs)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)
- [NextAuth Production](https://next-auth.js.org/deployment)

---

## 🎉 Succès !

Votre application **Scalper Propfirm** est maintenant en production ! 🚀

- 🌐 **URL** : https://votre-domaine.com
- 🔒 **Sécurisée** : Headers HTTP + HTTPS + Cookies sécurisés
- ⚡ **Rapide** : Mise en cache optimisée + CDN Vercel
- 📱 **PWA** : Installable sur mobile
- 🔍 **SEO** : Optimisé pour Google

**Prochaines étapes :**
1. Configurer Google Analytics
2. Ajouter Google Search Console
3. Configurer les backups de la DB
4. Mettre en place un monitoring d'erreurs (Sentry)

