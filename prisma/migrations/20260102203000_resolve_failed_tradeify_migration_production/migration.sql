-- Migration de résolution pour la migration échouée 20260101182646_add_tradeify en production
-- Cette migration résout le problème P3009 en marquant la migration échouée comme résolue
-- et en s'assurant que TRADEIFY existe dans l'enum

-- Étape 1: Marquer la migration échouée comme résolue AVANT toute autre opération
-- Cette étape doit être faite en premier pour débloquer Prisma
UPDATE "_prisma_migrations"
SET 
  "finished_at" = COALESCE("finished_at", NOW()),
  "logs" = COALESCE("logs", '') || E'\n[RESOLVED] Migration automatically resolved: TRADEIFY enum value verified'
WHERE 
  "migration_name" = '20260101182646_add_tradeify';

-- Étape 2: Vérifier et ajouter TRADEIFY si nécessaire (idempotent)
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

