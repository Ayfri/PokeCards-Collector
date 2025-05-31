import type { Card, FullCard, Pokemon, PriceData, Set } from "$lib/types";
import pokemons from '~/assets/pokemons-full.json';
import holoCards from '~/assets/holo-cards.json';
import pokemonSets from '~/assets/sets-full.json';
import pokemonTypes from '~/assets/types.json';
import originalJpSets from '~/assets/jp-sets-full.json';
import * as $env_static_public from '$env/static/public';

// Attempt to get the URL from SvelteKit's static environment variables.
// This variable is meant to be injected at build time.
// If PUBLIC_R2_BUCKET_URL is not defined in your .env file (e.g., as PUBLIC_R2_BUCKET_URL=https://...)
// and therefore not included by SvelteKit in the $env/static/public module,
// then svelteKitStaticEnvUrl will be undefined.
// The original error "is not exported by virtual:env/static/public" suggests that the build fails
// because SvelteKit cannot even find this variable to include in the module.
const svelteKitStaticEnvUrl = ($env_static_public as any).PUBLIC_R2_BUCKET_URL;

// Fallback to process.env.PUBLIC_R2_BUCKET_URL
// Note: process.env is a Node.js concept. Its availability and content
// in SvelteKit contexts (especially for code that might run in the browser) can be unreliable.
// SvelteKit's own $env modules are the standard way to handle environment variables.
// Using @ts-ignore as 'process' might not be defined in all execution contexts of this library file.
// @ts-ignore
const nodeProcessEnvUrl = typeof process !== 'undefined' && process.env ? process.env.PUBLIC_R2_BUCKET_URL : undefined;

const PUBLIC_R2_BUCKET_URL = svelteKitStaticEnvUrl || nodeProcessEnvUrl;

if (!PUBLIC_R2_BUCKET_URL) {
	console.error(
		'Pokestore Critical Error: PUBLIC_R2_BUCKET_URL is not defined. ' +
		'This variable is essential for fetching core application data. ' +
		'Please ensure it is correctly set in your .env file (e.g., PUBLIC_R2_BUCKET_URL="https://your-bucket-url.com") ' +
		'and that this .env file is present at the root of your project during the build process. ' +
		'Attempted to read from $env/static/public (build-time) and process.env (runtime fallback). ' +
		'Application functionality related to fetching cards, prices, etc., will be severely impacted or non-functional.'
	);
	// Depending on the application's needs, you might want to throw an error here
	// to halt execution if this critical configuration is missing, for example:
	// throw new Error('Misconfiguration: PUBLIC_R2_BUCKET_URL is undefined. App cannot start.');
}

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
	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
	const cards = await fetch(`${PUBLIC_R2_BUCKET_URL}/cards-full.json.gz?d=${today}`);
	return cards.json();
}

export async function getJapaneseCards(): Promise<FullCard[]> {
	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
	const jpCards = await fetch(`${PUBLIC_R2_BUCKET_URL}/jp-cards-full.json.gz?d=${today}`);
	return jpCards.json();
}

export async function getPrices(): Promise<Record<string, PriceData>> {
	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
	const prices = await fetch(`${PUBLIC_R2_BUCKET_URL}/prices.json.gz?d=${today}`);
	return prices.json();
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
