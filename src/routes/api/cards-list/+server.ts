import { json } from '@sveltejs/kit';
import { getCards, getPokemons, getPrices, getTypes } from '$helpers/supabase-data';
import { distinctArtists, distinctRarities } from '$helpers/card-grid';
import type { FullCard, Pokemon, PriceData } from '$lib/types';
import type { RequestHandler } from './$types';

/** Everything the card grid renders. Kept out of the page load so a `?set=` change cannot force it over the wire again. */
export interface CardsListPayload {
	artists: string[];
	cards: FullCard[];
	pokemons: Pokemon[];
	prices: Record<string, PriceData>;
	rarities: string[];
	types: string[];
}

export const GET: RequestHandler = async () => {
	const [cards, prices, pokemons, types] = await Promise.all([getCards(), getPrices(), getPokemons(), getTypes()]);

	// An artless card is still a real card: deduplicating on `image` hid 1717 of them from the list.
	// TCGdex gives every card its own art URL, so this only ever removed the cards it has no art for.
	const visibleCards = ((cards ?? []) as FullCard[]).filter(card => Boolean(card.setName));

	// The rarity and artist lists are derived from these cards rather than read back from Postgres, which cost a full scan of `cards` each.
	return json({
		artists: distinctArtists(visibleCards),
		cards: visibleCards,
		pokemons,
		prices: prices ?? {},
		rarities: distinctRarities(visibleCards),
		types,
	} satisfies CardsListPayload, {
		headers: { 'cache-control': 'public, max-age=600' },
	});
};
