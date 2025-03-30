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
		card.pokemon = pokemons.find(pokemon => pokemon.id === parseInt(card.numero))!;
		card.set = sets.find(set => set.name === card.set_name)!;

		return card as FullCard;
	}).filter(card => card.pokemon);
}

export async function getSets(): Promise<Set[]> {
	return pokemonSets;
}

export async function getTypes(): Promise<string[]> {
	return pokemonTypes;
}

export async function getRarities(): Promise<string[]> {
	const cards = await getCards();
	return [...new Set(cards.map(card => card.rarity).filter(rarity => rarity))];
}

export async function getHoloFoilsCards(): Promise<Card[]> {
	return holoCards;
}
