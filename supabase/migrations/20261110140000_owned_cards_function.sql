-- One user's collection or wishlist resolved against the three catalogues in a single call, so the user pages and their share images never load a
-- whole card table. Security invoker: the `collections` / `wishlists` policies still decide what the caller sees, so a private list comes back empty
-- to anyone but its owner. Never make it security definer, that would publish every private collection.
-- A French code (a `fr` right after the Pokédex id, like `pokemon_6_frsv03_125`) resolves to the French table only. Any other code resolves to the
-- English card first (19 legacy Japanese codes equal English ones) and to the Japanese one only when English lacks it. `rows` (copies) and `codes`
-- (distinct codes) count orphan rows too, codes no table carries, which `cards` leaves out. `price` mirrors `cardPrice()`: the first non-null of
-- simple, trend, avg30, low, null unless above 0.
-- With `p_with_sets`, `sets` holds the card count and summed price of every set an owned card belongs to, over the whole table: the profile's set completion.
-- The prices are `real`: they are summed through their text form, since a direct cast to float8 widens 135.44 to 135.44000244 and drifts the totals by a cent.
create or replace function public.owned_cards(p_username text, p_list text, p_with_sets boolean)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
	with owned as (
		select card_code, count(*)::int as copies
		from public.collections
		where p_list = 'collection' and username = p_username
		group by card_code
		union all
		select card_code, count(*)::int
		from public.wishlists
		where p_list = 'wishlist' and username = p_username
		group by card_code
	),
	found as (
		select 'en' as language, 0 as rank, o.copies,
			c.card_code, c.art_image, c.art_source, c.artist, c.card_market_url, c.hp, c.image, c.local_id, c.name,
			c.pokemon_id, c.rarity, c.set_id, c.set_name, c.stage, c.subtype, c.supertype, c.types,
			nullif(greatest(coalesce(p.simple, p.trend, p.avg30, p.low), 0), 0) as price
		from owned o
		join public.cards c on c.card_code = o.card_code
		left join public.prices p on p.card_code = c.card_code
		where o.card_code !~ '^[^_]+_\d+_fr'
		union all
		select 'ja', 1, o.copies,
			c.card_code, c.art_image, c.art_source, c.artist, c.card_market_url, c.hp, c.image, c.local_id, c.name,
			c.pokemon_id, c.rarity, c.set_id, c.set_name, c.stage, c.subtype, c.supertype, c.types,
			nullif(greatest(coalesce(p.simple, p.trend, p.avg30, p.low), 0), 0)
		from owned o
		join public.jp_cards c on c.card_code = o.card_code
		left join public.jp_prices p on p.card_code = c.card_code
		where o.card_code !~ '^[^_]+_\d+_fr'
			and not exists (select 1 from public.cards e where e.card_code = o.card_code)
		union all
		select 'fr', 2, o.copies,
			c.card_code, c.art_image, c.art_source, c.artist, c.card_market_url, c.hp, c.image, c.local_id, c.name,
			c.pokemon_id, c.rarity, c.set_id, c.set_name, c.stage, c.subtype, c.supertype, c.types,
			nullif(greatest(coalesce(p.simple, p.trend, p.avg30, p.low), 0), 0)
		from owned o
		join public.fr_cards c on c.card_code = o.card_code
		left join public.fr_prices p on p.card_code = c.card_code
		where o.card_code ~ '^[^_]+_\d+_fr'
	),
	set_totals as (
		select 'en' as language, c.set_id, count(*)::int as cards, sum(greatest(coalesce(p.simple, p.trend, p.avg30, p.low), 0)::text::float8) as value
		from public.cards c
		left join public.prices p on p.card_code = c.card_code
		where p_with_sets and c.set_id in (select set_id from found where language = 'en')
		group by c.set_id
		union all
		select 'ja', c.set_id, count(*)::int, sum(greatest(coalesce(p.simple, p.trend, p.avg30, p.low), 0)::text::float8)
		from public.jp_cards c
		left join public.jp_prices p on p.card_code = c.card_code
		where p_with_sets and c.set_id in (select set_id from found where language = 'ja')
		group by c.set_id
		union all
		select 'fr', c.set_id, count(*)::int, sum(greatest(coalesce(p.simple, p.trend, p.avg30, p.low), 0)::text::float8)
		from public.fr_cards c
		left join public.fr_prices p on p.card_code = c.card_code
		where p_with_sets and c.set_id in (select set_id from found where language = 'fr')
		group by c.set_id
	)
	select jsonb_build_object(
		'codes', (select count(*) from owned),
		'rows', (select coalesce(sum(copies), 0) from owned),
		'cards', coalesce((select jsonb_agg(jsonb_strip_nulls(to_jsonb(f) - 'rank') order by f.rank, f.name, f.card_code) from found f), '[]'::jsonb),
		'sets', coalesce((select jsonb_agg(to_jsonb(s)) from set_totals s), '[]'::jsonb)
	);
$$;

-- PostgREST publishes the function under /rest/v1/rpc, and EXECUTE is granted to PUBLIC by default.
revoke execute on function public.owned_cards(text, text, boolean) from public;
grant execute on function public.owned_cards(text, text, boolean) to anon, authenticated, service_role;

-- The set totals read every card of a few sets; the daily sync's per-set deletes use the same column.
create index if not exists cards_set_id_idx on public.cards (set_id);
create index if not exists jp_cards_set_id_idx on public.jp_cards (set_id);
create index if not exists fr_cards_set_id_idx on public.fr_cards (set_id);
