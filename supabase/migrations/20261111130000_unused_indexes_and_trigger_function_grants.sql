-- No query filters the card tables on rarity, supertype or set_name, the set tables on series or `pokemons` on name: the site reads
-- those tables whole and filters in memory, and `purge` is the one command that filters on series, over 200 rows at most.
-- pg_stat_user_indexes counts 0 scans on 8 of these 13 indexes. The scans of the supertype and set_name ones are `count(*)` taking
-- the smallest index of its table as an index-only scan, which `*_set_id_idx` is now. The daily sync rewrites about every card row,
-- so each index is maintained for nothing: 4.4 MB in all.
-- The `pokemon_id` indexes stay, they back the foreign keys to `pokemons`. `profiles_username_key` stays too, for the reason
-- `20260829100000_indexes_and_function_hardening.sql` gives.
drop index if exists public.idx_cards_rarity;
drop index if exists public.idx_cards_supertype;
drop index if exists public.idx_cards_set_name;
drop index if exists public.idx_jp_cards_rarity;
drop index if exists public.idx_jp_cards_supertype;
drop index if exists public.idx_jp_cards_set_name;
drop index if exists public.fr_cards_rarity_idx;
drop index if exists public.fr_cards_supertype_idx;
drop index if exists public.fr_cards_set_name_idx;
drop index if exists public.idx_sets_series;
drop index if exists public.idx_jp_sets_series;
drop index if exists public.fr_sets_series_idx;
drop index if exists public.idx_pokemons_name;

-- `rls_auto_enable` is the event trigger function (`ensure_rls`) that turns row level security on for every new table of `public`.
-- It is `security definer` and PostgREST publishes it under /rest/v1/rpc, where PUBLIC, `anon` and `authenticated` hold EXECUTE.
-- A trigger fires without that grant, as the webhook triggers of `collections`, `wishlists` and `profiles` already do, so nothing
-- loses access. `update_updated_at_column` is a plain trigger function published the same way.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;
