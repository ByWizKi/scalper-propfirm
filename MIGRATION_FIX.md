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

### Option 1 : Modifier la commande de build sur Render (Recommandé - Automatique)

Si le terminal ne fonctionne pas, modifiez directement la commande de build dans Render :

1. Allez dans le Dashboard Render
2. Sélectionnez votre service web
3. Allez dans "Settings" → "Build Command"
4. Remplacez la commande actuelle par :
   ```bash
   npm install && npx prisma generate && (npx prisma migrate resolve --applied 20260101182646_add_tradeify || true) && npx prisma migrate deploy && npm run build
   ```
5. Sauvegardez et redéployez

Cette commande résoudra automatiquement la migration échouée avant d'essayer d'appliquer les migrations.

### Option 2 : SQL via l'interface de base de données Render

1. Allez dans le Dashboard Render
2. Sélectionnez votre service de base de données PostgreSQL
3. Cliquez sur "Connect" (interface web de la base de données)
4. Exécutez le script SQL ci-dessus dans l'éditeur SQL

### Option 3 : Utiliser Prisma CLI (si terminal disponible)

1. Connectez-vous à votre environnement de production (via SSH ou shell Render)
2. Exécutez la commande Prisma :
   ```bash
   npx prisma migrate resolve --applied 20260101182646_add_tradeify
   ```

## Commandes de débogage

### Vérifier l'état des migrations

```bash
# Vérifier l'état des migrations dans la base de données
npx prisma migrate status

# Voir toutes les migrations et leur statut
npx prisma migrate status --schema prisma/schema.prisma
```

### Vérifier la migration échouée dans la base de données

```sql
-- Voir toutes les migrations et leur statut
SELECT
  "migration_name",
  "started_at",
  "finished_at",
  "logs",
  CASE
    WHEN "finished_at" IS NULL THEN 'FAILED'
    WHEN "finished_at" IS NOT NULL THEN 'SUCCESS'
  END AS status
FROM "_prisma_migrations"
ORDER BY "started_at" DESC
LIMIT 10;

-- Vérifier spécifiquement la migration échouée
SELECT
  "migration_name",
  "started_at",
  "finished_at",
  "logs",
  EXTRACT(EPOCH FROM (NOW() - "started_at")) / 60 AS minutes_since_start
FROM "_prisma_migrations"
WHERE "migration_name" = '20260101182646_add_tradeify';

-- Vérifier si TRADEIFY existe dans l'enum
SELECT
  enumlabel,
  enumsortorder
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PropfirmType')
ORDER BY enumsortorder;
```

### Résoudre la migration échouée

```bash
# Option 1: Marquer comme appliquée (si les changements sont déjà dans la DB)
npx prisma migrate resolve --applied 20260101182646_add_tradeify

# Option 2: Marquer comme annulée (si vous voulez la réappliquer)
npx prisma migrate resolve --rolled-back 20260101182646_add_tradeify

# Vérifier après résolution
npx prisma migrate status
```

### Exécuter le SQL de résolution directement

```bash
# Via psql (si disponible)
psql $DATABASE_URL -f scripts/resolve-failed-migration.sql

# Ou exécuter le SQL inline
psql $DATABASE_URL -c "UPDATE \"_prisma_migrations\" SET \"finished_at\" = NOW() WHERE \"migration_name\" = '20260101182646_add_tradeify' AND \"finished_at\" IS NULL;"
```

### Tester les migrations localement

```bash
# Générer le client Prisma
npx prisma generate

# Vérifier l'état des migrations
npx prisma migrate status

# Appliquer les migrations (dev)
npx prisma migrate dev

# Appliquer les migrations (production)
npx prisma migrate deploy
```

### Commandes utiles pour le débogage

```bash
# Voir les variables d'environnement
echo $DATABASE_URL

# Tester la connexion à la base de données
npx prisma db execute --stdin <<< "SELECT version();"

# Voir le schéma actuel de la base de données
npx prisma db pull

# Comparer le schéma avec les migrations
npx prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma
```

## Après la résolution

Une fois la migration marquée comme résolue, le prochain déploiement devrait réussir. La migration de résolution `20260102203000_resolve_failed_tradeify_migration_production` sera automatiquement appliquée lors du prochain déploiement.
