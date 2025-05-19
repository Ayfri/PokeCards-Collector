import type { Card, FullCard, Pokemon, PriceData, Set } from "$lib/types";
import pokemons from '~/assets/pokemons-full.json';
import holoCards from '~/assets/holo-cards.json';
import pokemonSets from '~/assets/sets-full.json';
import pokemonTypes from '~/assets/types.json';
import prices from '~/assets/prices.json';
import originalJpSets from '~/assets/jp-sets-full.json';
import {PUBLIC_R2_BUCKET_URL} from '$env/static/public';

// Define a type for the raw structure of items in jp-sets-full.json
type RawJpSet = {
	aliases?: string[];
	logo?: string;
	name: string;
	printedTotal: number;
	ptcgoCode?: string;
	releaseDate?: string | Date;
	series?: string;
};

// Cast the imported JSON to this raw type
const jpSets: RawJpSet[] = originalJpSets as RawJpSet[];

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
	// The 'as unknown as Card[]' will silence the error, but it's a strong assertion.
	// Ideally, holoCards.json should conform to the Card type or be mapped.
	return holoCards as unknown as Card[];
}

export async function getJapaneseSets(): Promise<Set[]> {
	return jpSets.map(set => ({
		aliases: Array.isArray(set.aliases) ? set.aliases : [],
		logo: set.logo || '',
		name: set.name,
		printedTotal: set.printedTotal,
		ptcgoCode: set.ptcgoCode || '',
		releaseDate: set.releaseDate ? new Date(set.releaseDate) : new Date('1995-01-01'),
		series: set.series || '',
	}));
}
