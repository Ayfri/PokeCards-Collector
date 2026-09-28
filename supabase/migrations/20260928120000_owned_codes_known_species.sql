-- Repoints the collection and wishlist rows still holding a `pokemon_99999_<set>_<number>` code that no card carries,
-- when exactly one English Pokémon card has that set and number: TCGdex now knows its species, so the card carries the
-- dex id instead. A code matching no card, or several, is left as is.

create temporary table owned_code_moves on commit drop as
select owned.card_code as old_code, min(card.card_code) as new_code
from (select card_code from collections union select card_code from wishlists) owned
join cards card
	on split_part(card.card_code, '_', 1) = 'pokemon'
	and split_part(card.card_code, '_', 3) = split_part(owned.card_code, '_', 3)
	and split_part(card.card_code, '_', 4) = split_part(owned.card_code, '_', 4)
where owned.card_code like 'pokemon\_99999\_%'
	and not exists (select 1 from cards where cards.card_code = owned.card_code)
	and not exists (select 1 from jp_cards where jp_cards.card_code = owned.card_code)
	and not exists (
		select 1 from jp_cards
		where split_part(jp_cards.card_code, '_', 1) = 'pokemon'
			and split_part(jp_cards.card_code, '_', 3) = split_part(owned.card_code, '_', 3)
			and split_part(jp_cards.card_code, '_', 4) = split_part(owned.card_code, '_', 4)
	)
group by owned.card_code
having count(*) = 1;

update collections set card_code = moves.new_code from owned_code_moves moves where collections.card_code = moves.old_code;
update wishlists set card_code = moves.new_code from owned_code_moves moves where wishlists.card_code = moves.old_code;
