import { getCards, getPokemons, getSets } from '$helpers/data';
import type { FullCard, Pokemon } from '$lib/types';
import { error } from '@sveltejs/kit';
import { generateUniqueCardCode } from '$lib/helpers/card-utils';

// Cache for optimizing repeated loads
// Keys can be pokemon ID (number) or card code (string)
const cachedCardData = new Map<string | number, any>();

export const load = async ({ params, url }) => {
	const identifier = params.numero; // Parameter can be ID or cardCode
	const setCodeParam = url.searchParams.get('set');
	const cardNumberParam = url.searchParams.get('number');

	// Generate a cache key based on identifier and specific card params
	const cacheKey = `${identifier}_${setCodeParam || ''}_${cardNumberParam || ''}`;
	if (cachedCardData.has(cacheKey)) {
		return cachedCardData.get(cacheKey);
	}

	// --- Data Loading ---
	const allPokemons = await getPokemons();
	const allSets = await getSets();
	const allCards: FullCard[] = await getCards();

	let targetCard: FullCard | null = null;
	let associatedPokemon: Pokemon | undefined = undefined;
	let relevantCards: FullCard[] = [];
	let evolutionChain: Pokemon[] = [];
	let pageTitle = 'Card Details';
	let pageDescription = '';
	let pageImage = { url: '', alt: '' };

	const potentialPokemonId = parseInt(identifier);

	// --- Logic Branching: Pokemon ID vs Card Code ---
	if (!isNaN(potentialPokemonId)) {
		// --- Case 1: Identifier is a Pokemon ID ---
		associatedPokemon = allPokemons.find((p) => p.id === potentialPokemonId);
		if (!associatedPokemon) {
			throw error(404, 'Pokemon not found for this ID');
		}

		// Filter cards for this Pokemon
		relevantCards = allCards.filter(
			(c) => c.pokemonNumber === associatedPokemon?.id && c.setName // Ensure card has a set
		);

		if (!relevantCards.length) {
			throw error(404, 'No cards found for this Pokemon');
		}

		// Initial sort (e.g., by price descending)
		relevantCards.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

		// Build evolution chain
		evolutionChain = buildEvolutionChain(associatedPokemon, allPokemons);

		// Set page metadata for Pokemon
		const capitalizedPokemonName = associatedPokemon.name.charAt(0).toUpperCase() + associatedPokemon.name.slice(1);
		pageTitle = capitalizedPokemonName;
		pageDescription = `${capitalizedPokemonName} - ${associatedPokemon.description}`;
		// Image will be set after potential reordering

	} else {
		// --- Case 2: Identifier is potentially a Card Code ---
		const potentialCardCode = identifier;
		const foundCard = allCards.find(c => c.cardCode === potentialCardCode);

		if (!foundCard) {
			throw error(404, 'Card not found for this code');
		}

		targetCard = foundCard; // This is the primary card we looked for

		if (foundCard.supertype?.toLowerCase() === 'pokémon') {
			// It's a Pokémon card, load associated Pokemon data
			associatedPokemon = allPokemons.find((p) => p.id === foundCard.pokemonNumber);
			if (!associatedPokemon) {
				// This should ideally not happen if card data is consistent
				console.warn(`Pokemon data not found for card ${foundCard.cardCode} (Pokemon ID: ${foundCard.pokemonNumber})`);
				relevantCards = [foundCard]; // Only show the found card
			} else {
				// Load all cards for this Pokemon
				relevantCards = allCards.filter(
					(c) => c.pokemonNumber === associatedPokemon?.id && c.setName // Ensure card has a set
				);
				relevantCards.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); // Sort them
				evolutionChain = buildEvolutionChain(associatedPokemon, allPokemons);

				// Set page metadata for Pokemon
				const capitalizedPokemonName = associatedPokemon.name.charAt(0).toUpperCase() + associatedPokemon.name.slice(1);
				pageTitle = capitalizedPokemonName;
				pageDescription = `${capitalizedPokemonName} - ${associatedPokemon.description}`;
			}
		} else {
			// It's a Trainer, Energy, etc. card
			relevantCards = [foundCard]; // Only this card is relevant
			// Set page metadata for the specific card
			pageTitle = foundCard.name;
			// Ensure description is always a string, checking for 'rules' property safely
			const cardRules = (foundCard as any).rules;
			pageDescription = Array.isArray(cardRules) ? cardRules.join('\n') : `Card details for ${foundCard.name}`;
		}
	}

	// --- Reorder cards based on URL parameters (set/number) ---
	let cardToFeature = targetCard; // Use the card found via cardCode if applicable

	if (!cardToFeature && setCodeParam && cardNumberParam && associatedPokemon) {
		// If we didn't find via cardCode, try finding via set/number (only makes sense for Pokemon)
		const expectedCardCode = generateUniqueCardCode(associatedPokemon.id, setCodeParam, cardNumberParam, 'pokemon');
		// Convert undefined from find() to null
		cardToFeature = relevantCards.find(card => card.cardCode === expectedCardCode) || null;

		// Fallback partial match (less reliable)
		if (!cardToFeature) {
			// Convert undefined from find() to null
			cardToFeature = relevantCards.find(card =>
				card.cardCode.includes(`_${associatedPokemon?.id}_${setCodeParam.toLowerCase()}_`)
			) || null;
		}
	}

	// If a specific card is identified (either by code or params), move it to the front
	if (cardToFeature && relevantCards.includes(cardToFeature)) {
		const index = relevantCards.indexOf(cardToFeature);
		if (index > 0) {
			relevantCards.splice(index, 1); // Remove from current position
			relevantCards.unshift(cardToFeature); // Add to beginning
		}
	}

	// --- Set Final Image ---
	// Use the first card in the (potentially reordered) list for the main image
	pageImage.url = relevantCards[0]?.image || '';
	pageImage.alt = associatedPokemon ? associatedPokemon.description : relevantCards[0]?.name || 'Card image';

	// --- Prepare Result ---
	const result = {
		cards: relevantCards,
		sets: allSets,
		pokemons: allPokemons, // Still pass all pokemons for potential use (e.g., evolution sprites)
		pokemon: associatedPokemon, // Will be undefined for non-pokemon cards found by code
		evolutionChain: associatedPokemon ? evolutionChain : [], // Only relevant for Pokemon
		title: pageTitle,
		description: pageDescription,
		image: pageImage
	};

	// Store in cache
	cachedCardData.set(cacheKey, result);

	// Limit cache size
	if (cachedCardData.size > 50) {
		const oldestKey = cachedCardData.keys().next().value;
		// Ensure the key exists before deleting
		if (oldestKey !== undefined) {
			cachedCardData.delete(oldestKey);
		}
	}

	return result;
};

// Helper function to build the evolution chain
// (Translated comments and variable names)
function buildEvolutionChain(currentPokemon: Pokemon, allPokemons: Pokemon[]): Pokemon[] {
	// Find pre-evolutions
	let preEvolution = currentPokemon.evolves_from ?
		allPokemons.find((p) => p.id === currentPokemon.evolves_from) : undefined;

	let prePreEvolution = preEvolution?.evolves_from ?
		allPokemons.find((p) => p.id === preEvolution.evolves_from) : undefined;

	// Find direct evolutions
	const evolutions = currentPokemon.evolves_to ?
		currentPokemon.evolves_to
			.map((evoId) => allPokemons.find((p) => p.id === evoId))
			.filter((p): p is Pokemon => p !== undefined) : [];

	// Find subsequent evolutions (second level)
	const furtherEvolutions = evolutions.flatMap((evo) =>
		evo.evolves_to ?
			evo.evolves_to
				.map((furtherEvoId) => allPokemons.find((p) => p.id === furtherEvoId))
				.filter((p): p is Pokemon => p !== undefined) : []
	);

	// Build the complete chain
	const chain: Pokemon[] = [];
	if (prePreEvolution) chain.push(prePreEvolution);
	if (preEvolution) chain.push(preEvolution);
	chain.push(currentPokemon);
	chain.push(...evolutions);
	chain.push(...furtherEvolutions);

	// Deduplicate the chain
	return chain.filter((pokemon, index, self) =>
		index === self.findIndex((p) => p.id === pokemon.id)
	);
}
