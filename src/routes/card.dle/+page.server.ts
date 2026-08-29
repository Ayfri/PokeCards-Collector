import { getCards, getPrices } from '$helpers/supabase-data';
import type { PageServerLoad } from './$types';
import { breadcrumbs, gameSchema } from '$helpers/seo';
import type { FullCard, PriceData } from '$lib/types';

interface CardSuggestion extends FullCard {
	pokemonName: string;
	price: number;
}

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	const [allCards, prices] = await Promise.all([
		getCards(),
		getPrices()
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
		title: 'Card.dle - Daily Pokémon Card Guessing Game',
		description: 'Guess the mystery Pokémon card of the day. Every guess reveals how close you are on set, rarity, type, artist and price. One card a day, the same for everyone, free and without an account.',
		breadcrumbs: breadcrumbs({ name: 'Card.dle', url: '/card.dle' }),
		keywords: ['Pokémon wordle', 'card.dle', 'daily Pokémon card game', 'guess the Pokémon card'],
		schemas: [gameSchema('Card.dle', "A daily Pokémon TCG guessing game: find the mystery card of the day from set, rarity, type, artist and price hints.", '/card.dle')],
	};
};
