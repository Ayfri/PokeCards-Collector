-- One Discord message per statement on `collections`, `wishlists` and `profiles`, from one function.
-- A row trigger would post one message per row: deleting an account cascades every collection and wishlist row of it, and Discord
-- answers 429 past about 30 messages a minute per webhook, so the burst loses most of them. A statement trigger sees every row of
-- the statement in its transition table, and a statement that touches no row sends nothing.
-- Each webhook URL is a Vault secret named `discord_webhook_<table>`, never written in a migration since the repository is public:
--   select vault.create_secret('https://discord.com/api/webhooks/...', 'discord_webhook_collections');
-- A table with no secret sends nothing. Discord rejects the whole request when a field value is empty, so nullable columns are coalesced.
-- A transition table cannot serve a trigger with two events, hence one trigger per event.
-- Any error is caught and logged as a warning: the trigger runs inside the user's write, which a failed notification must never roll back.

drop trigger if exists discord_webhook_collections on public.collections;
drop trigger if exists discord_webhook_wishlists on public.wishlists;
drop trigger if exists discord_webhook_profiles on public.profiles;
drop function if exists public.process_collections_webhook();
drop function if exists public.process_wishlists_webhook();
drop function if exists public.process_profiles_webhook();

create or replace function public.discord_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	site constant text := 'https://pokecards-collector.ayfri.com';
	url text;
	total integer;
	inserted boolean := tg_op = 'INSERT';
	list text := left(tg_table_name, -1);
	users text[];
	cards jsonb;
	first_card jsonb;
	embed jsonb;
begin
	-- Nothing reads a statement trigger's return value, so every exit returns null.
	select decrypted_secret into url from vault.decrypted_secrets where name = 'discord_webhook_' || tg_table_name;
	if url is null then
		return null;
	end if;
	select count(*), array_agg(distinct username) into total, users from changed;
	if total = 0 then
		return null;
	end if;

	if tg_table_name = 'profiles' then
		embed := jsonb_build_object(
			'title', case
				when total > 1 then format(case when inserted then '🆕 %s new profiles' else '🗑️ %s profiles deleted' end, total)
				when inserted then '🆕 New profile'
				else '🗑️ Profile deleted'
			end,
			'fields', jsonb_build_array(
				jsonb_build_object('name', '👤 User', 'inline', true, 'value', left(case
					-- A deleted profile has no page left to link to.
					when inserted then (select string_agg(format('[%s](%s/profile/%s)', u, site, u), ', ') from unnest(users) u)
					else array_to_string(users, ', ')
				end, 1024)),
				jsonb_build_object('name', '🔒 Visibility', 'inline', true, 'value',
					(select string_agg(case is_public when true then 'Public' when false then 'Private' else 'Unset' end, ', ') from changed)),
				jsonb_build_object('name', '👥 Users', 'inline', true, 'value', format('**%s**', (select count(*) from public.profiles)))
			)
		);
	else
		-- The first ten rows only, a cascade from a deleted account can carry hundreds. English wins a code the Japanese catalogue shares.
		select jsonb_agg(jsonb_build_object(
			'label', case when card.name is null then format('`%s`', entry.card_code)
				else format('**%s** · %s #%s %s', card.name, card.set_name, card.local_id, case card.lang when 'en' then '🇬🇧' when 'ja' then '🇯🇵' else '🇫🇷' end) end,
			'image', case when card.image like 'https://assets.tcgdex.net/%' then card.image || '/low.png' else card.image end,
			'trend', card.trend
		) order by entry.created_at)
		into cards
		from (select card_code, created_at from changed order by created_at limit 10) entry
		left join lateral (
			select 1 priority, 'en' lang, c.name, c.set_name, c.local_id, c.image, (select p.trend from public.prices p where p.card_code = c.card_code) trend
				from public.cards c where c.card_code = entry.card_code
			union all select 2, 'ja', c.name, c.set_name, c.local_id, c.image, (select p.trend from public.jp_prices p where p.card_code = c.card_code)
				from public.jp_cards c where c.card_code = entry.card_code
			union all select 3, 'fr', c.name, c.set_name, c.local_id, c.image, (select p.trend from public.fr_prices p where p.card_code = c.card_code)
				from public.fr_cards c where c.card_code = entry.card_code
			order by priority limit 1
		) card on true;
		first_card := cards -> 0;

		embed := jsonb_build_object(
			'title', format(
				case when inserted then '%s %s added to a %s' else '🗑️ %2$s removed from a %3$s' end,
				case when tg_table_name = 'collections' then '📥' else '📌' end,
				case when total = 1 then 'Card' else format('%s cards', total) end,
				list
			),
			'thumbnail', case when total = 1 and first_card ->> 'image' is not null then jsonb_build_object('url', first_card ->> 'image') end,
			'fields', jsonb_build_array(
				jsonb_build_object('name', '👤 User', 'inline', true, 'value',
					left((select string_agg(format('[%s](%s/%s/%s)', u, site, list, u), ', ') from unnest(users) u), 1024)),
				-- The size after the change, since the trigger runs after the statement.
				jsonb_build_object('name', format('📚 %s', initcap(list)), 'inline', true, 'value', case when cardinality(users) = 1 then format('**%s** cards',
					case when tg_table_name = 'collections' then (select count(*) from public.collections c where c.username = users[1])
					else (select count(*) from public.wishlists w where w.username = users[1]) end) else '-' end)
			) || case when total = 1 and first_card ->> 'trend' is not null
				then jsonb_build_array(jsonb_build_object('name', '<:pcc_price:1570872881397629028> Trend', 'inline', true, 'value', format('**%s €**', to_char((first_card ->> 'trend')::numeric, 'FM999990.00'))))
				else '[]'::jsonb end
			|| jsonb_build_array(jsonb_build_object('name', case when total = 1 then '<:pcc_card:1570872888242995363> Card' else '<:pcc_card:1570872888242995363> Cards' end, 'inline', false, 'value',
				(select string_agg(card ->> 'label', E'\n') from jsonb_array_elements(cards) card) || case when total > 10 then format(E'\n+%s more', total - 10) else '' end))
		);
	end if;

	perform net.http_post(
		url := url,
		headers := '{"Content-Type": "application/json"}'::jsonb,
		body := jsonb_build_object('embeds', jsonb_build_array(jsonb_strip_nulls(embed || jsonb_build_object(
			'color', case when inserted then 5763719 else 15548997 end,
			'timestamp', now()
		))))
	);
	return null;
exception when others then
	raise warning 'discord_webhook on %: %', tg_table_name, sqlerrm;
	return null;
end;
$$;

-- A trigger fires without EXECUTE, and PostgREST would otherwise publish the function under /rest/v1/rpc.
revoke execute on function public.discord_webhook() from public, anon, authenticated;

create or replace trigger discord_webhook_collections_insert after insert on public.collections
	referencing new table as changed for each statement execute function public.discord_webhook();
create or replace trigger discord_webhook_collections_delete after delete on public.collections
	referencing old table as changed for each statement execute function public.discord_webhook();
create or replace trigger discord_webhook_wishlists_insert after insert on public.wishlists
	referencing new table as changed for each statement execute function public.discord_webhook();
create or replace trigger discord_webhook_wishlists_delete after delete on public.wishlists
	referencing old table as changed for each statement execute function public.discord_webhook();
create or replace trigger discord_webhook_profiles_insert after insert on public.profiles
	referencing new table as changed for each statement execute function public.discord_webhook();
create or replace trigger discord_webhook_profiles_delete after delete on public.profiles
	referencing old table as changed for each statement execute function public.discord_webhook();
