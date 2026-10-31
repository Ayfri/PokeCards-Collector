import { BY_GRID } from '$helpers/catalogues';
import { getCards, getPokemons, getPrices, getTypes } from '$helpers/supabase-data';
import { gridResponse } from '$helpers/grid-payload';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request }) => {
	const { language } = BY_GRID[params.grid];

	/** Each catalogue has its own cardmarket prices, keyed by the same card codes. */
	const [cards, prices, pokemons, types] = await Promise.all([getCards(language), getPrices(language), getPokemons(), getTypes()]);
	return gridResponse(request, cards, prices, pokemons, types);
};
