import { cardPrice } from '#helpers/card-utils.ts';
import { compressedJsonResponse, memoizedJson } from '#helpers/grid-payload.ts';
import { getCards, getPrices } from '#helpers/supabase-data.ts';
import type { BinderCatalogueCard } from '#lib/types.js';
import type { RequestHandler } from './$types';

/** Only the fields the binder draws: a fifth of the weight of the full cards plus price tables, and cacheable. */
export const GET: RequestHandler = async ({ request }) => {
	const [cards, prices] = await Promise.all([getCards(), getPrices()]);

	const body = await memoizedJson('binder', cards, [prices], () => cards.map((card): BinderCatalogueCard => ({
		cardCode: card.cardCode,
		image: card.image,
		localId: card.localId,
		name: card.name,
		price: cardPrice(prices[card.cardCode]),
		rarity: card.rarity,
		setId: card.setId,
		setName: card.setName,
		types: card.types,
	})));

	return compressedJsonResponse(request, body);
};
