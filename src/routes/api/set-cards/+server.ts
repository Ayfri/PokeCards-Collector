import { isLanguage } from '#helpers/catalogues.ts';
import { setGridResponse } from '#helpers/grid-payload.ts';
import { getCards, getPokemons, getPrices, getTypes } from '#helpers/catalogue-data.ts';
import type { RequestHandler } from './$types';

/** The cards of one set in the grid payload shape, for the grid under a set page's checklist. */
export const GET: RequestHandler = async ({ url }) => {
	const language = url.searchParams.get('language');
	const setId = url.searchParams.get('set');

	if (!isLanguage(language)) return Response.json({ error: 'Unknown language' }, { status: 400 });
	if (!setId) return Response.json({ error: 'Missing set' }, { status: 400 });

	const [cards, prices, pokemons, types] = await Promise.all([getCards(language), getPrices(language), getPokemons(), getTypes()]);
	return setGridResponse(cards, prices, pokemons, types, setId);
};
