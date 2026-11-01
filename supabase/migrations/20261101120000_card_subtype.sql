-- Trainer / Energy sub-type, in English: TCGdex's trainerType (Supporter, Item, Stadium, Tool, ...) or energyType (Normal, Special). Null on Pokémon.
-- Null as well on the WotC-era Trainers TCGdex leaves without one.
-- The table-level select policies and the revoked writes already cover a new column, so no grant or policy changes here.
alter table cards add column if not exists subtype text;
alter table jp_cards add column if not exists subtype text;
alter table fr_cards add column if not exists subtype text;
