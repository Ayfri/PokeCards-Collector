import { error } from '@sveltejs/kit';
import { getPokemons } from '$helpers/data';
import type { FullCard, Pokemon } from '$lib/types';
import type { PageServerLoad } from './$types';

// --- Cache for card-specific processed data ---
const MAX_CACHE_SIZE = 50;
const cachedProcessedCardData = new Map<string, any>();

function getCachedProcessedData(key: string): any | undefined {
	return cachedProcessedCardData.get(key);
}

function setCachedProcessedData(key: string, data: any): void {
	cachedProcessedCardData.set(key, data);
	if (cachedProcessedCardData.size > MAX_CACHE_SIZE) {
		const oldestKey = cachedProcessedCardData.keys().next().value;
		if (oldestKey !== undefined) {
			cachedProcessedCardData.delete(oldestKey);
		}
	}
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { cardCode } = params;
	const parentData = await parent(); // Get full parent data structure

	// Resolve streamed data from parent first
	const allCards = await parentData.streamed.allCards || [];
	const prices = await parentData.streamed.prices || {};
	const sets = parentData.sets || [];

	// Extract other necessary layout data (e.g., user, profile, default SEO from parent)
	const layoutPropertiesFromParent = {
		user: parentData.user,
		profile: parentData.profile,
		title: parentData.title, // Parent's default title for fallback
		description: parentData.description, // Parent's default description for fallback
		image: parentData.image, // Parent's default image for fallback
		wishlistItems: parentData.wishlistItems,
		collectionItems: parentData.collectionItems
	};

	// Check cache for processed data for this specific cardCode
	const cachedCardPageSpecificData = getCachedProcessedData(cardCode);
	if (cachedCardPageSpecificData) {
		return {
			...layoutPropertiesFromParent,
			allCards, // Pass resolved global data
			sets,
			prices,
			pokemons: cachedCardPageSpecificData.pokemons, // pokemons list can be part of cached page data
			...cachedCardPageSpecificData, // Spread cached card-specific processed data
		};
	}

	// Load allPokemons if not cached (or handle if it should always be fresh)
	const allPokemons = await getPokemons();

	// Find the specific card by cardCode from the resolved allCards
	const targetCard = allCards.find(c => c.cardCode === cardCode);
	if (!targetCard) {
		throw error(404, `Card with code ${cardCode} not found`);
	}

	// Find the associated Pokémon if it's a Pokémon card
	let associatedPokemon: Pokemon | undefined;
	if (targetCard.supertype?.toLowerCase() === 'pokémon' && targetCard.pokemonNumber) {
		associatedPokemon = allPokemons.find(p => p.id === targetCard.pokemonNumber);
	}

	// Find relevant cards (same Pokémon or same trainer/energy type)
	let relevantCards: FullCard[] = [];
	
	if (associatedPokemon) {
		relevantCards = allCards.filter(c => c.pokemonNumber === associatedPokemon?.id && c.setName);
	} else {
		const normalizedTargetName = targetCard.name.toLowerCase();
		relevantCards = allCards.filter(c => 
			c.name.toLowerCase() === normalizedTargetName && c.setName
		);
	}

	if (relevantCards.length === 0 && targetCard) { // Ensure targetCard exists
		relevantCards = [targetCard];
	}

	// Sort cards by price (highest first)
	relevantCards.sort((a, b) => (prices[b.cardCode]?.simple ?? prices[b.cardCode]?.trend ?? 0) - 
	                           (prices[a.cardCode]?.simple ?? prices[a.cardCode]?.trend ?? 0));

	// Make sure the target card is the first in the array if it exists
	if (targetCard && relevantCards.length > 0 && relevantCards[0].cardCode !== cardCode) {
		const targetIndex = relevantCards.findIndex(c => c.cardCode === cardCode);
		if (targetIndex > 0) {
			const cardToMove = relevantCards.splice(targetIndex, 1)[0];
			relevantCards.unshift(cardToMove);
		}
	}

	// Generate page metadata
	const pageTitle = associatedPokemon 
		? associatedPokemon.name.charAt(0).toUpperCase() + associatedPokemon.name.slice(1)
		: targetCard.name;
		
	const pageDescription = associatedPokemon
		? `${pageTitle} - ${associatedPokemon.description || 'Pokémon Card'}`
		: `Card details for ${targetCard.name}`;
		
	const pageImage = {
		url: targetCard.image || layoutPropertiesFromParent.image?.url || '',
		alt: pageTitle
	};

	// This is the data specific to this card page, to be cached
	const cardPageSpecificData = {
		pokemon: associatedPokemon,
		pokemonCards: relevantCards, // Renamed from relevantCards for clarity on page
		targetCard: targetCard,     // Pass the target card explicitly
		title: pageTitle,
		description: pageDescription,
		image: pageImage,
		pokemons: allPokemons, // Include allPokemons in cache as it's used for this page context
	};

	setCachedProcessedData(cardCode, cardPageSpecificData);
	
	return {
		...layoutPropertiesFromParent,
		allCards, // Pass resolved global data
		sets,
		prices,
		...cardPageSpecificData // Spread card-specific processed data
	};
}; 