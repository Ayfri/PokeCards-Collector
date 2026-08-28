import type { PageServerLoad } from './$types';
import type { FullCard, PriceData } from '$lib/types';

interface CardSuggestion extends FullCard {
	pokemonName: string;
	price: number;
}

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	// Wait for the layout streamed data to resolve
	const [allCards, prices] = await Promise.all([
		parentData.streamed.allCards,
		parentData.streamed.prices
	]);

	if (!allCards || !prices) {
		console.error('Card.dle: critical data failed to load.');
		return {
			...parentData,
			cardSuggestions: [],
			allCards,
			prices
		};
	}

	// Keep only the cards that can be guessed: real Pokémon cards worth at least 3 EUR
	const suggestions: CardSuggestion[] = [];
	for (const card of allCards) {
		const priceEntry = prices[card.cardCode];

		if (card.pokemonNumber !== 9999 && priceEntry?.simple && priceEntry.simple >= 3) {
			suggestions.push({
				...card,
				pokemonName: card.name.split(' ')[0], // First word of the card name
				price: priceEntry.simple
			});
		}
	}

	// Sort by name so the search results read alphabetically
	suggestions.sort((a, b) => a.name.localeCompare(b.name));

	return {
		...parentData,
		cardSuggestions: suggestions,
		allCards,
		prices,
		title: 'Card.dle - PokéCards-Collector',
		description: "Guess today's mystery Pokémon card!",
	};
};
