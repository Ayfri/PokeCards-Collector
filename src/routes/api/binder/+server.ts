import { cardPrice } from '#helpers/card-utils.ts';
import { getCards, getPrices } from '#helpers/supabase-data.ts';
import type { BinderCatalogueCard } from '#lib/types.js';
import type { RequestHandler } from './$types';

/** Only the fields the binder draws: a fifth of the weight of the full cards plus price tables, and cacheable. */
export const GET: RequestHandler = async () => {
	const [cards, prices] = await Promise.all([getCards(), getPrices()]);

	const payload: BinderCatalogueCard[] = cards.map(card => ({
		cardCode: card.cardCode,
		image: card.image,
		localId: card.localId,
		name: card.name,
		price: cardPrice(prices[card.cardCode]),
		rarity: card.rarity,
		setId: card.setId,
		setName: card.setName,
		types: card.types,
	}));

	return Response.json(payload, { headers: { 'cache-control': 'public, max-age=600' } });
};
