import { getCards, getPokemons, getPrices, getSets } from '#helpers/supabase-data.ts';
import { searchCards, searchPokemons } from '#helpers/card-search.ts';
import type { RequestHandler } from './$types';

const MAX_LENGTH = 64;
const MAX_WORDS = 6;

/**
 * Ranks the catalogue server-side, where the card list is already memoized, and returns the ten best cards and the
 * three best Pokémon species.
 * Ranking in the browser would force every page to serialize all 23546 cards.
 */
export const GET: RequestHandler = async ({ url }) => {
	/** Scoring tries every name/set split of the query against every card, so its cost grows with the square of the word count. */
	const query = url.searchParams.get('q')?.trim().split(/\s+/, MAX_WORDS).join(' ').slice(0, MAX_LENGTH).trim() ?? '';

	if (!query) return Response.json({ pokemons: [], results: [] });

	const [cards, pokemons, prices, sets] = await Promise.all([getCards(), getPokemons(), getPrices(), getSets()]);

	return Response.json({ pokemons: searchPokemons(query, pokemons, cards), results: searchCards(query, cards, sets, prices) }, {
		headers: { 'cache-control': 'public, max-age=300' },
	});
};
