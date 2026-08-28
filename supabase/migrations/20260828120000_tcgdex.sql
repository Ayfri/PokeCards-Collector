-- TCGdex migration: pokemontcg.io + tcgcollector are replaced by TCGdex as the only card source.
-- Additive only: `card_code` keeps its `supertype_pokemonId_setCode_cardNumber` format, so every
-- `collections` / `wishlists` row keeps pointing at the same card.
--
-- Do NOT add a foreign key from collections.card_code or wishlists.card_code to cards.card_code, and do
-- NOT garbage-collect "orphan" rows: TCGdex's Japanese catalogue is still incomplete, so some owned
-- cards are temporarily unrenderable and come back on their own when the upstream database fills the set in.

alter table cards
	add column if not exists tcgdex_id text,
	add column if not exists local_id text,
	add column if not exists variants jsonb,
	add column if not exists regulation_mark text,
	add column if not exists stage text,
	add column if not exists hp integer,
	add column if not exists legal_standard boolean,
	add column if not exists set_id text;

alter table jp_cards
	add column if not exists tcgdex_id text,
	add column if not exists local_id text,
	add column if not exists variants jsonb,
	add column if not exists regulation_mark text,
	add column if not exists stage text,
	add column if not exists hp integer,
	add column if not exists legal_standard boolean,
	add column if not exists set_id text;

alter table sets
	add column if not exists set_id text,
	add column if not exists symbol text,
	add column if not exists total_cards integer;

alter table jp_sets
	add column if not exists set_id text,
	add column if not exists symbol text,
	add column if not exists total_cards integer,
	add column if not exists release_date date,
	add column if not exists series text,
	add column if not exists logo text;

create unique index if not exists cards_tcgdex_id_key on cards (tcgdex_id);
create unique index if not exists jp_cards_tcgdex_id_key on jp_cards (tcgdex_id);
create unique index if not exists sets_set_id_key on sets (set_id);
create unique index if not exists jp_sets_set_id_key on jp_sets (set_id);

-- Japanese cards carry cardmarket pricing too, which the old tcgcollector scraper could not provide.
create table if not exists jp_prices (like prices including all);

-- A card that TCGdex dropped takes its price row with it, so the stale-row cleanup only has to touch cards.
do $$
declare
	constraint_name text;
begin
	for constraint_name in
		select conname from pg_constraint
		where conrelid = 'prices'::regclass and contype = 'f'
	loop
		execute format('alter table prices drop constraint %I', constraint_name);
	end loop;
end $$;

alter table prices add constraint prices_card_code_fkey
	foreign key (card_code) references cards (card_code) on delete cascade;

do $$
begin
	if not exists (select 1 from pg_constraint where conname = 'jp_prices_card_code_fkey') then
		alter table jp_prices add constraint jp_prices_card_code_fkey
			foreign key (card_code) references jp_cards (card_code) on delete cascade;
	end if;
end $$;

alter table jp_prices enable row level security;

do $$
begin
	if not exists (select 1 from pg_policies where tablename = 'jp_prices' and policyname = 'jp_prices are readable by everyone') then
		create policy "jp_prices are readable by everyone" on jp_prices for select using (true);
	end if;
end $$;
