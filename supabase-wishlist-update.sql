-- Ajouter la colonne set_code à la table wishlists
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS set_code TEXT NOT NULL DEFAULT '';

-- Supprimer la contrainte unique existante si elle existe
ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS unique_user_card_wishlist;
ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS unique_username_card_wishlist;

-- Créer une nouvelle contrainte unique incluant set_code
ALTER TABLE wishlists ADD CONSTRAINT unique_username_card_set_wishlist UNIQUE (username, card_id, set_code);

-- Mettre à jour le trigger si nécessaire
DROP TRIGGER IF EXISTS update_wishlists_updated_at ON wishlists;

CREATE TRIGGER update_wishlists_updated_at
BEFORE UPDATE ON wishlists
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column(); 