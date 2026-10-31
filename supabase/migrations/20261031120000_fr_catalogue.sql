-- French catalogue, parallel to jp_*: its own card codes (set part prefixed `fr`), the same row shapes as the English tables.
-- `like ... including all` copies columns, defaults, the primary key and every index, but neither foreign keys, RLS nor policies.
create table if not exists fr_sets (like sets including all);
create table if not exists fr_cards (like cards including all);
create table if not exists fr_prices (like prices including all);

do $$
begin
	if not exists (select 1 from pg_constraint where conname = 'fr_cards_pokemon_id_fkey') then
		alter table fr_cards add constraint fr_cards_pokemon_id_fkey foreign key (pokemon_id) references pokemons (id);
	end if;
	if not exists (select 1 from pg_constraint where conname = 'fr_prices_card_code_fkey') then
		alter table fr_prices add constraint fr_prices_card_code_fkey foreign key (card_code) references fr_cards (card_code) on delete cascade;
	end if;
end
$$;

-- Supabase grants every right on a new public table to anon and authenticated; only the service role writes the catalogue.
revoke insert, update, delete, truncate on fr_cards, fr_prices, fr_sets from anon, authenticated;

alter table fr_cards enable row level security;
alter table fr_prices enable row level security;
alter table fr_sets enable row level security;

drop policy if exists "Catalogue is readable by everyone" on fr_cards;
drop policy if exists "Catalogue is readable by everyone" on fr_prices;
drop policy if exists "Catalogue is readable by everyone" on fr_sets;
create policy "Catalogue is readable by everyone" on fr_cards for select using (true);
create policy "Catalogue is readable by everyone" on fr_prices for select using (true);
create policy "Catalogue is readable by everyone" on fr_sets for select using (true);
