import { getCards, getPokemons, getSets } from '$helpers/data';
import type { FullCard, Pokemon } from '$lib/types';
import { error } from '@sveltejs/kit';
import { generateUniqueCardCode } from '$lib/helpers/card-utils';
import type { PageServerLoad } from './$types';

// Cache for optimizing repeated loads
// Keys are composed of identifier_set?_number?
const cachedCardData = new Map<string, any>();

export const load: PageServerLoad = async ({ params, url, parent }) => {
	const { numero: pokemonIdOrCardCode } = params;
	const setCodeParam = url.searchParams.get('set');
	const cardNumberParam = url.searchParams.get('number');

	// Get layout data which contains default SEO values
	const layoutData = await parent();

	const cacheKey = `${pokemonIdOrCardCode}_${setCodeParam || ''}_${cardNumberParam || ''}`;
	// Check cache *after* getting layout data to ensure layout data is always included
	if (cachedCardData.has(cacheKey)) {
		// Combine cached page data with fresh layout data
		const cachedPageData = cachedCardData.get(cacheKey);
		return {
			...layoutData, // Default SEO etc.
			...cachedPageData, // Page specific content
		};
	}

	// --- Initial Data Loading ---
	const allPokemons = await getPokemons();
	const allSets = await getSets();
	const allCards: FullCard[] = await getCards();

	let associatedPokemon: Pokemon | undefined = undefined;
	let relevantCards: FullCard[] = [];
	let targetCard: FullCard | null = null;

	const potentialPokemonId = parseInt(pokemonIdOrCardCode);

	if (!isNaN(potentialPokemonId)) {
		// --- Case 1: Identifier is a Pokemon ID ---
		associatedPokemon = allPokemons.find((p) => p.id === potentialPokemonId);
		if (!associatedPokemon) throw error(404, 'Pokemon not found for this ID');

		relevantCards = allCards.filter((c) => c.pokemonNumber === associatedPokemon!.id && c.setName);
		if (!relevantCards.length) throw error(404, 'No cards found for this Pokemon');

	} else {
		// --- Case 2: Identifier is a Card Code ---
		targetCard = allCards.find(c => c.cardCode === pokemonIdOrCardCode) || null;
		if (!targetCard) throw error(404, 'Card not found for this code');

		if (targetCard.supertype?.toLowerCase() === 'pokémon') {
			associatedPokemon = allPokemons.find((p) => p.id === targetCard?.pokemonNumber);
			if (associatedPokemon) {
				relevantCards = allCards.filter((c) => c.pokemonNumber === associatedPokemon!.id && c.setName);
			} else {
				console.warn(`Pokemon data not found for card ${targetCard.cardCode} (Pokemon ID: ${targetCard.pokemonNumber})`);
				relevantCards = [targetCard]; // Fallback: show only the found card
			}
		} else {
			// It's a Trainer, Energy, etc. card
			const supertype = targetCard.supertype?.toLowerCase();
			if ((supertype === 'energy' || supertype === 'trainer') && targetCard.name) {
				// Find all cards with the same *normalized* name (case-insensitive) and a set name
				const normalizeName = (name: string): string => {
					let lowerName = name.toLowerCase();
					// Remove common prefixes/suffixes (add more as needed)
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
				};

				const normalizedTargetName = normalizeName(targetCard.name);
				relevantCards = allCards.filter(c =>
					normalizeName(c.name) === normalizedTargetName && c.setName
				);
				// Ensure the original target card is included if it got filtered out by normalization
				const isTargetCardIncluded = relevantCards.some(rc => rc.cardCode === targetCard!.cardCode);
				if (!isTargetCardIncluded) {
					// We already checked targetCard.name is truthy, so targetCard itself should be non-null here.
					// Using non-null assertion (!) as the logic guarantees it's safe.
					relevantCards.push(targetCard!);
				}
			} else {
				// For other non-pokemon types or if name is missing, keep the original behavior
				relevantCards = [targetCard];
			}
		}
	}

	// Sort relevant cards (if any)
	if (relevantCards.length > 1) {
		relevantCards.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
	}

	// --- Determine Card to Feature ---
	let cardToFeature: FullCard | null = targetCard; // Prioritize card found by code

	// If identifier was a Pokemon ID, try finding the specific card via URL params
	if (!cardToFeature && associatedPokemon && setCodeParam && cardNumberParam) {
		const expectedCardCode = generateUniqueCardCode(associatedPokemon.id, setCodeParam, cardNumberParam, 'pokemon');
		cardToFeature = relevantCards.find(card => card.cardCode === expectedCardCode) || null;

		// Fallback partial match
		if (!cardToFeature) {
			cardToFeature = relevantCards.find(card =>
				card.cardCode.includes(`_${associatedPokemon?.id}_${setCodeParam.toLowerCase()}_`)
			) || null;
		}
	}

	// --- Reorder Cards ---
	if (cardToFeature && relevantCards.includes(cardToFeature)) {
		const index = relevantCards.indexOf(cardToFeature);
		if (index > 0) {
			relevantCards.splice(index, 1);
			relevantCards.unshift(cardToFeature);
		}
	}

	// If no relevant cards found after all checks, something went wrong (should have been caught earlier)
	if (!relevantCards.length) {
		console.error('No relevant cards found despite initial checks, identifier:', pokemonIdOrCardCode);
		throw error(500, 'Could not determine relevant cards');
	}

	// --- Set Page Metadata --- (Based on the first card in the potentially reordered list)
	const featuredCard = relevantCards[0];
	const featuredPokemon = associatedPokemon || (featuredCard.supertype?.toLowerCase() === 'pokémon' ? allPokemons.find(p => p.id === featuredCard.pokemonNumber) : undefined);

	let pageTitle = 'Card Details'; // Default if no specific title found
	let pageDescription = '';

	if (featuredPokemon) {
		const capitalizedName = featuredPokemon.name.charAt(0).toUpperCase() + featuredPokemon.name.slice(1);
		pageTitle = capitalizedName; // Set specific title
		pageDescription = `${capitalizedName} - ${featuredPokemon.description}`; // Set specific description
	} else {
		pageTitle = featuredCard.name; // Set specific title
		pageDescription = `Card details for ${featuredCard.name}`; // Set specific description
	}

	const pageImage = {
		url: featuredCard?.image || layoutData.image?.url || '', // Fallback to layout image
		alt: pageTitle // Use the generated title as alt text
	};

	// --- Build Evolution Chain (only if a Pokemon is involved) ---
	const evolutionChain = featuredPokemon ? buildEvolutionChain(featuredPokemon, allPokemons) : [];

	// --- Prepare Page Specific Data ---
	const pageSpecificData = {
		cards: relevantCards,
		sets: allSets,
		pokemons: allPokemons,
		pokemon: featuredPokemon,
		evolutionChain,
		// Define the SEO data to potentially override layout defaults
		title: pageTitle,
		description: pageDescription,
		image: pageImage,
	};

	// --- Caching (Cache only page-specific data) ---
	cachedCardData.set(cacheKey, pageSpecificData);
	if (cachedCardData.size > 50) {
		const oldestKey = cachedCardData.keys().next().value;
		if (oldestKey !== undefined) {
			cachedCardData.delete(oldestKey);
		}
	}

	// Combine layout data (defaults) with page-specific data (overrides)
	return {
		...layoutData,
		...pageSpecificData,
	};
};

// Helper function to build the evolution chain
function buildEvolutionChain(currentPokemon: Pokemon, allPokemons: Pokemon[]): Pokemon[] {
	// Find pre-evolutions
	let preEvolution = currentPokemon.evolves_from ?
		allPokemons.find((p) => p.id === currentPokemon.evolves_from) : undefined;
	let prePreEvolution = preEvolution?.evolves_from ?
		allPokemons.find((p) => p.id === preEvolution.evolves_from) : undefined;

	// Find direct evolutions
	const evolutions = currentPokemon.evolves_to
		?.map((evoId) => allPokemons.find((p) => p.id === evoId))
		.filter((p): p is Pokemon => p !== undefined) ?? [];

	// Find subsequent evolutions
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
