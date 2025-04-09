-- Script pour appliquer uniquement les modifications de structure à la table collections
-- sans toucher aux autres tables

-- Drop the current collections table constraints safely
ALTER TABLE collections DROP CONSTRAINT IF EXISTS unique_user_card;
ALTER TABLE collections DROP CONSTRAINT IF EXISTS unique_user_card_set;

-- Add set_code column and remove quantity column from collections
ALTER TABLE collections ADD COLUMN IF NOT EXISTS set_code TEXT NOT NULL DEFAULT '';
ALTER TABLE collections DROP COLUMN IF EXISTS quantity;

-- Create new unique constraint
-- Si vous utilisez le champ username
ALTER TABLE collections ADD CONSTRAINT unique_username_card_set UNIQUE (username, card_id, set_code);
-- Ou si vous utilisez toujours user_id
-- ALTER TABLE collections ADD CONSTRAINT unique_user_card_set UNIQUE (user_id, card_id, set_code);

-- Update any existing triggers to ensure they work with the new schema
DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;

CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column(); 