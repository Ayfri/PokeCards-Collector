import type { PageServerLoad } from './$types';
import type { Card, PriceData, Set } from '$lib/types';

// Helper function to get a random card and its details
function getCardDetails(card: Card, prices: Record<string, PriceData>, allSets: Set[]) {
	if (!card) return null;
	const cardPriceDetails = prices[card.cardCode];
	const price = cardPriceDetails?.simple ?? cardPriceDetails?.trend ?? null;
	const cardSet = allSets.find(s => s.name === card.setName);
	const releaseDate = cardSet ? cardSet.releaseDate : null;
	return {
		card,
		price,
		releaseDate
	};
}

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const allCards: Card[] = (await parentData.streamed.allCards) || [];
	const prices: Record<string, PriceData> = (await parentData.streamed.prices) || {};
	const allSets: Set[] = parentData.sets || [];

	const suitableCards = allCards.filter(card => {
		const cardPriceInfo = prices[card.cardCode];
		if (!cardPriceInfo) {
			return false;
		}
		// Determine the price to be used for the game
		const gamePrice = cardPriceInfo.simple ?? cardPriceInfo.trend;

		// Card must have a price, and that price must be >= $3
		return gamePrice !== undefined && gamePrice !== null && gamePrice >= 3;
	});

	if (suitableCards.length === 0) {
		return {
			...parentData,
			allCards,
			prices,
			currentCard: null,
			currentCardPrice: null,
			currentReleaseDate: null,
			nextCard: null,
			nextCardPrice: null,
			nextReleaseDate: null,
			error: 'No cards found with a price of $3 or more.'
		};
	}

	let currentCardData = null;
	let nextCardData = null;

	// Select first random card
	const firstIndex = Math.floor(Math.random() * suitableCards.length);
	const firstCard = suitableCards[firstIndex];
	currentCardData = getCardDetails(firstCard, prices, allSets);

	// Select a second, different random card if possible
	if (suitableCards.length > 1) {
		let secondIndex;
		do {
			secondIndex = Math.floor(Math.random() * suitableCards.length);
		} while (secondIndex === firstIndex);
		const secondCard = suitableCards[secondIndex];
		nextCardData = getCardDetails(secondCard, prices, allSets);
	} else {
		// Not enough cards for a 'next' card, or it might be the same if only one exists
		// To ensure nextCard is truly for a *different* upcoming card, set to null if only one suitable card.
		nextCardData = null;
	}

	return {
		...parentData,
		allCards,
		prices,
		currentCard: currentCardData?.card || null,
		currentCardPrice: currentCardData?.price || null,
		currentReleaseDate: currentCardData?.releaseDate || null,
		nextCard: nextCardData?.card || null,
		nextCardPrice: nextCardData?.price || null,
		nextReleaseDate: nextCardData?.releaseDate || null,
		error: null
	};
}; 