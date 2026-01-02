-- Migration de résolution pour la migration échouée 20260101182646_add_tradeify en production
-- Cette migration marque la migration échouée comme résolue et s'assure que TRADEIFY existe

-- Étape 1: Marquer la migration échouée comme résolue dans _prisma_migrations
UPDATE "_prisma_migrations"
SET 
  "finished_at" = NOW(),
  "logs" = 'Migration resolved: TRADEIFY enum value already exists or was successfully added'
WHERE 
  "migration_name" = '20260101182646_add_tradeify'
  AND "finished_at" IS NULL;

-- Étape 2: Vérifier et ajouter TRADEIFY si nécessaire (idempotent)
DO $$
BEGIN
  -- Vérifier si TRADEIFY existe déjà dans l'enum PropfirmType
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'TRADEIFY' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PropfirmType')
  ) THEN
    -- Ajouter TRADEIFY seulement s'il n'existe pas
    ALTER TYPE "PropfirmType" ADD VALUE 'TRADEIFY';
  END IF;
END $$;

