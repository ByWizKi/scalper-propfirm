# Résolution de la migration échouée 20260101182646_add_tradeify

## Problème

La migration `20260101182646_add_tradeify` a échoué en production et Prisma bloque l'application de nouvelles migrations tant que cette migration n'est pas résolue.

## Solution immédiate (à exécuter manuellement)

**Connectez-vous à votre base de données PostgreSQL de production** et exécutez le script suivant :

```sql
-- Marquer la migration échouée comme résolue
UPDATE "_prisma_migrations"
SET
  "finished_at" = NOW(),
  "logs" = 'Migration resolved: TRADEIFY enum value already exists or was successfully added'
WHERE
  "migration_name" = '20260101182646_add_tradeify'
  AND "finished_at" IS NULL;

-- Vérifier et ajouter TRADEIFY si nécessaire
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'TRADEIFY'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PropfirmType')
  ) THEN
    ALTER TYPE "PropfirmType" ADD VALUE 'TRADEIFY';
  END IF;
END $$;
```

**Alternative :** Utilisez le fichier `scripts/resolve-failed-migration.sql` qui contient le script complet avec des vérifications supplémentaires.

## Après l'exécution du script

Une fois le script exécuté, le prochain déploiement devrait réussir. La migration de résolution `20260102203000_resolve_failed_tradeify_migration_production` sera automatiquement appliquée lors du prochain déploiement.

## Comment se connecter à la base de données Render

1. Allez dans le Dashboard Render
2. Sélectionnez votre service de base de données PostgreSQL
3. Cliquez sur "Connect" ou "Shell"
4. Exécutez le script SQL ci-dessus

Ou utilisez `psql` avec la connection string de votre base de données :

```bash
psql $DATABASE_URL -f scripts/resolve-failed-migration.sql
```
