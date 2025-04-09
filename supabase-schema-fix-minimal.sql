-- Ce script se concentre uniquement sur les modifications de la table collections
-- sans toucher aux tables profiles ou wishlists

-- 1. Vérifier si les colonnes existent avant de continuer
DO $$
BEGIN
    -- Vérifier si la colonne quantity existe
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collections' AND column_name = 'quantity'
    ) THEN
        -- Drop la colonne quantity
        ALTER TABLE collections DROP COLUMN quantity;
        RAISE NOTICE 'Colonne quantity supprimée.';
    ELSE
        RAISE NOTICE 'La colonne quantity n''existe pas déjà, étape ignorée.';
    END IF;

    -- Vérifier si la colonne set_code n'existe pas encore
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collections' AND column_name = 'set_code'
    ) THEN
        -- Ajouter la colonne set_code
        ALTER TABLE collections ADD COLUMN set_code TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Colonne set_code ajoutée.';
    ELSE
        RAISE NOTICE 'La colonne set_code existe déjà, étape ignorée.';
    END IF;
END $$;

-- 2. Supprimer la contrainte unique actuelle si elle existe
ALTER TABLE collections DROP CONSTRAINT IF EXISTS unique_user_card;
ALTER TABLE collections DROP CONSTRAINT IF EXISTS unique_user_card_set;

-- 3. Créer une nouvelle contrainte unique
-- Vérifier quelle colonne existe pour déterminer la contrainte appropriée
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collections' AND column_name = 'username'
    ) THEN
        -- Utiliser username si elle existe
        ALTER TABLE collections 
            ADD CONSTRAINT unique_username_card_set 
            UNIQUE (username, card_id, set_code);
        RAISE NOTICE 'Contrainte unique créée avec username.';
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collections' AND column_name = 'user_id'
    ) THEN
        -- Utiliser user_id si username n'existe pas
        ALTER TABLE collections 
            ADD CONSTRAINT unique_user_card_set 
            UNIQUE (user_id, card_id, set_code);
        RAISE NOTICE 'Contrainte unique créée avec user_id.';
    ELSE
        RAISE EXCEPTION 'Ni username ni user_id n''existent dans la table collections!';
    END IF;
END $$;

-- 4. Mettre à jour le trigger
DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;

CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column(); 