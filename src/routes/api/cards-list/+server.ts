import { getCards, getPokemons, getPrices, getTypes } from '$helpers/supabase-data';
import { gridResponse } from '$helpers/grid-payload';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const [cards, prices, pokemons, types] = await Promise.all([getCards(), getPrices(), getPokemons(), getTypes()]);
	return gridResponse(request, cards, prices, pokemons, types);
};
