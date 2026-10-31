-- A user updates only their profile's visibility and colour: the username is rendered on public pages and keys their
-- collection and wishlist rows, so it never changes through the REST API and only ever holds the characters signup allows.
revoke update on profiles from anon, authenticated;
grant update (is_public, profile_color) on profiles to authenticated;

alter table profiles drop constraint if exists profiles_username_format;
alter table profiles add constraint profiles_username_format check (username ~ '^[a-z0-9_-]{3,20}$');
