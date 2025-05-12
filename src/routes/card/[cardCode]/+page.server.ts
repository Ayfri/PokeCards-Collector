import { error } from '@sveltejs/kit';
import { getPokemons } from '$helpers/data';
import type { FullCard, Pokemon } from '$lib/types';
import type { PageServerLoad } from './$types';


// --- Cache ---
const MAX_CACHE_SIZE = 50;
const cachedCardData = new Map<string, any>();

function getCachedData(key: string): any | undefined {
	return cachedCardData.get(key);
}

function setCachedData(key: string, data: any): void {
	cachedCardData.set(key, data);
	if (cachedCardData.size > MAX_CACHE_SIZE) {
		const oldestKey = cachedCardData.keys().next().value;
		if (oldestKey !== undefined) {
			cachedCardData.delete(oldestKey);
		}
	}
}

export const load: PageServerLoad = async ({ params, parent }) => {
	console.log(`[${new Date().toISOString()}] card/[cardCode]/+page.server.ts`);
	const { cardCode } = params;
	const layoutData = await parent(); // Get layout data (default SEO etc.)

	// Check cache first
	const cachedPageData = getCachedData(cardCode);
	if (cachedPageData) {
		return {
			...layoutData,
			...cachedPageData,
		};
	}

	// Load all necessary data
	const allPokemons = await getPokemons();
	const allCards = layoutData.allCards;
	const allPrices = layoutData.prices;
	const allSets = layoutData.sets;

	// Find the specific card by cardCode
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
		// For Pokémon cards, show all variants of the same Pokémon
		relevantCards = allCards.filter(c => c.pokemonNumber === associatedPokemon?.id && c.setName);
	} else {
		// For non-Pokémon cards, show cards with the same name
		const normalizedTargetName = targetCard.name.toLowerCase();
		relevantCards = allCards.filter(c => 
			c.name.toLowerCase() === normalizedTargetName && c.setName
		);
	}

	// If no other cards found, at least include the target card
	if (relevantCards.length === 0) {
		relevantCards = [targetCard];
	}

	// Sort cards by price (highest first)
	relevantCards.sort((a, b) => (allPrices[b.cardCode]?.simple ?? 0) - (allPrices[a.cardCode]?.simple ?? 0));

	// Make sure the target card is the first in the array
	if (relevantCards[0].cardCode !== cardCode) {
		const targetIndex = relevantCards.findIndex(c => c.cardCode === cardCode);
		if (targetIndex > 0) {
			const card = relevantCards.splice(targetIndex, 1)[0];
			relevantCards.unshift(card);
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
		url: targetCard.image || layoutData.image || '',
		alt: pageTitle
	};

	const pageData = {
		allCards: allCards,
		sets: allSets,
		pokemons: allPokemons,
		pokemon: associatedPokemon,
		pokemonCards: relevantCards,
		prices: allPrices,
		title: pageTitle,
		description: pageDescription,
		image: pageImage
	};

	// Cache the result
	setCachedData(cardCode, pageData);
	
	return {
		...layoutData,
		...pageData
	};
}; 