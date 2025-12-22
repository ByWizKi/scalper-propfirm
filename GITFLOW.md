# GitFlow Workflow

Ce projet utilise GitFlow pour gérer les branches et les déploiements en production.

## 📋 Structure des branches

- **`main`** : Branche de production (protégée, ne peut pas être pushée directement)
- **`develop`** : Branche de développement principale
- **`feature/*`** : Nouvelles fonctionnalités
- **`release/*`** : Préparation des releases pour production
- **`hotfix/*`** : Corrections urgentes en production

## 🚀 Workflow

### Développement d'une nouvelle fonctionnalité

```bash
# Créer une branche feature depuis develop
git checkout develop
git pull origin develop
git checkout -b feature/ma-fonctionnalite

# Développer...
git add .
git commit -m "feat: ajout de ma fonctionnalité"

# Push la branche
git push origin feature/ma-fonctionnalite

# Créer une Pull Request vers develop sur GitHub
```

### Créer une release pour production

```bash
# Option 1: Utiliser le script (recommandé)
npm run gitflow:release 1.2.0

# Option 2: Manuellement
git checkout develop
git pull origin develop
git checkout -b release/1.2.0

# Finaliser la release (tests, documentation, etc.)
npm run build
npm run test

# Merge dans main
git checkout main
git merge release/1.2.0
git tag -a v1.2.0 -m "Release 1.2.0"

# Merge dans develop
git checkout develop
git merge release/1.2.0

# Supprimer la branche release
git branch -d release/1.2.0

# Push tout
git push origin main
git push origin develop
git push origin v1.2.0
```

### Créer un hotfix pour production

```bash
# Option 1: Utiliser le script (recommandé)
npm run gitflow:hotfix 1.2.1

# Option 2: Manuellement
git checkout main
git pull origin main
git checkout -b hotfix/1.2.1

# Corriger le bug
git add .
git commit -m "fix: correction du bug critique"

# Merge dans main
git checkout main
git merge hotfix/1.2.1
git tag -a v1.2.1 -m "Hotfix 1.2.1"

# Merge dans develop
git checkout develop
git merge hotfix/1.2.1

# Supprimer la branche hotfix
git branch -d hotfix/1.2.1

# Push tout
git push origin main
git push origin develop
git push origin v1.2.1
```

## 🔒 Protection de la branche main

La branche `main` est protégée :
- ❌ Vous ne pouvez **pas** push directement sur `main`
- ✅ Utilisez une branche `release/*` ou `hotfix/*`
- ✅ Ou créez une Pull Request depuis `develop` vers `main`

## 📝 Convention de commits

Utilisez les préfixes suivants :
- `feat:` : Nouvelle fonctionnalité
- `fix:` : Correction de bug
- `docs:` : Documentation
- `style:` : Formatage, point-virgule manquant, etc.
- `refactor:` : Refactoring du code
- `test:` : Ajout de tests
- `chore:` : Maintenance (dépendances, config, etc.)

## 🛠️ Scripts disponibles

- `npm run gitflow:release <version>` : Créer une release
- `npm run gitflow:hotfix <version>` : Créer un hotfix

## ⚠️ Important

- Toujours partir de `develop` pour les features
- Toujours partir de `main` pour les hotfixes
- Toujours tester avant de merge dans `main`
- Toujours tagger les versions dans `main`
- Toujours merge dans `develop` après un hotfix

