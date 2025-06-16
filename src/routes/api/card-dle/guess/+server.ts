import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { FullCard, PriceData, Set } from '$lib/types';
import { getCards, getPrices, getSets } from '$helpers/data';

// Combined interface for convenience
interface CardOfTheDayInfo extends FullCard {
	price: number; // Simple price
	year: string; // Actual release year from the set
}

// Cache data in memory for this API route
let apiScopedAllCards: FullCard[] | null = null;
let apiScopedPrices: Record<string, PriceData> | null = null;
let apiScopedSetReleaseYearMap: Record<string, string> | null = null;
let apiScopedCardIndex: Map<string, FullCard> | null = null;
let apiCardOfTheDay: CardOfTheDayInfo | null = null;

// Cache timestamp to refresh data periodically (1 hour)
let lastDataLoad = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function extractYear(releaseDate: Date | undefined): string {
	if (!releaseDate) return 'N/A';
	return releaseDate.getFullYear().toString();
}

async function loadDataIfNeeded(): Promise<boolean> {
	const now = Date.now();

	// Return early if data is fresh
	if (apiScopedAllCards && apiScopedPrices && apiScopedSetReleaseYearMap &&
		apiScopedCardIndex && (now - lastDataLoad) < CACHE_TTL) {
		return true;
	}

	try {
		console.log('🔄 [CARD.DLE API] Loading fresh data...');
		const loadStart = performance.now();

		// Load data concurrently
		const [allCards, prices, sets] = await Promise.all([
			getCards(),
			getPrices(),
			getSets()
		]);

		// Store in API scope
		apiScopedAllCards = allCards;
		apiScopedPrices = prices;

		// Create card index for fast lookup
		apiScopedCardIndex = new Map();
		for (const card of allCards) {
			apiScopedCardIndex.set(card.cardCode, card);
		}

		// Create set release year map
		apiScopedSetReleaseYearMap = {};
		for (const set of sets) {
			if (set.releaseDate) {
				apiScopedSetReleaseYearMap[set.name] = extractYear(set.releaseDate);
			}
		}

		lastDataLoad = now;

		const loadEnd = performance.now();
		console.log(`✅ [CARD.DLE API] Data loaded in ${(loadEnd - loadStart).toFixed(2)}ms`);

		return true;
	} catch (error) {
		console.error('❌ [CARD.DLE API] Failed to load data:', error);
		return false;
	}
}

async function selectDailyCard(): Promise<CardOfTheDayInfo | null> {
	if (!apiScopedAllCards || !apiScopedPrices || !apiScopedSetReleaseYearMap) {
		return null;
	}

	const eligibleCards: CardOfTheDayInfo[] = [];

	for (const card of apiScopedAllCards) {
		const priceEntry = apiScopedPrices[card.cardCode];
		const releaseYear = apiScopedSetReleaseYearMap[card.setName];

		if (card.pokemonNumber !== 9999 && priceEntry && typeof priceEntry.simple === 'number' && priceEntry.simple >= 4 && releaseYear) {
			eligibleCards.push({
				...card,
				price: priceEntry.simple,
				year: releaseYear
			});
		}
	}

	if (eligibleCards.length === 0) {
		console.error("No eligible cards for Card.dle found!");
		return null;
	}

	const today = new Date();
	const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

	// Sort for consistent selection
	eligibleCards.sort((a, b) => {
		const yearComparison = a.year.localeCompare(b.year);
		if (yearComparison !== 0) return yearComparison;
		return a.cardCode.localeCompare(b.cardCode);
	});

	const cardIndex = dayOfYear % eligibleCards.length;
	return eligibleCards[cardIndex];
}

export const POST: RequestHandler = async ({ request }) => {
	const startTime = performance.now();

	try {
		// Load data if needed
		const dataLoaded = await loadDataIfNeeded();
		if (!dataLoaded) {
			return json({ error: 'Failed to load game data' }, { status: 500 });
		}

		// Ensure card of the day is selected
		if (!apiCardOfTheDay) {
			apiCardOfTheDay = await selectDailyCard();
			if (!apiCardOfTheDay) {
				return json({ error: 'Could not determine Card of the Day' }, { status: 500 });
			}
		}

		const formData = await request.formData();
		const guessedCardCode = formData.get('guessedCardId') as string;

		if (!guessedCardCode) {
			return json({ error: 'No card selected for guessing' }, { status: 400 });
		}

		// Fast lookup
		const guessedCard = apiScopedCardIndex!.get(guessedCardCode);
		const guessedCardPriceEntry = apiScopedPrices![guessedCardCode];

		if (!guessedCard || !guessedCardPriceEntry || typeof guessedCardPriceEntry.simple !== 'number') {
			return json({ error: 'Guessed card not found or has no price' }, { status: 404 });
		}

		if (guessedCard.pokemonNumber === 9999) {
			return json({ error: 'Invalid card selection' }, { status: 400 });
		}

		const releaseYearOfGuessedCard = apiScopedSetReleaseYearMap![guessedCard.setName];
		if (!releaseYearOfGuessedCard) {
			return json({ error: 'Could not determine release year of guessed card' }, { status: 500 });
		}

		const guessedCardInfo: CardOfTheDayInfo = {
			...guessedCard,
			price: guessedCardPriceEntry.simple,
			year: releaseYearOfGuessedCard
		};

		// Calculate feedback
		const isCardOfTheDayTrainer = apiCardOfTheDay.supertype === 'Trainer';
		const isGuessedCardTrainer = guessedCardInfo.supertype === 'Trainer';
		const bothTrainers = isCardOfTheDayTrainer && isGuessedCardTrainer;
		const anyTrainer = isCardOfTheDayTrainer || isGuessedCardTrainer;

		const typesCorrectValue = bothTrainers || (!anyTrainer && guessedCardInfo.types.toLowerCase() === apiCardOfTheDay.types.toLowerCase());
		const typesDisplayValue = anyTrainer && !bothTrainers ? (isGuessedCardTrainer ? 'None' : guessedCardInfo.types) :
								  bothTrainers ? 'None' : guessedCardInfo.types;

		const priceDiff = guessedCardInfo.price - apiCardOfTheDay.price;
		const priceComparison = priceDiff > 0 ? 'higher' : priceDiff < 0 ? 'lower' : 'correct';

		const feedback = {
			pokemonCorrect: guessedCardInfo.pokemonNumber !== undefined && apiCardOfTheDay.pokemonNumber !== undefined && guessedCardInfo.pokemonNumber === apiCardOfTheDay.pokemonNumber,
			pokemonValue: guessedCardInfo.name,
			artistCorrect: guessedCardInfo.artist.toLowerCase() === apiCardOfTheDay.artist.toLowerCase(),
			artistValue: guessedCardInfo.artist,
			setCorrect: guessedCardInfo.setName.toLowerCase() === apiCardOfTheDay.setName.toLowerCase(),
			setValue: guessedCardInfo.setName,
			yearCorrect: guessedCardInfo.year === apiCardOfTheDay.year,
			yearValue: guessedCardInfo.year,
			typesCorrect: typesCorrectValue,
			typesValue: typesDisplayValue,
			supertypeCorrect: guessedCardInfo.supertype.toLowerCase() === apiCardOfTheDay.supertype.toLowerCase(),
			supertypeValue: guessedCardInfo.supertype,
			priceComparison,
			priceValue: guessedCardInfo.price,
		};

		const isCorrectGuess = feedback.pokemonCorrect &&
							   feedback.artistCorrect &&
							   feedback.setCorrect &&
							   feedback.yearCorrect &&
							   feedback.typesCorrect &&
							   feedback.supertypeCorrect &&
							   feedback.priceComparison === 'correct';

		const totalTime = performance.now();
		console.log(`⚡ [CARD.DLE API] Guess processed in ${(totalTime - startTime).toFixed(2)}ms`);

		return json({
			success: true,
			guessedCardName: guessedCardInfo.name,
			guessedCardImage: guessedCardInfo.image,
			guessedPokemonNumber: guessedCardInfo.pokemonNumber,
			feedback,
			isCorrectGuess,
			cardOfTheDayForTesting: apiCardOfTheDay
		});

	} catch (error) {
		console.error('❌ [CARD.DLE API] Error processing guess:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
