import { json } from '@sveltejs/kit';
import { getCards, getPrices, getSets } from '$helpers/supabase-data';
import { searchCards } from '$helpers/card-search';
import type { RequestHandler } from './$types';

/**
 * Ranks the catalogue server-side, where the card list is already memoized, and returns the ten best hits.
 * The header search used to do this in the browser, which forced every page to serialize all 23546 cards.
 */
export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';

	if (!query) return json({ results: [] });

	const [cards, prices, sets] = await Promise.all([getCards(), getPrices(), getSets()]);

	return json({ results: searchCards(query, cards, sets, prices) }, {
		headers: { 'cache-control': 'public, max-age=300' },
	});
};
