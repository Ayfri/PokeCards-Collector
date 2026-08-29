-- Row level security was never switched on, so the twelve policies on `profiles`, `collections` and
-- `wishlists` were dead weight and the publishable key granted the whole internet read and write access to
-- every table. Run this only after 20260829110000_rls_policies.sql, which is what keeps the catalogue readable.

alter table cards enable row level security;
alter table prices enable row level security;
alter table sets enable row level security;
alter table jp_cards enable row level security;
alter table jp_sets enable row level security;
alter table pokemons enable row level security;
alter table types enable row level security;
alter table profiles enable row level security;
alter table collections enable row level security;
alter table wishlists enable row level security;

-- No policy at all: only the service role reaches it.
alter table cron_restore_project enable row level security;
