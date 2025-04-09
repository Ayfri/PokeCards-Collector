-- Ajouter la colonne pokemon_id aux tables collections et wishlists
ALTER TABLE collections ADD COLUMN IF NOT EXISTS pokemon_id INTEGER;
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS pokemon_id INTEGER;

-- Mettre à jour les contraintes d'unicité pour inclure pokemon_id
ALTER TABLE collections DROP CONSTRAINT IF EXISTS unique_username_card_set;
ALTER TABLE collections ADD CONSTRAINT unique_username_card_set UNIQUE (username, card_id, set_code, pokemon_id);

ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS unique_username_card_set_wishlist;
ALTER TABLE wishlists ADD CONSTRAINT unique_username_card_set_wishlist UNIQUE (username, card_id, set_code, pokemon_id); 