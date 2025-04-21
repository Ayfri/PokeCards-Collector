import { error } from '@sveltejs/kit';
import { generateUniqueCardCode } from '$lib/helpers/card-utils';
import { getCards, getPokemons, getSets } from '$helpers/data';
import type { FullCard, Pokemon, Set } from '$lib/types';
import type { PageServerLoad, PageData } from './$types';

// --- Constants ---
const MAX_CACHE_SIZE = 50;

// --- Cache ---
// Keys are composed of identifier_set?_number?
const cachedCardData = new Map<string, any>();

function getCacheKey(pokemonIdOrCardCode: string, setCodeParam: string | null, cardNumberParam: string | null): string {
	return `${pokemonIdOrCardCode}_${setCodeParam || ''}_${cardNumberParam || ''}`;
}

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

// --- Data Loading ---
async function loadAllData() {
	const [allPokemons, allSets, allCards] = await Promise.all([
		getPokemons(),
		getSets(),
		getCards()
	]);
	return { allPokemons, allSets, allCards };
}

// --- Card Finding Logic ---

interface PrimaryTarget {
	associatedPokemon?: Pokemon;
	targetCard?: FullCard;
}

function findPrimaryTarget(identifier: string, allCards: FullCard[], allPokemons: Pokemon[]): PrimaryTarget {
	const potentialPokemonId = parseInt(identifier);

	if (!isNaN(potentialPokemonId)) {
		// Case 1: Identifier is a Pokemon ID
		const associatedPokemon = allPokemons.find((p) => p.id === potentialPokemonId);
		if (!associatedPokemon) throw error(404, 'Pokemon not found for this ID');
		return { associatedPokemon };
	} else {
		// Case 2: Identifier is a Card Code
		const targetCard = allCards.find(c => c.cardCode === identifier);
		if (!targetCard) throw error(404, 'Card not found for this code');

		let associatedPokemon: Pokemon | undefined;
		if (targetCard.supertype?.toLowerCase() === 'pokémon') {
			associatedPokemon = allPokemons.find((p) => p.id === targetCard.pokemonNumber);
			// Don't throw error if Pokemon data is missing for a card, just proceed without it
		}
		return { targetCard, associatedPokemon };
	}
}

function normalizeCardName(name: string): string {
	let lowerName = name.toLowerCase();
	const prefixes = ['basic ', 'special ', 'prism star ', 'ace spec '];
	const suffixes = [' item', ' supporter', ' stadium', ' tool', ' technical machine', ' prism star', ' ace spec']; // Note spaces

	prefixes.forEach(prefix => {
		if (lowerName.startsWith(prefix)) {
			lowerName = lowerName.substring(prefix.length);
		}
	});
	suffixes.forEach(suffix => {
		if (lowerName.endsWith(suffix)) {
			lowerName = lowerName.substring(0, lowerName.length - suffix.length);
		}
	});
	return lowerName.trim();
}

function findRelevantCards(
	primaryTarget: PrimaryTarget,
	allCards: FullCard[]
): FullCard[] {
	const { associatedPokemon, targetCard } = primaryTarget;
	let relevantCards: FullCard[] = [];

	if (associatedPokemon) {
		// Found by Pokemon ID initially, or card code pointed to a Pokemon
		relevantCards = allCards.filter((c) => c.pokemonNumber === associatedPokemon.id && c.setName);
		if (!relevantCards.length && targetCard) {
			// Handle case where Pokemon exists but has no cards with setNames (should be rare)
			// Or if Pokemon data was missing for the target card
			console.warn(`No cards with set names found for Pokemon ID ${associatedPokemon.id}, potentially using fallback.`);
			relevantCards = [targetCard];
		}
	} else if (targetCard) {
		// Found by Card Code, and it's not a Pokemon (or Pokemon data was missing)
		const supertype = targetCard.supertype?.toLowerCase();
		if ((supertype === 'energy' || supertype === 'trainer') && targetCard.name) {
			const normalizedTargetName = normalizeCardName(targetCard.name);
			relevantCards = allCards.filter(c =>
				normalizeCardName(c.name) === normalizedTargetName && c.setName
			);
			const isTargetCardIncluded = relevantCards.some(rc => rc.cardCode === targetCard.cardCode);
			if (!isTargetCardIncluded) {
				relevantCards.push(targetCard); // Add original card if normalization excluded it
			}
		} else {
			// Other non-pokemon types or missing name
			relevantCards = [targetCard];
		}
	}

	if (!relevantCards.length) {
		// This should ideally not happen if findPrimaryTarget succeeded
		throw error(404, 'No relevant cards could be determined.');
	}

	// Sort by price descending by default
	if (relevantCards.length > 1) {
		relevantCards.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
	}

	return relevantCards;
}

function determineFeaturedCard(
	relevantCards: FullCard[],
	primaryTarget: PrimaryTarget,
	setCodeParam: string | null,
	cardNumberParam: string | null
): FullCard | null {
	const { targetCard, associatedPokemon } = primaryTarget;

	// If found by card code initially, that's the featured card
	if (targetCard) return targetCard;

	// If found by Pokemon ID, try to find specific card from URL params
	if (associatedPokemon && setCodeParam && cardNumberParam) {
		const expectedCardCode = generateUniqueCardCode(associatedPokemon.id, setCodeParam, cardNumberParam, 'pokemon');
		let card = relevantCards.find(c => c.cardCode === expectedCardCode);

		// Fallback partial match (less precise)
		if (!card) {
			card = relevantCards.find(c =>
				c.cardCode.includes(`_${associatedPokemon.id}_${setCodeParam.toLowerCase()}_`)
			);
		}
		return card || null;
	}

	// Otherwise, no specific featured card determined (will default to the first relevant card)
	return null;
}

// --- Page Generation Helpers ---

// Helper function to build the evolution chain (already exists)
function buildEvolutionChain(currentPokemon: Pokemon | undefined, allPokemons: Pokemon[]): Pokemon[] {
	if (!currentPokemon) return [];

	let preEvolution = currentPokemon.evolves_from ?
		allPokemons.find((p) => p.id === currentPokemon.evolves_from) : undefined;
	let prePreEvolution = preEvolution?.evolves_from ?
		allPokemons.find((p) => p.id === preEvolution.evolves_from) : undefined;

	const evolutions = currentPokemon.evolves_to
		?.map((evoId) => allPokemons.find((p) => p.id === evoId))
		.filter((p): p is Pokemon => p !== undefined) ?? [];

	const furtherEvolutions = evolutions.flatMap((evo) =>
		evo.evolves_to
			?.map((furtherEvoId) => allPokemons.find((p) => p.id === furtherEvoId))
			.filter((p): p is Pokemon => p !== undefined) ?? []
	);

	const chain: Pokemon[] = [
		...(prePreEvolution ? [prePreEvolution] : []),
		...(preEvolution ? [preEvolution] : []),
		currentPokemon,
		...evolutions,
		...furtherEvolutions
	];

	// Deduplicate the chain
	return chain.filter((pokemon, index, self) =>
		index === self.findIndex((p) => p.id === pokemon.id)
	);
}

interface PageMetadata {
	title: string;
	description: string;
	image: { url: string; alt: string };
}

function generatePageMetadata(
	featuredCard: FullCard,
	associatedPokemon: Pokemon | undefined,
	allPokemons: Pokemon[],
	layoutData: PageData
): PageMetadata {
	const pokemonForMeta = associatedPokemon || (featuredCard.supertype?.toLowerCase() === 'pokémon' ? allPokemons.find(p => p.id === featuredCard.pokemonNumber) : undefined);

	let pageTitle = 'Card Details';
	let pageDescription = '';

	if (pokemonForMeta) {
		const capitalizedName = pokemonForMeta.name.charAt(0).toUpperCase() + pokemonForMeta.name.slice(1);
		pageTitle = capitalizedName;
		pageDescription = `${capitalizedName} - ${pokemonForMeta.description || 'Pokémon Card'}`;
	} else {
		pageTitle = featuredCard.name || 'Card Details';
		pageDescription = `Card details for ${featuredCard.name || 'this card'}`;
	}

	const pageImage = {
		url: featuredCard?.image || layoutData.image?.url || '',
		alt: pageTitle
	};

	return { title: pageTitle, description: pageDescription, image: pageImage };
}

// --- Main Load Function ---

export const load: PageServerLoad = async ({ params, url, parent }) => {
	const { numero: pokemonIdOrCardCode } = params;
	const setCodeParam = url.searchParams.get('set');
	const cardNumberParam = url.searchParams.get('number');

	const layoutData = await parent(); // Get layout data (default SEO etc.)

	// --- Cache Check ---
	const cacheKey = getCacheKey(pokemonIdOrCardCode, setCodeParam, cardNumberParam);
	const cachedPageData = getCachedData(cacheKey);
	if (cachedPageData) {
		return {
			...layoutData,
			...cachedPageData,
		};
	}

	// --- Data Fetching and Processing ---
	const { allPokemons, allSets, allCards } = await loadAllData();

	const primaryTarget = findPrimaryTarget(pokemonIdOrCardCode, allCards, allPokemons);

	let relevantCards = findRelevantCards(primaryTarget, allCards);

	const specificallyFeaturedCard = determineFeaturedCard(
		relevantCards,
		primaryTarget,
		setCodeParam,
		cardNumberParam
	);

	// --- Reorder cards to place the featured one first ---
	const cardToFeature = specificallyFeaturedCard || relevantCards[0]; // Default to first if no specific one found
	if (cardToFeature && relevantCards.includes(cardToFeature)) {
		const index = relevantCards.indexOf(cardToFeature);
		if (index > 0) {
			relevantCards.splice(index, 1);
			relevantCards.unshift(cardToFeature);
		}
	}

	// Ensure we always have at least one card if we reached this point
	if (!relevantCards.length) {
		console.error('No relevant cards found after all processing steps. Identifier:', pokemonIdOrCardCode);
		throw error(500, 'Could not determine relevant cards');
	}

	const finalFeaturedCard = relevantCards[0]; // The card actually displayed first
	const finalAssociatedPokemon = primaryTarget.associatedPokemon || (finalFeaturedCard.supertype?.toLowerCase() === 'pokémon' ? allPokemons.find(p => p.id === finalFeaturedCard.pokemonNumber) : undefined);

	// --- Page Content Generation ---
	const evolutionChain = buildEvolutionChain(finalAssociatedPokemon, allPokemons);
	const pageMetadata = generatePageMetadata(finalFeaturedCard, finalAssociatedPokemon, allPokemons, layoutData);

	const pageSpecificData = {
		cards: relevantCards,
		sets: allSets, // Pass all sets
		pokemons: allPokemons, // Pass all pokemons
		pokemon: finalAssociatedPokemon, // Pass the specific pokemon if applicable
		evolutionChain,
		...pageMetadata, // title, description, image overrides
	};

	// --- Caching ---
	setCachedData(cacheKey, pageSpecificData);

	// --- Return combined data ---
	return {
		...layoutData, // Base layout data (e.g., default SEO)
		...pageSpecificData, // Page-specific data and overrides
	};
};
