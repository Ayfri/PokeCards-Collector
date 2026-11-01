-- Artwork for a card TCGdex has no scan of, kept apart from `image` so `image` stays the card's own scan: the scan of the same card in another
-- language, of a reprint with the same name and illustrator, or of a basic Energy of the same type. `art_source` says which, for the "Art from" note.
-- The placeholder plate draws its illustration box cropped in its art window. Null when the card has a scan or no source was found.
alter table cards add column if not exists art_image text;
alter table cards add column if not exists art_source text;
alter table jp_cards add column if not exists art_image text;
alter table jp_cards add column if not exists art_source text;
alter table fr_cards add column if not exists art_image text;
alter table fr_cards add column if not exists art_source text;
