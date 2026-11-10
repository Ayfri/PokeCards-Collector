-- The same card in the three catalogues, in one call: its own link fields plus the first print (lowest `card_code`) of every other language.
-- English and French cards share `tcgdex_id`; a Japanese card stores the English id of its twin in `twin_tcgdex_id`, so that id is the key.
-- Returns NULL for an unknown card, and a language with no twin comes back as JSON null. The columns are the ones a card URL is built from.
create or replace function public.card_versions(p_language text, p_card_code text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
	with own as (
		select card_code, name, set_name, set_id, local_id, tcgdex_id as twin_key
		from public.cards
		where p_language = 'en' and card_code = p_card_code
		union all
		select card_code, name, set_name, set_id, local_id, tcgdex_id
		from public.fr_cards
		where p_language = 'fr' and card_code = p_card_code
		union all
		select card_code, name, set_name, set_id, local_id, twin_tcgdex_id
		from public.jp_cards
		where p_language = 'ja' and card_code = p_card_code
	)
	select jsonb_build_object(
		'own', to_jsonb(own) - 'twin_key',
		'en', case when p_language <> 'en' then (
			select to_jsonb(c) from (
				select card_code, name, set_name, set_id, local_id from public.cards where tcgdex_id = own.twin_key order by card_code limit 1
			) c
		) end,
		'fr', case when p_language <> 'fr' then (
			select to_jsonb(c) from (
				select card_code, name, set_name, set_id, local_id from public.fr_cards where tcgdex_id = own.twin_key order by card_code limit 1
			) c
		) end,
		'ja', case when p_language <> 'ja' then (
			select to_jsonb(c) from (
				select card_code, name, set_name, set_id, local_id from public.jp_cards where twin_tcgdex_id = own.twin_key order by card_code limit 1
			) c
		) end
	)
	from own;
$$;

-- PostgREST publishes the function under /rest/v1/rpc, and EXECUTE is granted to PUBLIC by default.
revoke execute on function public.card_versions(text, text) from public;
grant execute on function public.card_versions(text, text) to anon, authenticated, service_role;
