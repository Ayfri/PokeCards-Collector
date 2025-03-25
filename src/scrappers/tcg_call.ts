import {getAverageColor} from 'fast-average-color-node';
import * as fs from 'node:fs/promises';
import pokemon from 'pokemontcgsdk';
import {POKEMONS_COUNT} from '../constants.ts';
import {getPokemons} from '../helpers/data.ts';
import type {Card} from '../types.ts';
import {CARDS, SETS} from './files.ts';

// Load and configure environment variables
const apiKey = import.meta.env.POKEMON_TCG_API_KEY;

if (!apiKey) {
	throw new Error('Pokémon TCG API key is missing from .env file, key: POKEMON_TCG_API_KEY');
}

pokemon.configure({apiKey});

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

export async function fetchPokemon(name: string, index: number) {
	try {
		const searchOptions = {
			orderBy: 'nationalPokedexNumbers',
			select: 'name,rarity,images,set,cardmarket,types,nationalPokedexNumbers',
		};

		const cardsData = await pokemon.card.all({
			q: `nationalPokedexNumbers:${index} supertype:Pokémon`,
			...searchOptions,
		}) as FetchedCard[];

		if (!cardsData.toString()) {
			const searchName = name.replaceAll('-', ' ');
			console.log(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), no cards found for this Pokémon, retrying with name '${searchName}'...`);
			return await pokemon.card.all({
				q: `name:"${searchName}" supertype:Pokémon`,
				...searchOptions,
			}) as FetchedCard[];
		}
		return cardsData;
	} catch (e) {
		if (!(e instanceof Error)) {
			console.error(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), error: ${e}, retrying...`);
			await new Promise(resolve => setTimeout(resolve, 3000));
			return fetchPokemon(name, index);
		}

		if (e.message.includes('429')) {
			console.error(`Pokédex: ${index}/${POKEMONS_COUNT} (${name}), rate limit reached, retrying...`);
			await new Promise(resolve => setTimeout(resolve, 5000));
			return fetchPokemon(name, index);
		}
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
		const meanColor = await getAverageColor(smallImageURL, {algorithm: 'simple'});
		const meanColorHex = meanColor.hex.substring(1);

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

type FetchedSet = {
	name: string;
	images: {
		logo: string;
	};
};

async function fetchAndFilterSets() {
	const sets = await pokemon.set.all({
		select: 'name,images',
	}) as FetchedSet[];

	console.log(`Found ${sets.length} sets!`);

	const setsData = sets.map(set => ({
		name: set.name,
		logo: set.images.logo,
	}));

	try {
		const cardsJson = JSON.parse(await fs.readFile(CARDS, 'utf-8'));

		const cards = cardsJson.flat() as Card[];
		const setsWithCards = sets.filter(set => cards.some(card => card.set_name === set.name));
		const uniqueNames = [...new Set(setsWithCards.map(set => set.name))];

		return uniqueNames.map(name => ({
			name,
			logo: sets.find(set => set.name === name)?.images?.logo,
		}));
	} catch (error) {
		console.error(`Error reading ${CARDS}`, error);
		return setsData;
	}
}

export async function fetchCards() {
	const pokemonGroups = [];
	const interval = 3;
	const pokemons = await getPokemons();

	for (let i = 0; i <= POKEMONS_COUNT + 2; i += interval) {
		await new Promise(resolve => setTimeout(resolve, 2000));
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
