-- The site reads content-addressed R2 snapshots whose object keys replace the per-language versions, and the publisher precomputes the twins
-- `card_versions` returned. Neither the table nor the function has a reader left. Apply it by hand after the site deploy that reads R2.
drop function if exists public.card_versions(text, text);
drop table if exists public.catalogue_versions;
