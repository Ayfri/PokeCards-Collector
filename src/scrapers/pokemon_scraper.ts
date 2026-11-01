import {writeFile} from 'node:fs/promises';
import {POKEMONS_COUNT} from '../constants.js';
import {POKEMONS} from './cli-config';
import {HttpError, withRetry} from './tcgdex/client';

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

/** A failure after the retries aborts the run: a skipped species would silently leave a hole in the Pokédex. */
const getJson = <T>(url: string) => withRetry(async () => {
	const response = await fetch(url);
	if (!response.ok) throw new HttpError(response.status, url);
	return await response.json() as T;
}, 5, 500, true);

export async function fetchPokemons() {
	const json = await getJson<SearchResults>(`https://pokeapi.co/api/v2/pokemon-species?limit=${POKEMONS_COUNT}`);
	console.log(`Fetched ${json.results.length} pokémons, fetching additional data...`);

	const pokemons = await Promise.all(json.results.map(async (pokemon, index): Promise<PokemonExtractedData> => {
		const data = await getJson<PokemonData>(pokemon.url);
		console.log(`Fetching ${index + 1}/${json.results.length} ${pokemon.name}`);

		const evolvesFromRaw = data.evolves_from_species?.url.replace(/.+\/(\d+)\/$/, '$1');

		return {
			id: index + 1,
			name: pokemon.name,
			description: data.flavor_text_entries.find(entry => entry.language.name === 'en')?.flavor_text?.replace(/[\n\f\r]/g, ' ') ?? '',
			evolves_from: evolvesFromRaw ? parseInt(evolvesFromRaw) : undefined,
		};
	}));

	/** Ids are the list positions plus one, so the previous stage sits at `evolves_from - 1`. */
	for (const pokemon of pokemons) {
		if (!pokemon.evolves_from) continue;
		const previous = pokemons[pokemon.evolves_from - 1];
		if (previous) (previous.evolves_to ??= []).push(pokemon.id);
	}

	await writeFile(POKEMONS, JSON.stringify(pokemons));
}
