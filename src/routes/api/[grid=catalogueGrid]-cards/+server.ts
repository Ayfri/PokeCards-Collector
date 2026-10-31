import { json } from '@sveltejs/kit';
import { BY_GRID } from '$helpers/catalogues';
import { getCards, getPokemons, getPrices, getTypes } from '$helpers/supabase-data';
import { distinctArtists, distinctRarities } from '$helpers/card-grid';
import type { FullCard, Pokemon, PriceData } from '$lib/types';
import type { RequestHandler } from './$types';

/** Everything a catalogue card grid renders. Kept out of the page load so a `?set=` change cannot force it over the wire again. */
export interface CatalogueCardsPayload {
	allCards: FullCard[];
	artists: string[];
	pokemons: Pokemon[];
	prices: Record<string, PriceData>;
	rarities: string[];
	types: string[];
}

export const GET: RequestHandler = async ({ params }) => {
	const { language } = BY_GRID[params.grid];

	/** Each catalogue has its own cardmarket prices, keyed by the same card codes. */
	const [allCards, prices, pokemons, types] = await Promise.all([getCards(language), getPrices(language), getPokemons(), getTypes()]);

	// An artless card is still a real card: deduplicating on `image` hid 8899 of the 12781 Japanese cards.
	// TCGdex gives every card its own art URL, so this only ever removed the cards it has no art for.
	const filteredCards = allCards.filter(card => Boolean(card.setName));

	/** Derived from the catalogue's own cards; reading them from `cards` listed rarities and artists this page never shows. */
	return json({
		allCards: filteredCards,
		artists: distinctArtists(filteredCards),
		pokemons,
		prices,
		rarities: distinctRarities(filteredCards),
		types,
	} satisfies CatalogueCardsPayload, {
		headers: { 'cache-control': 'public, max-age=600' },
	});
};
