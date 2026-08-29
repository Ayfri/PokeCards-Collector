import { json } from '@sveltejs/kit';
import { getCards, getPrices } from '$helpers/supabase-data';
import type { RequestHandler } from './$types';

/** Below this a card is bulk nobody recognises, so it never shows up in the guess list. */
const MIN_PRICE = 3;

/** The six fields the guess picker draws. The page used to receive whole cards plus the entire catalogue and price table: a 13.7 MB document. */
export interface CardDleSuggestion {
	cardCode: string;
	image: string;
	name: string;
	pokemonName: string;
	pokemonNumber?: number;
	price: number;
}

export const GET: RequestHandler = async () => {
	const [cards, prices] = await Promise.all([getCards(), getPrices()]);

	const suggestions: CardDleSuggestion[] = [];
	for (const card of cards) {
		const price = prices[card.cardCode]?.simple;
		if (!price || price < MIN_PRICE || card.pokemonNumber === 9999) continue;

		suggestions.push({
			cardCode: card.cardCode,
			image: card.image,
			name: card.name,
			pokemonName: card.name.split(' ')[0], // First word of the card name
			pokemonNumber: card.pokemonNumber,
			price,
		});
	}

	// Sorted server-side so the search results read alphabetically without the browser resorting them.
	suggestions.sort((a, b) => a.name.localeCompare(b.name));

	return json(suggestions, { headers: { 'cache-control': 'public, max-age=600' } });
};
