import { CARD_DLE_MIN_PRICE } from '#helpers/card-dle.ts';
import { cardPrice } from '#helpers/card-utils.ts';
import { getCards, getPrices } from '#helpers/supabase-data.ts';
import type { FullCard } from '#lib/types.js';
import type { RequestHandler } from './$types';

/** The fields the guess picker draws. Sending whole cards plus the catalogue and price table in the page made a 13.7 MB document. */
export interface CardDleSuggestion {
	cardCode: string;
	image: string;
	name: string;
	/** The whole card, only for a card with no scan: its placeholder plate draws the name, type and kind from it. */
	plate?: FullCard;
	pokemonName: string;
	pokemonNumber?: number;
	price: number;
	setName: string;
}

export const GET: RequestHandler = async () => {
	const [cards, prices] = await Promise.all([getCards(), getPrices()]);

	const suggestions: CardDleSuggestion[] = [];
	for (const card of cards) {
		const price = cardPrice(prices[card.cardCode]);
		if (!price || price < CARD_DLE_MIN_PRICE) continue;

		suggestions.push({
			cardCode: card.cardCode,
			image: card.image,
			name: card.name,
			...(!card.image && { plate: card }),
			pokemonName: card.name.split(' ')[0],
			pokemonNumber: card.pokemonNumber,
			price,
			setName: card.setName,
		});
	}

	/** Sorted here so the picker lists results alphabetically without the browser sorting them again. */
	suggestions.sort((a, b) => a.name.localeCompare(b.name));

	return Response.json(suggestions, { headers: { 'cache-control': 'public, max-age=600' } });
};
