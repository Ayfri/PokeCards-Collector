-- Additive hardening pass: indexes the columns every collection/wishlist/profile query filters on,
-- pins the search_path of every function, and closes the trigger functions that PostgREST exposes as RPC.
-- Nothing here changes what a query returns, so it is safe to apply before row level security is turned on.

-- `collections` only had its primary key on `id`, so every lookup by owner was a sequential scan, and the
-- row level security policies about to land run an `exists` on `profiles` per row.
create index if not exists idx_collections_username_card_code on collections (username, card_code);
create index if not exists idx_profiles_auth_id on profiles (auth_id);

-- `profiles_pkey` already indexes `username`, `profiles_username_key` is the same index twice.
drop index if exists profiles_username_key;

-- An empty search_path forces every reference inside the body to be schema qualified, so a table planted
-- in a schema earlier on the caller's search_path cannot hijack the function.
alter function public.search_public_users_with_stats(p_query text, p_limit integer) set search_path = '';
alter function public.update_updated_at_column() set search_path = '';
alter function public.process_profiles_webhook() set search_path = '';
alter function public.process_collections_webhook() set search_path = '';
alter function public.process_wishlists_webhook() set search_path = '';

-- The three webhook functions are triggers, PostgREST still published them under /rest/v1/rpc.
revoke execute on function public.process_profiles_webhook() from anon, authenticated;
revoke execute on function public.process_collections_webhook() from anon, authenticated;
revoke execute on function public.process_wishlists_webhook() from anon, authenticated;

analyze profiles;
analyze collections;
analyze wishlists;
