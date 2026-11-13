import { CARD_DLE_MIN_PRICE } from '#helpers/card-dle.ts';
import { cardPrice } from '#helpers/card-utils.ts';
import { compressedJsonResponse, memoizedJson } from '#helpers/grid-payload.ts';
import { getCards, getPrices } from '#helpers/catalogue-data.ts';
import type { CardDleSuggestion } from '#lib/types.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const [cards, prices] = await Promise.all([getCards(), getPrices()]);

	const body = await memoizedJson('suggestions', cards, [prices], () => {
		const suggestions: CardDleSuggestion[] = [];
		for (const card of cards) {
			const price = cardPrice(prices[card.cardCode]);
			if (!price || price < CARD_DLE_MIN_PRICE) continue;

			suggestions.push({
				artist: card.artist,
				cardCode: card.cardCode,
				image: card.image,
				name: card.name,
				...(!card.image && { plate: card }),
				pokemonName: card.name.split(' ')[0],
				pokemonNumber: card.pokemonNumber,
				price,
				rarity: card.rarity,
				setId: card.setId,
				setName: card.setName,
				supertype: card.supertype,
				types: card.types,
			});
		}

		/** Sorted here so the picker lists results alphabetically without the browser sorting them again. */
		return suggestions.sort((a, b) => a.name.localeCompare(b.name));
	});

	return compressedJsonResponse(request, body);
};
