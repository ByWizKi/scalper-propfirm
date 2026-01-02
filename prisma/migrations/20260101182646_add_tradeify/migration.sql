-- AlterEnum avec vérification pour éviter l'erreur si la valeur existe déjà
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

