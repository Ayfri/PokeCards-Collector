-- Grants and policies, applied before row level security is switched on so that turning it on is a no-op
-- for every read the app performs.
--
-- The publishable key ships inside the client bundle, so `anon` is "anybody on the internet". It keeps read
-- access to the catalogue and loses every write: the scraper and the signup endpoint both authenticate with
-- `SUPABASE_SECRET_KEY`, and the service role bypasses grants and policies alike.

-- The catalogue is public read-only data.
revoke insert, update, delete, truncate on cards, prices, sets, jp_cards, jp_prices, jp_sets, pokemons, types
	from anon, authenticated;

create policy "Catalogue is readable by everyone" on cards for select using (true);
create policy "Catalogue is readable by everyone" on prices for select using (true);
create policy "Catalogue is readable by everyone" on sets for select using (true);
create policy "Catalogue is readable by everyone" on jp_cards for select using (true);
create policy "Catalogue is readable by everyone" on jp_sets for select using (true);
create policy "Catalogue is readable by everyone" on pokemons for select using (true);
create policy "Catalogue is readable by everyone" on types for select using (true);
-- `jp_prices` already carries "jp_prices are readable by everyone" and is the one table with RLS enabled.

-- Internal bookkeeping, nothing in the app reads it and it has no policy, so it stays invisible once RLS is on.
revoke all on cron_restore_project from anon, authenticated;

-- Users own their rows, nobody rewrites a collection or wishlist entry in place. Anonymous callers keep read
-- access only: the policies already match zero rows for them, `auth.uid()` being null, and dropping the grant
-- means the request never reaches the policy at all.
revoke update, truncate on collections, wishlists from anon, authenticated;
revoke insert, delete on collections, wishlists from anon;
revoke insert, delete, truncate on profiles from anon, authenticated;
revoke update on profiles from anon;

-- `auth.uid()` is rewritten as a scalar subquery so the planner evaluates it once per statement instead of
-- once per row, and the two SELECT policies per table are merged: permissive policies are OR'd anyway, and
-- keeping them apart made Postgres run both for every row.
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can view their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;

create policy "Profiles are visible when public or owned" on profiles
	for select using (is_public = true or (select auth.uid()) = auth_id);

create policy "Users can update their own profile" on profiles
	for update using ((select auth.uid()) = auth_id)
	with check ((select auth.uid()) = auth_id);

drop policy if exists "Everyone can view collections for public profiles" on collections;
drop policy if exists "Users can view their own collections" on collections;
drop policy if exists "Users can insert into their own collections" on collections;
drop policy if exists "Users can update their own collections" on collections;
drop policy if exists "Users can delete from their own collections" on collections;

create policy "Collections are visible when public or owned" on collections
	for select using (
		exists (
			select 1 from profiles p
			where p.username = collections.username
				and (p.is_public = true or p.auth_id = (select auth.uid()))
		)
	);

create policy "Users can insert into their own collections" on collections
	for insert with check (
		exists (select 1 from profiles p where p.username = collections.username and p.auth_id = (select auth.uid()))
	);

create policy "Users can delete from their own collections" on collections
	for delete using (
		exists (select 1 from profiles p where p.username = collections.username and p.auth_id = (select auth.uid()))
	);

drop policy if exists "Everyone can view wishlists for public profiles" on wishlists;
drop policy if exists "Users can view their own wishlists" on wishlists;
drop policy if exists "Users can insert into their own wishlists" on wishlists;
drop policy if exists "Users can delete from their own wishlists" on wishlists;

create policy "Wishlists are visible when public or owned" on wishlists
	for select using (
		exists (
			select 1 from profiles p
			where p.username = wishlists.username
				and (p.is_public = true or p.auth_id = (select auth.uid()))
		)
	);

create policy "Users can insert into their own wishlists" on wishlists
	for insert with check (
		exists (select 1 from profiles p where p.username = wishlists.username and p.auth_id = (select auth.uid()))
	);

create policy "Users can delete from their own wishlists" on wishlists
	for delete using (
		exists (select 1 from profiles p where p.username = wishlists.username and p.auth_id = (select auth.uid()))
	);

-- The `exists (select 1 from profiles ...)` inside the collection and wishlist policies is itself subject to
-- the `profiles` policy, which is what makes a private user's rows disappear: their profile row is invisible,
-- so the existence check is false and the whole collection is filtered out.
