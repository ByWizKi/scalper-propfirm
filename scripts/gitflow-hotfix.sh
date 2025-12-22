#!/bin/bash

# Script pour créer un hotfix GitFlow
# Usage: ./scripts/gitflow-hotfix.sh <version>
# Exemple: ./scripts/gitflow-hotfix.sh 1.2.1

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "❌ Erreur: Veuillez spécifier une version"
  echo "Usage: ./scripts/gitflow-hotfix.sh <version>"
  echo "Exemple: ./scripts/gitflow-hotfix.sh 1.2.1"
  exit 1
fi

# Vérifier que nous sommes sur main
current_branch=$(git symbolic-ref HEAD | sed -e 's,^refs/heads/,,')
if [ "$current_branch" != "main" ]; then
  echo "❌ Vous devez être sur la branche 'main' pour créer un hotfix"
  echo "   Branche actuelle: $current_branch"
  exit 1
fi

# Vérifier que main est à jour
echo "🔄 Mise à jour de main..."
git fetch origin
git pull origin main

# Créer la branche hotfix
echo "🔥 Création de la branche hotfix/$VERSION..."
git checkout -b hotfix/$VERSION

# Mettre à jour la version dans package.json
echo "📝 Mise à jour de la version dans package.json..."
npm version $VERSION --no-git-tag-version

# Commit des changements de version
git add package.json package-lock.json
git commit -m "chore: bump version to $VERSION"

echo "✅ Hotfix $VERSION créé avec succès!"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Corrigez le bug dans cette branche"
echo "   2. Mergez dans main: git checkout main && git merge hotfix/$VERSION"
echo "   3. Taggez la version: git tag -a v$VERSION -m 'Hotfix $VERSION'"
echo "   4. Mergez dans develop: git checkout develop && git merge hotfix/$VERSION"
echo "   5. Supprimez la branche: git branch -d hotfix/$VERSION"
echo "   6. Push: git push origin main && git push origin develop && git push origin v$VERSION"

