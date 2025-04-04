import type { Card, FullCard, Pokemon, Set } from '~/lib/types';
import pokemonCards from '~/assets/cards-full.json';
import pokemons from '~/assets/pokemons-full.json';
import holoCards from '~/assets/holo-cards.json';
import pokemonSets from '~/assets/sets-full.json';
import pokemonTypes from '~/assets/types.json';

export async function getPokemons(): Promise<Pokemon[]> {
	return pokemons;
}

export async function getCards(): Promise<FullCard[]> {
	const pokemons = await getPokemons();

	const sets = await getSets();
	const cardData = pokemonCards as Card[];
	return cardData.map(card => {
		card.rarity ??= 'Unknown';
		
		// Try to find associated pokemon if there's a valid numero
		if (card.numero && card.numero !== '-') {
			try {
				const pokemonId = parseInt(card.numero);
				if (!isNaN(pokemonId)) {
					card.pokemon = pokemons.find(pokemon => pokemon.id === pokemonId);
				}
			} catch (e) {
				// If parsing fails, it's likely not a Pokémon card
			}
		}
		
		card.set = sets.find(set => set.name === card.set_name);
		
		// Ensure supertype is correctly defined
		card.supertype ??= card.pokemon ? 'Pokémon' : 'Trainer'; // Default to Trainer if not specified
		
		// Create a dummy Pokemon object for non-Pokémon cards
		// This allows the FullCard type to work for all card types
		if (!card.pokemon) {
			card.pokemon = {
				id: 0,
				name: card.name,
				description: ''
			};
		}
		
		// Ensure set is defined
		if (!card.set) {
			card.set = {
				name: card.set_name,
				logo: '',
				printedTotal: 0,
				ptcgoCode: ''
			};
		}

		// The as FullCard assertion ensures TypeScript knows all required fields are present
		return {
			...card,
			pokemon: card.pokemon,
			set: card.set
		} as FullCard;
	});
}

export async function getSets(): Promise<Set[]> {
	return pokemonSets as Set[];
}

export async function getTypes(): Promise<string[]> {
	return pokemonTypes;
}

export async function getRarities(): Promise<string[]> {
	const cards = await getCards();
	return [...new Set(cards.map(card => card.rarity).filter(rarity => rarity))];
}

export async function getHoloFoilsCards(): Promise<Card[]> {
	return holoCards as Card[];
}
