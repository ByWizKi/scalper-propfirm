-- Migration personnalisée: Ajouter username et migrer vers système de pseudo unique

-- Étape 1: Ajouter le champ username comme optionnel temporairement
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Étape 2: Mettre à jour l'utilisateur existant avec le pseudo "nono122"
UPDATE "users" SET "username" = 'nono122' WHERE "email" = 'enzoth39260@gmail.com';

-- Étape 3: Rendre le champ username obligatoire
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- Étape 4: Ajouter la contrainte unique sur username
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Étape 5: Supprimer la contrainte unique sur email
DROP INDEX IF EXISTS "users_email_key";

-- Étape 6: Rendre le champ email optionnel
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

