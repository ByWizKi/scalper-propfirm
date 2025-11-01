# Configuration ESLint Stricte

## ✅ Configuration mise en place

### 1. Scripts NPM ajoutés

```json
"lint": "eslint .",           // Lint basique
"lint:fix": "eslint . --fix", // Lint avec auto-fix
"lint:strict": "eslint . --max-warnings 0" // Lint strict (0 warnings tolérés)
```

### 2. Hooks Git configurés

#### Pre-commit (`.husky/pre-commit`)
- Exécute `lint-staged` sur les fichiers modifiés
- Fix automatique des erreurs ESLint avec `--fix`
- Format avec Prettier
- **Bloque le commit si des erreurs persistent**

#### Pre-push (`.husky/pre-push`)
- Exécute `npm run lint:strict` sur tout le projet
- **Bloque le push si des erreurs ou warnings existent**

### 3. Configuration ESLint (`eslint.config.mjs`)

#### Règles TypeScript strictes
- `@typescript-eslint/no-explicit-any`: **error** - Interdit l'usage de `any`
- `@typescript-eslint/no-unused-vars`: **error** - Variables non utilisées (sauf si préfixées par `_`)

#### Règles React strictes
- `react/no-unescaped-entities`: **error** - Caractères non échappés (', ", etc.)
- `react/jsx-key`: **error** - Clé manquante dans les listes
- `react-hooks/rules-of-hooks`: **error** - Règles des Hooks React
- `react-hooks/exhaustive-deps`: **warn** - Dépendances manquantes dans useEffect

#### Règles générales
- `no-console`: **warn** (autorisé: `console.warn`, `console.error`, `console.info`)
- `prefer-const`: **error** - Préférer const à let quand possible
- `no-var`: **error** - Interdit l'usage de var
- `eqeqeq`: **error** - Forcer === au lieu de ==

### 4. Lint-staged (`.lintstagedrc.js`)

Pour les fichiers TS/TSX/JS/JSX modifiés :
1. `eslint --fix --max-warnings 0` - Lint et fix automatique
2. `prettier --write` - Format du code

## 🐛 Erreurs actuelles à corriger

### Résumé des erreurs
```
Total: ~30 erreurs
- @typescript-eslint/no-explicit-any: 5 erreurs
- @typescript-eslint/no-unused-vars: 12 erreurs
- react/no-unescaped-entities: 3 erreurs
- react-hooks/rules-of-hooks: 4 erreurs
- react-hooks/exhaustive-deps: 2 warnings
```

### Corrections prioritaires

#### 1. Remplacer `any` par des types précis
```typescript
// ❌ Avant
const handleEdit = (account: any) => { ... }

// ✅ Après
const handleEdit = (account: PropfirmAccount) => { ... }
```

#### 2. Supprimer variables non utilisées ou les préfixer par `_`
```typescript
// ❌ Avant
catch (error) { ... }

// ✅ Après
catch (_error) { ... }  // Si non utilisé
// OU
catch (error) {
  console.error(error)  // Si utilisé
}
```

#### 3. Échapper les apostrophes
```typescript
// ❌ Avant
<p>Aucun retrait pour le moment</p>

// ✅ Après  
<p>Aucun retrait pour le moment</p>  // Utiliser &apos; ou enlever l'apostrophe
```

#### 4. Hooks appelés conditionnellement
```typescript
// ❌ Avant
if (condition) {
  const variant = useStatVariant(value)
}

// ✅ Après
const variant = useStatVariant(value)
if (condition) {
  // use variant
}
```

## 🚀 Utilisation

### Avant chaque commit
```bash
# Les erreurs seront automatiquement corrigées si possible
git add .
git commit -m "message"
# ➜ ESLint + Prettier s'exécutent automatiquement
```

### Avant chaque push
```bash
git push
# ➜ ESLint strict s'exécute sur tout le projet
# ➜ Bloque le push si des erreurs existent
```

### Manuellement
```bash
# Lint basique
npm run lint

# Lint avec auto-fix
npm run lint:fix

# Lint strict (comme le pre-push)
npm run lint:strict
```

## 📋 TODO : Corriger les erreurs existantes

### Fichiers à corriger
1. ✅ `jest.config.js` - Autorisé (config file)
2. `src/app/auth/login/page.tsx` - 1 erreur
3. `src/app/auth/register/page.tsx` - 1 erreur
4. `src/app/dashboard/accounts/[id]/page.tsx` - 11 erreurs
5. `src/app/dashboard/accounts/page.tsx` - 1 erreur
6. `src/app/dashboard/page.tsx` - 4 erreurs
7. `src/app/dashboard/pnl/page.tsx` - 1 erreur
8. `src/app/dashboard/profile/page.tsx` - 1 erreur
9. `src/app/dashboard/withdrawals/page.tsx` - 1 erreur
10. `src/components/account-form-dialog.tsx` - 2 erreurs
11. `src/components/account-rules-tracker.tsx` - 3 erreurs
12. `src/components/calendar-day-details-dialog.tsx` - 2 erreurs
13. `src/components/change-password-dialog.tsx` - 1 erreur
14. `src/components/dashboard-nav.tsx` - 2 erreurs
15. `src/components/expenses-calendar.tsx` - 1 erreur

### Stratégie de correction
1. Corriger les fichiers API/routes en premier
2. Corriger les erreurs `any` (priorité haute)
3. Corriger les hooks React
4. Corriger les variables non utilisées
5. Corriger les apostrophes

## ⚙️ Désactiver temporairement

Si besoin de commit/push sans ESLint :
```bash
# Commit sans pre-commit hook
git commit --no-verify -m "message"

# Push sans pre-push hook
git push --no-verify
```

**⚠️ À utiliser seulement en cas d'urgence !**

## 🔧 Configuration future

Pour rendre ESLint encore plus strict :
- Ajouter `@typescript-eslint/strict-boolean-expressions`
- Ajouter `@typescript-eslint/no-floating-promises`
- Activer TypeScript strict mode dans `tsconfig.json`

