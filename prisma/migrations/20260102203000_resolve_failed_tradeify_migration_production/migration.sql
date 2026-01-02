-- Migration de résolution pour la migration échouée 20260101182646_add_tradeify en production
-- Cette migration marque la migration échouée comme résolue et s'assure que TRADEIFY existe
-- IMPORTANT: Cette migration doit être exécutée même si Prisma détecte une migration échouée

-- Étape 1: Vérifier et ajouter TRADEIFY si nécessaire (idempotent) - DOIT être fait en premier
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
    RAISE NOTICE 'TRADEIFY enum value added successfully';
  ELSE
    RAISE NOTICE 'TRADEIFY enum value already exists';
  END IF;
END $$;

-- Étape 2: Marquer la migration échouée comme résolue dans _prisma_migrations
-- Cette étape résout le problème P3009 en marquant la migration comme terminée
UPDATE "_prisma_migrations"
SET 
  "finished_at" = NOW(),
  "logs" = COALESCE("logs", '') || E'\nMigration resolved automatically: TRADEIFY enum value verified and migration marked as completed'
WHERE 
  "migration_name" = '20260101182646_add_tradeify'
  AND ("finished_at" IS NULL OR "finished_at" > "started_at" + INTERVAL '1 hour');

