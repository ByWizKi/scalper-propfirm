#!/bin/bash

# Script pour créer une release GitFlow
# Usage: ./scripts/gitflow-release.sh <version>
# Exemple: ./scripts/gitflow-release.sh 1.2.0

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "❌ Erreur: Veuillez spécifier une version"
  echo "Usage: ./scripts/gitflow-release.sh <version>"
  echo "Exemple: ./scripts/gitflow-release.sh 1.2.0"
  exit 1
fi

# Vérifier que nous sommes sur develop
current_branch=$(git symbolic-ref HEAD | sed -e 's,^refs/heads/,,')
if [ "$current_branch" != "develop" ]; then
  echo "❌ Vous devez être sur la branche 'develop' pour créer une release"
  echo "   Branche actuelle: $current_branch"
  exit 1
fi

# Vérifier que develop est à jour
echo "🔄 Mise à jour de develop..."
git fetch origin
git pull origin develop

# Vérifier que le build fonctionne
echo "🔨 Vérification du build..."
npm run build || {
  echo "❌ Le build a échoué. Corrigez les erreurs avant de créer la release."
  exit 1
}

# Créer la branche release
echo "🚀 Création de la branche release/$VERSION..."
git checkout -b release/$VERSION

# Mettre à jour la version dans package.json
echo "📝 Mise à jour de la version dans package.json..."
npm version $VERSION --no-git-tag-version

# Commit des changements de version
git add package.json package-lock.json
git commit -m "chore: bump version to $VERSION"

echo "✅ Release $VERSION créée avec succès!"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Finalisez la release (tests, documentation, etc.)"
echo "   2. Mergez dans main: git checkout main && git merge release/$VERSION"
echo "   3. Taggez la version: git tag -a v$VERSION -m 'Release $VERSION'"
echo "   4. Mergez dans develop: git checkout develop && git merge release/$VERSION"
echo "   5. Supprimez la branche: git branch -d release/$VERSION"
echo "   6. Push: git push origin main && git push origin develop && git push origin v$VERSION"

