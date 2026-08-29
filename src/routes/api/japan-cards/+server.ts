import { json } from '@sveltejs/kit';
import { getJapaneseCards, getJapanesePrices, getPokemons, getTypes } from '$helpers/supabase-data';
import { distinctArtists, distinctRarities } from '$helpers/card-grid';
import type { FullCard, Pokemon, PriceData } from '$lib/types';
import type { RequestHandler } from './$types';

/** Everything the Japanese card grid renders. Kept out of the page load so a `?set=` change cannot force it over the wire again. */
export interface JapanCardsPayload {
	allCards: FullCard[];
	artists: string[];
	pokemons: Pokemon[];
	prices: Record<string, PriceData>;
	rarities: string[];
	types: string[];
}

export const GET: RequestHandler = async () => {
	// Japanese cards have their own cardmarket prices, keyed by the same card codes.
	const [allCards, prices, pokemons, types] = await Promise.all([getJapaneseCards(), getJapanesePrices(), getPokemons(), getTypes()]);

	// An artless card is still a real card: deduplicating on `image` hid 8899 of the 12781 Japanese cards.
	// TCGdex gives every card its own art URL, so this only ever removed the cards it has no art for.
	const filteredCards = (allCards as FullCard[]).filter(card => Boolean(card.setName));

	// Derived from the Japanese cards themselves; reading them from `cards` listed rarities and artists this page never shows.
	return json({
		allCards: filteredCards,
		artists: distinctArtists(filteredCards),
		pokemons,
		prices,
		rarities: distinctRarities(filteredCards),
		types,
	} satisfies JapanCardsPayload, {
		headers: { 'cache-control': 'public, max-age=600' },
	});
};
