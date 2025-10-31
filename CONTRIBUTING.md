# Guide de contribution

Merci de votre intérêt pour contribuer à **Scalper Propfirm** ! Ce document décrit les conventions et les processus à suivre.

## 📋 Table des matières

- [Gitflow](#gitflow)
- [Conventions de commit](#conventions-de-commit)
- [Standards de code](#standards-de-code)
- [Tests](#tests)
- [Pull Requests](#pull-requests)

## 🌿 Gitflow

Nous utilisons une variante simplifiée de [Gitflow](https://nvie.com/posts/a-successful-git-branching-model/) pour gérer notre développement.

### Branches principales

- **`main`** : Production - Code stable et déployé
- **`develop`** : Développement - Dernières fonctionnalités terminées

### Branches de support

#### Feature branches (fonctionnalités)
```bash
# Créer une branche feature
git checkout develop
git checkout -b feature/nom-de-la-feature

# Une fois terminé, merger dans develop
git checkout develop
git merge feature/nom-de-la-feature
git branch -d feature/nom-de-la-feature
```

**Convention de nommage** : `feature/description-courte`
- Exemples : `feature/add-account-validation`, `feature/improve-dashboard-ui`

#### Bugfix branches (corrections)
```bash
# Pour corriger un bug en développement
git checkout develop
git checkout -b bugfix/description-du-bug
```

**Convention de nommage** : `bugfix/description-courte`
- Exemples : `bugfix/fix-login-error`, `bugfix/correct-withdrawal-calculation`

#### Hotfix branches (corrections urgentes)
```bash
# Pour corriger un bug critique en production
git checkout main
git checkout -b hotfix/description-du-fix

# Une fois terminé, merger dans main ET develop
git checkout main
git merge hotfix/description-du-fix
git checkout develop
git merge hotfix/description-du-fix
git branch -d hotfix/description-du-fix
```

**Convention de nommage** : `hotfix/description-courte`
- Exemples : `hotfix/fix-critical-security-issue`, `hotfix/restore-database-connection`

#### Release branches (préparation de release)
```bash
# Créer une branche de release
git checkout develop
git checkout -b release/1.1.0

# Après tests et ajustements, merger dans main et develop
git checkout main
git merge release/1.1.0
git tag -a v1.1.0 -m "Version 1.1.0"
git checkout develop
git merge release/1.1.0
git branch -d release/1.1.0
```

**Convention de nommage** : `release/version`
- Exemples : `release/1.0.0`, `release/2.1.3`

## ✍️ Conventions de commit

Nous utilisons [Conventional Commits](https://www.conventionalcommits.org/) validé par **Commitlint**.

### Format

```
<type>(<scope>): <sujet>

[corps optionnel]

[footer optionnel]
```

### Types autorisés

| Type       | Description                                      | Exemple                                    |
|------------|--------------------------------------------------|--------------------------------------------|
| `feat`     | Nouvelle fonctionnalité                          | `feat(auth): add password reset feature`   |
| `fix`      | Correction de bug                                | `fix(dashboard): correct stats calculation`|
| `docs`     | Documentation                                    | `docs: update README with setup guide`     |
| `style`    | Formatage, virgules manquantes, etc.             | `style: format code with prettier`         |
| `refactor` | Refactorisation (pas de bug fix, pas de feature)| `refactor(api): simplify auth logic`       |
| `perf`     | Amélioration des performances                    | `perf(db): optimize account queries`       |
| `test`     | Ajout ou modification de tests                   | `test(utils): add currency tests`          |
| `build`    | Build system ou dépendances                      | `build: upgrade next to v16`               |
| `ci`       | Configuration CI/CD                              | `ci: add github actions workflow`          |
| `chore`    | Tâches de maintenance                            | `chore: update dependencies`               |
| `revert`   | Annulation d'un commit précédent                 | `revert: revert commit abc123`             |

### Exemples

✅ **Bon**
```bash
git commit -m "feat(accounts): add filtering by propfirm"
git commit -m "fix(withdrawal): correct tax calculation for TopStep"
git commit -m "docs: add contribution guidelines"
```

❌ **Mauvais**
```bash
git commit -m "update stuff"
git commit -m "Fixed bug"
git commit -m "WIP"
```

## 🎨 Standards de code

### TypeScript
- Utilisez TypeScript strict mode
- Définissez des types explicites
- Évitez `any` quand possible

### React
- Utilisez des composants fonctionnels
- Préférez les hooks personnalisés pour la logique réutilisable
- Suivez le pattern "use client" / "use server" de Next.js

### Styling
- Utilisez Tailwind CSS
- Suivez les conventions de nommage BEM pour les classes custom
- Utilisez les variables de design system

### Formatage
Le code est automatiquement formaté avec **Prettier** lors du commit.

Configuration :
```json
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2
}
```

## 🧪 Tests

### Exécuter les tests

```bash
# Tous les tests
npm run test

# Mode watch
npm run test:watch

# Avec coverage
npm run test:coverage
```

### Écrire des tests

- Un test par fonctionnalité
- Nommage descriptif : `it('should do something when condition')`
- Utilisez `describe` pour grouper les tests liés
- Visez au moins 80% de couverture de code

Exemple :
```typescript
describe('MyComponent', () => {
  it('should render correctly', () => {
    const { container } = render(<MyComponent />)
    expect(container).toBeInTheDocument()
  })

  it('should handle click events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()

    render(<MyComponent onClick={handleClick} />)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

## 🔄 Pull Requests

### Avant de soumettre

1. ✅ Assurez-vous que tous les tests passent
2. ✅ Le code est formaté et lint sans erreur
3. ✅ La documentation est à jour
4. ✅ Les commits suivent les conventions

### Template de PR

```markdown
## Description
Brève description des changements

## Type de changement
- [ ] Bug fix
- [ ] Nouvelle fonctionnalité
- [ ] Breaking change
- [ ] Documentation

## Tests
- [ ] Tests unitaires ajoutés/mis à jour
- [ ] Tests manuels effectués

## Checklist
- [ ] Code formaté et linté
- [ ] Documentation mise à jour
- [ ] Pas de warnings dans la console
```

### Process de review

1. Créez une PR de votre branche vers `develop`
2. Attendez la review d'au moins un mainteneur
3. Corrigez les éventuels commentaires
4. Une fois approuvée, la PR sera mergée

## 📞 Besoin d'aide ?

- Ouvrez une issue sur GitHub
- Contactez l'équipe de développement

Merci de contribuer à **Scalper Propfirm** ! 🚀

