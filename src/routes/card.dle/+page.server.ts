import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import type { FullCard, PriceData, Set } from '$lib/types'; // Added Set

// Combined interface for convenience
interface CardOfTheDayInfo extends FullCard {
	price: number; // Simple price
	year: string; // Actual release year from the set
}

// Suggestion items will also need price and year for display
interface CardSuggestionItem extends FullCard {
	pokemonName: string; // Base Pokémon name
	price: number;
	year: string; // Actual release year from the set
}

// Module-scoped variables to hold loaded data
let moduleScopedAllCards: FullCard[] | null = null;
let moduleScopedPrices: Record<string, PriceData> | null = null;
let moduleScopedSetReleaseYearMap: Record<string, string> | null = null; // Map from setName to year string
let cardOfTheDay: CardOfTheDayInfo | null = null; // This remains module-scoped

// Updated to take a Date object or undefined
function extractYear(releaseDate: Date | undefined): string {
	if (!releaseDate) return 'N/A';
	return releaseDate.getFullYear().toString(); // Get year from Date object
}

async function selectDailyCard(allCards: FullCard[], prices: Record<string, PriceData>, setReleaseYearMap: Record<string, string>): Promise<CardOfTheDayInfo | null> {
	const eligibleCards: CardOfTheDayInfo[] = [];

	for (const card of allCards) {
		const priceEntry = prices[card.cardCode];
		const releaseYear = setReleaseYearMap[card.setName]; // Get year from map

		// Exclude cards with pokemonNumber 9999 and ensure price conditions are met
		if (card.pokemonNumber !== 9999 && priceEntry && typeof priceEntry.simple === 'number' && priceEntry.simple >= 4 && releaseYear) {
			eligibleCards.push({
				...card,
				price: priceEntry.simple,
				year: releaseYear
			});
		}
	}

	if (eligibleCards.length === 0) {
		console.error("No eligible cards for Card.dle (for Card of the Day selection) found after filtering!");
		return null;
	}

	const today = new Date();
	const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
	const cardIndex = dayOfYear % eligibleCards.length;
	// Sort eligible cards by year then by cardCode to ensure consistent selection
	eligibleCards.sort((a, b) => {
		const yearComparison = a.year.localeCompare(b.year);
		if (yearComparison !== 0) return yearComparison;
		return a.cardCode.localeCompare(b.cardCode);
	});
	return eligibleCards[cardIndex];
}

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	// Load and store in module scope if not already loaded (or to refresh)
	moduleScopedAllCards = await parentData.streamed.allCards;
	moduleScopedPrices = await parentData.streamed.prices;
	const sets: Set[] = parentData.sets; // Load sets directly

	if (!moduleScopedAllCards || !moduleScopedPrices || !sets) {
		console.error('Card.dle: Critical data (allCards, prices, or sets) not loaded.');
		return {
			...parentData,
			cardOfTheDayForTesting: null,
			cardSuggestions: [] // Ensure cardSuggestions is always an array
		};
	}

	// Create the set release year map
	moduleScopedSetReleaseYearMap = {};
	for (const set of sets) {
		if (set.releaseDate) {
			// The releaseDate from types.d.ts is a Date object. If it's a string from parentData, it needs parsing.
			// Assuming parentData.sets provides Set[] with actual Date objects for releaseDate as per types.d.ts
			moduleScopedSetReleaseYearMap[set.name] = extractYear(new Date(set.releaseDate));
		}
	}

	// Select card of the day using the now module-scoped data
	// This ensures cardOfTheDay is selected based on the latest loaded data
	cardOfTheDay = await selectDailyCard(moduleScopedAllCards, moduleScopedPrices, moduleScopedSetReleaseYearMap);

	// Generate card suggestions: filter for priced cards, add price & year, then sort
	const suggestions: CardSuggestionItem[] = [];
	for (const card of moduleScopedAllCards) {
		const priceEntry = moduleScopedPrices[card.cardCode];
		const releaseYear = moduleScopedSetReleaseYearMap[card.setName]; // Get year from map

		// Exclude cards with pokemonNumber 9999 and ensure they have a price
		if (card.pokemonNumber !== 9999 && priceEntry && typeof priceEntry.simple === 'number' && releaseYear) {
			suggestions.push({
				...card,
				pokemonName: card.name.split(' ')[0],
				price: priceEntry.simple,
				year: releaseYear,
				// image is already part of FullCard
			});
		}
	}

	// Sort by release year (ascending), then by card name for secondary sort
	suggestions.sort((a, b) => {
		const yearComparison = a.year.localeCompare(b.year);
		if (yearComparison !== 0) return yearComparison;
		return a.name.localeCompare(b.name);
	});

	return {
		...parentData,
		cardOfTheDayForTesting: cardOfTheDay,
		cardSuggestions: suggestions // Pass the sorted and filtered suggestions
	};
};

export const actions: Actions = {
	guess: async ({ request }) => {
		if (!moduleScopedAllCards || !moduleScopedPrices || !moduleScopedSetReleaseYearMap) {
			return fail(500, { error: 'Server data not available. Please try refreshing.', cardOfTheDayForTesting: cardOfTheDay });
		}
		if (!cardOfTheDay) {
			cardOfTheDay = await selectDailyCard(moduleScopedAllCards, moduleScopedPrices, moduleScopedSetReleaseYearMap);
			if (!cardOfTheDay) {
				return fail(500, { error: 'Could not determine Card of the Day. Please try again.', cardOfTheDayForTesting: null });
			}
		}

		const formData = await request.formData();
		const guessedCardCode = formData.get('guessedCardId') as string;

		if (!guessedCardCode) {
			return fail(400, { error: 'No card selected for guessing.', cardOfTheDayForTesting: cardOfTheDay });
		}

		const guessedCard = moduleScopedAllCards.find(c => c.cardCode === guessedCardCode);
		const guessedCardPriceEntry = moduleScopedPrices[guessedCardCode];

		if (!guessedCard || !guessedCardPriceEntry || typeof guessedCardPriceEntry.simple !== 'number') {
			return fail(404, { error: 'Guessed card not found or has no price.', cardOfTheDayForTesting: cardOfTheDay });
		}
		if (guessedCard.pokemonNumber === 9999) {
			return fail(400, { error: 'Invalid card selection.', cardOfTheDayForTesting: cardOfTheDay });
		}

		const releaseYearOfGuessedCard = moduleScopedSetReleaseYearMap[guessedCard.setName];
		if (!releaseYearOfGuessedCard) {
			return fail(500, { error: 'Could not determine release year of guessed card.', cardOfTheDayForTesting: cardOfTheDay });
		}

		const guessedCardInfo: CardOfTheDayInfo = {
			...guessedCard,
			price: guessedCardPriceEntry.simple,
			year: releaseYearOfGuessedCard
		};

		const isCardOfTheDayTrainer = cardOfTheDay.supertype === 'Trainer';
		const isGuessedCardTrainer = guessedCardInfo.supertype === 'Trainer';

		let typesCorrectValue: boolean;
		let typesDisplayValue: string;

		if (isCardOfTheDayTrainer && isGuessedCardTrainer) {
			typesCorrectValue = true;
			typesDisplayValue = 'None';
		} else if (isCardOfTheDayTrainer || isGuessedCardTrainer) {
			typesCorrectValue = false;
			typesDisplayValue = isGuessedCardTrainer ? 'None' : guessedCardInfo.types;
		} else {
			typesCorrectValue = guessedCardInfo.types.toLowerCase() === cardOfTheDay.types.toLowerCase();
			typesDisplayValue = guessedCardInfo.types;
		}

		const feedback = {
			pokemonCorrect: guessedCardInfo.pokemonNumber !== undefined && cardOfTheDay.pokemonNumber !== undefined && guessedCardInfo.pokemonNumber === cardOfTheDay.pokemonNumber,
			pokemonValue: guessedCardInfo.name,
			artistCorrect: guessedCardInfo.artist.toLowerCase() === cardOfTheDay.artist.toLowerCase(),
			artistValue: guessedCardInfo.artist,
			setCorrect: guessedCardInfo.setName.toLowerCase() === cardOfTheDay.setName.toLowerCase(),
			setValue: guessedCardInfo.setName,
			yearCorrect: guessedCardInfo.year === cardOfTheDay.year,
			yearValue: guessedCardInfo.year,
			typesCorrect: typesCorrectValue,
			typesValue: typesDisplayValue,
			supertypeCorrect: guessedCardInfo.supertype.toLowerCase() === cardOfTheDay.supertype.toLowerCase(),
			supertypeValue: guessedCardInfo.supertype,
			priceComparison: '',
			priceValue: guessedCardInfo.price,
		};

		if (guessedCardInfo.price > cardOfTheDay.price) {
			feedback.priceComparison = 'higher';
		} else if (guessedCardInfo.price < cardOfTheDay.price) {
			feedback.priceComparison = 'lower';
		} else {
			feedback.priceComparison = 'correct';
		}

		const isCorrectGuess = feedback.pokemonCorrect &&
							   feedback.artistCorrect &&
							   feedback.setCorrect &&
							   feedback.yearCorrect &&
							   feedback.typesCorrect && // Already includes trainer logic
							   feedback.supertypeCorrect && // Added supertype check
							   feedback.priceComparison === 'correct';
		return {
			success: true,
			guessedCardName: guessedCardInfo.name,
			guessedCardImage: guessedCardInfo.image,
			guessedPokemonNumber: guessedCardInfo.pokemonNumber,
			feedback,
			isCorrectGuess,
			cardOfTheDayForTesting: cardOfTheDay
		};
	}
}; 