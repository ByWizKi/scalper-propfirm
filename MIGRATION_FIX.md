# Résolution de la migration échouée 20260101182646_add_tradeify

## Problème

La migration `20260101182646_add_tradeify` a échoué en production et Prisma bloque l'application de nouvelles migrations tant que cette migration n'est pas résolue.

**Erreur Prisma :** `P3009 - migrate found failed migrations in the target database`

## Solution recommandée par Prisma

Selon la [documentation officielle Prisma](https://pris.ly/d/migrate-resolve), utilisez la commande suivante :

```bash
npx prisma migrate resolve --applied 20260101182646_add_tradeify
```

Cette commande marque la migration comme appliquée dans la table `_prisma_migrations`.

## Solution alternative (SQL manuel)

Si vous ne pouvez pas exécuter la commande Prisma, **connectez-vous à votre base de données PostgreSQL de production** et exécutez le script suivant :

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

## Comment résoudre le problème

### Option 1 : Utiliser Prisma CLI (Recommandé)

1. Connectez-vous à votre environnement de production (via SSH ou shell Render)
2. Exécutez la commande Prisma :
   ```bash
   npx prisma migrate resolve --applied 20260101182646_add_tradeify
   ```

### Option 2 : SQL manuel

1. Allez dans le Dashboard Render
2. Sélectionnez votre service de base de données PostgreSQL
3. Cliquez sur "Connect" ou "Shell"
4. Exécutez le script SQL ci-dessus

Ou utilisez `psql` avec la connection string de votre base de données :

```bash
psql $DATABASE_URL -f scripts/resolve-failed-migration.sql
```

## Après la résolution

Une fois la migration marquée comme résolue, le prochain déploiement devrait réussir. La migration de résolution `20260102203000_resolve_failed_tradeify_migration_production` sera automatiquement appliquée lors du prochain déploiement.
