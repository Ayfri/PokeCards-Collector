import * as fs from "node:fs";
import {POKEMONS_COUNT} from '../constants.js';
import {POKEMONS} from './files.js';

interface SearchResults {
	results: {
		name: string;
		url: string;
	}[];
}

interface PokemonData {
	flavor_text_entries: {
		flavor_text: string;
		language: {
			name: string;
		};
	}[];
	evolves_from_species?: {
		name: string;
		url: string;
	};
}

interface PokemonExtractedData {
	id: number;
	name: string;
	description: string;
	evolves_from?: number;
	evolves_to?: number[];
}

export async function fetchPokemons() {
	const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species?limit=${POKEMONS_COUNT}`);
	const json = await response.json() as SearchResults;
	console.log(`Fetched ${json.results.length} pokémons, fetching additional data...`);

	const fetchPromises = json.results.map(async (pokemon, index) => {
		try {
			const descriptionResponse = await fetch(pokemon.url);
			const descriptionJson = await descriptionResponse.json() as PokemonData;
			const description = descriptionJson.flavor_text_entries.find(entry => entry.language.name === 'en')?.flavor_text?.replace(/[\n\f\r]/g, ' ') ?? '';
			console.log(`Fetching ${index + 1}/${json.results.length} ${pokemon.name}`);

			const evolvesFromRaw = descriptionJson.evolves_from_species?.url.replace(/.+\/(\d+)\/$/, '$1');
			const evolvesFrom = evolvesFromRaw ? parseInt(evolvesFromRaw) : undefined;

			return {
				id: index + 1,
				name: pokemon.name,
				description,
				evolves_from: evolvesFrom,
			} as PokemonExtractedData;
		} catch (error) {
			console.log(`Error fetching ${index + 1}/${json.results.length} ${pokemon.name}`);
			return undefined;
		}
	});

	const pokemonsWithDescriptions = await Promise.all(fetchPromises);
	pokemonsWithDescriptions.map(pokemon => {
		if (pokemon?.evolves_from) {
			const evolvesFrom = pokemonsWithDescriptions.find(p => p?.id === pokemon.evolves_from);
			if (evolvesFrom) {
				evolvesFrom.evolves_to ??= [];
				evolvesFrom.evolves_to.push(pokemon.id);
			}
		}
	});
	fs.writeFileSync(POKEMONS, JSON.stringify(pokemonsWithDescriptions.filter(pokemon => pokemon)));
}
