import { BY_GRID } from '#helpers/catalogues.ts';
import { getCards, getPokemons, getPrices, getTypes } from '#helpers/supabase-data.ts';
import { gridResponse } from '#helpers/grid-payload.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request }) => {
	const { language } = BY_GRID[params.grid];

	/** Each catalogue has its own Cardmarket prices, keyed by the same card codes. */
	const [cards, prices, pokemons, types] = await Promise.all([getCards(language), getPrices(language), getPokemons(), getTypes()]);
	return gridResponse(request, cards, prices, pokemons, types);
};
