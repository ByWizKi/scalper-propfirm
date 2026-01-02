#!/bin/bash
# Script pour résoudre les migrations échouées avant l'exécution de prisma migrate deploy
# Ce script doit être exécuté avant prisma migrate deploy en production

set -e

echo "🔧 Checking for failed migrations..."

# Vérifier si DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set, skipping migration resolution"
  exit 0
fi

# Exécuter le script SQL de résolution via psql si disponible
if command -v psql &> /dev/null; then
  echo "📝 Executing migration resolution script..."
  psql "$DATABASE_URL" -f scripts/resolve-failed-migration.sql || {
    echo "⚠️  Failed to execute resolution script, continuing anyway..."
  }
else
  echo "⚠️  psql not available, migration resolution will be handled by Prisma migrations"
  echo "ℹ️  If migrations fail, execute scripts/resolve-failed-migration.sql manually"
fi

echo "✅ Pre-migration check completed"

