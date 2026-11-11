-- Published binder snapshots, rendered read-only at `/binder/<id>`. Anyone holding the publishable key can read every row: a share is public by design.
-- A share holds catalogue card codes only, never an image URL: the page resolves each code against the catalogue and draws nothing a user typed.
-- A signed-in user can insert straight through PostgREST and skip the endpoint's validation, so the checks below are the real size guard:
-- 8 x 8 pockets, 50 pages, 64 kB of JSON per share and about 20 shares per user keep the table to a few MB on the 406 MB database.
create table if not exists binder_shares (
	id uuid primary key default gen_random_uuid(),
	username text not null references profiles (username) on delete cascade,
	name text not null check (char_length(name) between 1 and 60),
	pocket_rows smallint not null check (pocket_rows between 1 and 8),
	pocket_columns smallint not null check (pocket_columns between 1 and 8),
	pages jsonb not null,
	created_at timestamptz not null default now(),
	-- Every page is an array of exactly rows x columns pockets, and a pocket is null or a catalogue card code: lower-case letters, digits and
	-- underscores, so never a URL, a path or a backslash host. Both paths are strict: a lax filter unwraps an array and tests its elements,
	-- which would test the pockets in place of the page and let a pocket that is itself an array through.
	constraint binder_shares_pages_shape check (
		jsonb_typeof(pages) = 'array'
		and jsonb_array_length(pages) between 1 and 50
		and octet_length(pages::text) <= 65536
		and not jsonb_path_exists(pages, 'strict $[*] ? (@.type() != "array" || @.size() != $size)', jsonb_build_object('size', pocket_rows * pocket_columns))
		and not jsonb_path_exists(pages, 'strict $[*] ? (@.type() == "array")[*] ? (@.type() != "null" && !(@.type() == "string" && @ like_regex "^[a-z0-9]{1,30}_[a-z0-9_]{1,49}$"))')
	)
);

-- Serves the per-user cap of the insert policy and the owner's deletes.
create index if not exists binder_shares_username_idx on binder_shares (username);

-- Supabase grants every right on a new public table to anon and authenticated. A share is a snapshot: nobody updates one, only a signed-in
-- owner inserts or deletes, and the insert grant leaves out `id` and `created_at` so neither can be forged.
revoke insert, update, delete, truncate on binder_shares from anon, authenticated;
grant insert (username, name, pocket_rows, pocket_columns, pages) on binder_shares to authenticated;
grant delete on binder_shares to authenticated;

alter table binder_shares enable row level security;

drop policy if exists "Binder shares are readable by everyone" on binder_shares;
drop policy if exists "Users can share their own binders" on binder_shares;
drop policy if exists "Users can delete their own binder shares" on binder_shares;

create policy "Binder shares are readable by everyone" on binder_shares for select using (true);

-- The count reads the table under its select policy, which is `true`, so the policy does not recurse. Two concurrent inserts can both pass at 19:
-- the cap is a size guard, not an exact quota.
create policy "Users can share their own binders" on binder_shares
	for insert with check (
		exists (select 1 from profiles p where p.username = binder_shares.username and p.auth_id = (select auth.uid()))
		and (select count(*) from binder_shares s where s.username = binder_shares.username) < 20
	);

create policy "Users can delete their own binder shares" on binder_shares
	for delete using (
		exists (select 1 from profiles p where p.username = binder_shares.username and p.auth_id = (select auth.uid()))
	);
