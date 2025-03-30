import {getAverageColor} from 'fast-average-color-node';
import * as fs from 'node:fs/promises';
import {POKEMONS_COUNT} from '../constants.ts';
import {getPokemons} from '../helpers/data.ts';
import type {Card} from '../types.ts';
import {CARDS, SETS} from './files.ts';

// Load and configure environment variables
let apiKey = '';
if (process.env.POKEMON_TCG_API_KEY) {
	apiKey = process.env.POKEMON_TCG_API_KEY;
} else if (import.meta.env.POKEMON_TCG_API_KEY) {
	apiKey = import.meta.env.POKEMON_TCG_API_KEY;
} else {
	throw new Error('Pokémon TCG API key is missing from .env file, key: POKEMON_TCG_API_KEY');
}

const API_BASE_URL = 'https://api.pokemontcg.io/v2';

type FetchedCard = {
	id: string;
	name: string;
	rarity: string;
	images: {
		small: string;
		large: string;
	};
	nationalPokedexNumbers: number[];
	set: {
		name: string;
	};
	cardmarket: {
		prices: {
			averageSellPrice: number;
		};
	};
	tcgplayer?: {
		prices?: {
			holofoil?: {
				market?: number;
			};
			reverseHolofoil?: {
				market?: number;
			};
			normal?: {
				market?: number;
			};
			"1stEditionHolofoil"?: {
				market?: number;
			};
			"1stEditionNormal"?: {
				market?: number;
			};
		};
	};
	types: string[];
};

type FetchedCardsResponse = {
	data: FetchedCard[];
};

type FetchedSet = {
	name: string;
	images: {
		logo: string;
	};
	printedTotal: number;
	ptcgoCode: string;
};

type FetchedSetsResponse = {
	data: FetchedSet[];
};

/**
 * Generic retry function with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, baseDelay = 1000, log = true): Promise<T> {
	let attempt = 0;

	while (true) {
		try {
			return await fn();
		} catch (error) {
			attempt++;

			if (attempt > maxRetries) {
				throw error;
			}

			const delay = baseDelay * Math.pow(1.5, attempt) + (Math.random() * baseDelay);
			if (log) {
				console.log(`Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms...`);
			}
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
}

/**
 * Fetches data from the Pokemon TCG API with retry mechanism
 */
async function fetchFromApi<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
	return withRetry(async () => {
		const queryParams = new URLSearchParams(params).toString();
		const url = `${API_BASE_URL}/${endpoint}${queryParams ? `?${queryParams}` : ''}`;

		const response = await fetch(url, {
			headers: {
				'X-Api-Key': apiKey,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			if (response.status === 429) {
				throw new Error('429: Rate limit reached');
			}
			throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
		}

		return await response.json() as T;
	}, 5, 1000);
}

/**
 * Safe wrapper for getAverageColor with retry mechanism
 */
async function safeGetAverageColor(imageUrl: string): Promise<string> {
	return withRetry(async () => {
		try {
			const result = await getAverageColor(imageUrl, {algorithm: 'simple'});
			return result.hex.substring(1);
		} catch (error) {
			// Silently ignore errors
			throw error;
		}
	}, 3, 300, false);
}

export async function fetchPokemon(name: string, index: number) {
	try {
		const selectFields = 'name,rarity,images,set,cardmarket,types,nationalPokedexNumbers';
		let query = `nationalPokedexNumbers:${index} supertype:Pokémon`;
		let params = {
			q: query,
			orderBy: 'nationalPokedexNumbers',
			select: selectFields,
			pageSize: '250',
		};

		const response = await fetchFromApi<FetchedCardsResponse>('cards', params);

		if (!response.data.length) {
			const searchName = name.replaceAll('-', ' ');
			console.log(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), no cards found for this Pokémon, retrying with name '${searchName}'...`);

			params = {
				q: `name:"${searchName}" supertype:Pokémon`,
				orderBy: 'nationalPokedexNumbers',
				select: selectFields,
				pageSize: '250',
			};

			return (await fetchFromApi<FetchedCardsResponse>('cards', params)).data;
		}

		return response.data;
	} catch (e) {
		if (!(e instanceof Error)) {
			console.error(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), error: ${e}, retrying...`);
			await new Promise(resolve => setTimeout(resolve, 1500));
			return fetchPokemon(name, index);
		}

		if (e.message.includes('429')) {
			console.error(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), rate limit reached, retrying...`);
			await new Promise(resolve => setTimeout(resolve, 2500));
			return fetchPokemon(name, index);
		}

		// Other errors
		console.error(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), error: ${e.message}, retrying...`);
		await new Promise(resolve => setTimeout(resolve, 1500));
		return fetchPokemon(name, index);
	}
}

async function getPokemon(name: string, index: number) {
	const cards = await fetchPokemon(name, index);
	if (!cards || cards?.length === 0) {
		console.log(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), no cards found for this Pokémon !`);
		return [];
	}

	console.log(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), found ${cards.length} cards !`);

	const fetchedCards = cards.map(async (card: FetchedCard) => {
		const tcgplayerPrices = card?.tcgplayer?.prices ?? {};

		const price = card.cardmarket?.prices?.averageSellPrice || tcgplayerPrices.holofoil?.market ||
			tcgplayerPrices.reverseHolofoil?.market ||
			tcgplayerPrices.normal?.market || tcgplayerPrices["1stEditionHolofoil"]?.market ||
			tcgplayerPrices["1stEditionNormal"]?.market;

		const smallImageURL = card.images.small;
		const meanColorHex = await safeGetAverageColor(smallImageURL);

		const nationalPokedexNumbers = card.nationalPokedexNumbers ?? [index];
		return {
			id: card.id,
			image: card.images.large,
			meanColor: meanColorHex,
			name: card.name,
			numero: nationalPokedexNumbers.join(', '),
			price,
			rarity: card.rarity,
			set_name: card.set.name,
			types: card.types.join(', '),
		};
	});
	const allCards = await Promise.all(fetchedCards);
	return allCards.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
}

async function fetchAndFilterSets() {
	const response = await fetchFromApi<FetchedSetsResponse>('sets', {
		select: 'name,images,printedTotal,ptcgoCode',
	});
	const sets = response.data;

	console.log(`Found ${sets.length} sets!`);

	const setsData = sets.map(set => ({
		name: set.name,
		logo: set.images.logo,
		printedTotal: set.printedTotal,
		ptcgoCode: set.ptcgoCode,
	}));

	try {
		const cardsJson = JSON.parse(await fs.readFile(CARDS, 'utf-8'));

		const cards = cardsJson.flat() as Card[];
		const setsWithCards = sets.filter(set => cards.some(card => card.set_name === set.name));
		const uniqueNames = [...new Set(setsWithCards.map(set => set.name))];

		return uniqueNames.map(name => ({
			name,
			logo: sets.find(set => set.name === name)?.images?.logo,
			printedTotal: sets.find(set => set.name === name)?.printedTotal,
			ptcgoCode: sets.find(set => set.name === name)?.ptcgoCode,
		}));
	} catch (error) {
		console.error(`Error reading ${CARDS}`, error);
		return setsData;
	}
}

export async function fetchCards() {
	const pokemonGroups = [];
	const interval = 20;
	const pokemons = await getPokemons();

	console.log(`Starting to fetch cards for ${POKEMONS_COUNT} pokemon with concurrent batch size ${interval}`);

	for (let i = 0; i <= POKEMONS_COUNT + 2; i += interval) {
		console.log(`Processing batch ${Math.floor(i/interval) + 1}/${Math.ceil((POKEMONS_COUNT + 2)/interval)}`);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const promises = Array.from({length: interval}, (_, j) => {
			const name = pokemons[i + j]?.name;
			if (!name) return [];
			return getPokemon(name, i + j + 1);
		});
		const result = await Promise.all(promises);
		pokemonGroups.push(...result);
	}

	await fs.writeFile(CARDS, JSON.stringify(pokemonGroups.flat()));
	console.log(`Finished writing Pokémon cards to ${CARDS}`);
}

export async function fetchSets() {
	const sets = await fetchAndFilterSets();
	console.log(`Filtered sets, writing ${sets.length} sets!`);
	await fs.writeFile(SETS, JSON.stringify(sets));
	console.log(`Finished writing sets to ${SETS}`);
}
