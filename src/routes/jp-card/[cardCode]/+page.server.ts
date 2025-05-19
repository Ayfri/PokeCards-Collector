import { getPokemons, getJapaneseCards } from '$helpers/data';
import type { FullCard } from '$lib/types';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { cardCode } = params;
	const { sets, prices, ...layoutData } = await parent(); // Destructure sets and prices from parent

	// Load all Japanese cards
	const allJpCards = await getJapaneseCards(); // Renamed to avoid conflict if allCards was from parent
	
	// Find the specific card
	const card = allJpCards.find(c => c.cardCode === cardCode);
	
	if (!card) {
		throw error(404, 'Card not found');
	}
	
	// Get Pokémon data
	const pokemons = await getPokemons();
	const pokemon = pokemons.find(p => p.id === card.pokemonNumber);
	
	// Get all cards for this Pokémon (if it's a Pokémon card)
	let pokemonCards: FullCard[] = [];
	if (card.pokemonNumber) {
		pokemonCards = allJpCards.filter(c => c.pokemonNumber === card.pokemonNumber);
	}
	
	// sets and prices are from layoutData now
	
	// Page-specific SEO data
	const pageSeoData = {
		title: `${card.name} - Japanese Card - Pokécards-collector`,
		description: `View details for the Japanese Pokémon card ${card.name} from the ${card.setName} set.`,
		image: card.image
	};
	
	return {
		...layoutData,
		card,
		pokemon,
		allCards: allJpCards, // Pass the fetched Japanese cards
		pokemonCards,
		pokemons,
		sets,     // from parent
		prices,   // from parent
		...pageSeoData
	};
}; 