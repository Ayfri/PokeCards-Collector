-- One row per catalogue (`en`, `ja`, `fr`), bumped by the daily sync and the CLI uploader once a language is written.
-- The site keys its memoized tables on `version`, so a table is read again only after the data moved. A missing row means the site falls back to its fixed TTL.
create table if not exists catalogue_versions (
	language text primary key check (language in ('en', 'ja', 'fr')),
	version text not null,
	updated_at timestamptz not null default now()
);

-- Supabase grants every right on a new public table to anon and authenticated; only the service role writes the versions.
revoke insert, update, delete, truncate on catalogue_versions from anon, authenticated;

alter table catalogue_versions enable row level security;

drop policy if exists "Catalogue is readable by everyone" on catalogue_versions;
create policy "Catalogue is readable by everyone" on catalogue_versions for select using (true);
