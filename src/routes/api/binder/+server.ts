import { json } from '@sveltejs/kit';
import { getCards, getPrices } from '$helpers/supabase-data';
import type { BinderCatalogueCard } from '$lib/types';
import type { RequestHandler } from './$types';

/** The binder catalogue, a fifth of the weight of the whole cards plus price table the page used to be handed, and cacheable. */
export const GET: RequestHandler = async () => {
	const [cards, prices] = await Promise.all([getCards(), getPrices()]);

	const payload: BinderCatalogueCard[] = cards.map(card => ({
		cardCode: card.cardCode,
		image: card.image,
		name: card.name,
		price: prices[card.cardCode]?.simple ?? null,
		rarity: card.rarity,
		setName: card.setName,
		types: card.types,
	}));

	return json(payload, { headers: { 'cache-control': 'public, max-age=600' } });
};
