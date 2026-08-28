-- Sets are keyed by their TCGdex `set_id`, not by their name: 16 different Japanese sets are called
-- トリプレットビート and 8 more names are shared by two sets, so `name` cannot stay the primary key.
-- `set_name` survives on the card tables as plain denormalized text, the join goes through `set_id`.

do $$
declare
	fk record;
begin
	for fk in
		select conrelid::regclass::text as table_name, conname
		from pg_constraint
		where contype = 'f'
			and conrelid in ('cards'::regclass, 'jp_cards'::regclass)
			and confrelid in ('sets'::regclass, 'jp_sets'::regclass)
	loop
		execute format('alter table %s drop constraint %I', fk.table_name, fk.conname);
	end loop;
end $$;

-- The legacy rows carry no set_id and are replaced by the TCGdex sets in the upload that follows.
delete from sets where set_id is null;
delete from jp_sets where set_id is null;

drop index if exists sets_set_id_key;
drop index if exists jp_sets_set_id_key;

alter table sets alter column set_id set not null;
alter table jp_sets alter column set_id set not null;

alter table sets drop constraint if exists sets_pkey;
alter table jp_sets drop constraint if exists jp_sets_pkey;

alter table sets add primary key (set_id);
alter table jp_sets add primary key (set_id);
