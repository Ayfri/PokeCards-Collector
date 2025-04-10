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
	return pokemonCards as FullCard[];
}

export async function getSets(): Promise<Set[]> {
	return pokemonSets as Set[];
}

export async function getTypes(): Promise<string[]> {
	return [...pokemonTypes].sort();
}

export async function getRarities(): Promise<string[]> {
	const cards = await getCards();
	return [...new Set(cards.map(card => card.rarity).filter(rarity => rarity))].sort();
}

export async function getArtists(): Promise<string[]> {
	const cards = await getCards();
	return [...new Set(cards.map(card => card.artist).filter((artist): artist is string => artist !== undefined))]
		.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

export async function getHoloFoilsCards(): Promise<Card[]> {
	return holoCards as Card[];
}
