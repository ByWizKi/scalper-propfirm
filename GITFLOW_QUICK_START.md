# 🌿 Gitflow - Guide de démarrage rapide

## 🚀 Initialisation

### Configuration initiale

```bash
# Créer la branche develop si elle n'existe pas
git checkout -b develop

# Pousser les deux branches principales
git push -u origin main
git push -u origin develop
```

## 📋 Workflows courants

### 1️⃣ Développer une nouvelle fonctionnalité

```bash
# 1. Partir de develop
git checkout develop
git pull origin develop

# 2. Créer une branche feature
git checkout -b feature/ma-super-feature

# 3. Développer et commiter (les commits seront validés par commitlint)
git add .
git commit -m "feat(scope): description de la feature"

# 4. Pousser la branche
git push origin feature/ma-super-feature

# 5. Créer une Pull Request sur GitHub vers develop
# Après approbation et merge, supprimer la branche locale
git checkout develop
git pull origin develop
git branch -d feature/ma-super-feature
```

### 2️⃣ Corriger un bug en développement

```bash
# 1. Partir de develop
git checkout develop
git pull origin develop

# 2. Créer une branche bugfix
git checkout -b bugfix/fix-login-issue

# 3. Corriger et commiter
git add .
git commit -m "fix(auth): correct login validation"

# 4. Pousser et créer une PR vers develop
git push origin bugfix/fix-login-issue
```

### 3️⃣ Corriger un bug critique en production (Hotfix)

```bash
# 1. Partir de main
git checkout main
git pull origin main

# 2. Créer une branche hotfix
git checkout -b hotfix/fix-critical-security

# 3. Corriger et commiter
git add .
git commit -m "fix(security): patch XSS vulnerability"

# 4. Pousser et créer une PR vers main
git push origin hotfix/fix-critical-security

# 5. Après merge dans main, créer aussi une PR vers develop
# pour que le fix soit présent dans les futurs développements
```

### 4️⃣ Préparer une release

```bash
# 1. Partir de develop
git checkout develop
git pull origin develop

# 2. Créer une branche release
git checkout -b release/1.1.0

# 3. Mettre à jour la version dans package.json
npm version 1.1.0 --no-git-tag-version

# 4. Faire les derniers ajustements et tests
git add .
git commit -m "chore(release): bump version to 1.1.0"

# 5. Créer une PR vers main
git push origin release/1.1.0

# 6. Après merge dans main, créer un tag
git checkout main
git pull origin main
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin v1.1.0

# 7. Merger aussi dans develop
git checkout develop
git merge main
git push origin develop

# 8. Supprimer la branche release
git branch -d release/1.1.0
git push origin --delete release/1.1.0
```

## 📌 Convention de nommage des branches

| Type      | Format                    | Exemple                      |
|-----------|---------------------------|------------------------------|
| Feature   | `feature/description`     | `feature/add-dark-mode`      |
| Bugfix    | `bugfix/description`      | `bugfix/fix-navbar-mobile`   |
| Hotfix    | `hotfix/description`      | `hotfix/fix-payment-crash`   |
| Release   | `release/version`         | `release/2.0.0`              |

## ✍️ Exemples de commits

```bash
# Nouvelle fonctionnalité
git commit -m "feat(dashboard): add monthly PnL chart"

# Correction de bug
git commit -m "fix(accounts): correct balance calculation"

# Documentation
git commit -m "docs: update README with installation steps"

# Refactoring
git commit -m "refactor(api): simplify authentication logic"

# Tests
git commit -m "test(utils): add currency conversion tests"

# Performance
git commit -m "perf(db): optimize account queries with indexing"
```

## 🔍 Vérifier avant de commiter

```bash
# Vérifier le status
git status

# Voir les différences
git diff

# Linter le code
npm run lint

# Lancer les tests
npm run test

# Tout vérifier d'un coup
npm run lint && npm run test
```

## 🛡️ Protections automatiques

- **Pre-commit hook** : Lint et format automatique du code
- **Commit-msg hook** : Validation du format du message de commit
- Les commits non conformes seront **rejetés automatiquement**

## 💡 Astuces

### Annuler le dernier commit (avant push)
```bash
git reset --soft HEAD~1
```

### Modifier le dernier commit
```bash
git add fichier-oublié
git commit --amend --no-edit
```

### Lister toutes les branches
```bash
# Locales
git branch

# Toutes (locales et remote)
git branch -a
```

### Supprimer une branche distante
```bash
git push origin --delete feature/ma-branche
```

### Mettre à jour develop depuis main
```bash
git checkout develop
git merge main
git push origin develop
```

## 📞 Besoin d'aide ?

Consultez le guide complet dans [CONTRIBUTING.md](CONTRIBUTING.md)

