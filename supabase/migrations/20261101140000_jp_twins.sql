-- The English / French twin of a Japanese card: TCGdex gives Japanese prints their own sets and ids, so `bun run scrapers link` matches them on
-- language-independent traits (attacks, HP, illustrator, artwork hash) and stores the English TCGdex id it found, with the pass that found it.
-- Null when no match is certain. The index serves the reverse lookup, from an English or French card page to its Japanese print.
alter table jp_cards add column if not exists twin_tcgdex_id text;
alter table jp_cards add column if not exists twin_method text;
create index if not exists jp_cards_twin_tcgdex_id_idx on jp_cards (twin_tcgdex_id);
