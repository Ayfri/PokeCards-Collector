import type { Card, FullCard, Pokemon, PriceData, Set } from "$lib/types";
import pokemons from '~/assets/pokemons-full.json';
import holoCards from '~/assets/holo-cards.json';
import pokemonSets from '~/assets/sets-full.json';
import pokemonTypes from '~/assets/types.json';
import prices from '~/assets/prices.json';
import {PUBLIC_R2_BUCKET_URL} from '$env/static/public';

export async function getPokemons(): Promise<Pokemon[]> {
	return pokemons;
}

export async function getCards(): Promise<FullCard[]> {
	const cards = await fetch(`${PUBLIC_R2_BUCKET_URL}/cards-full.json.gz`);
	return cards.json();
}

export async function getJapaneseCards(): Promise<FullCard[]> {
	const jpCards = await fetch(`${PUBLIC_R2_BUCKET_URL}/jp-cards-full.json.gz`);
	return jpCards.json();
}

export async function getPrices(): Promise<Record<string, PriceData>> {
	return prices;
}

export async function getSets(): Promise<Set[]> {
	return pokemonSets.map(set => ({
		...set,
		releaseDate: new Date(set.releaseDate)
	}));
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
