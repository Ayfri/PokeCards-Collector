import {CARDS, HOLO_CARDS, POKEMONS, SETS, TYPES} from '$scrappers/files.ts';
import {fetchHoloCards} from '$scrappers/holo_scraper.ts';
import {fetchPokemons} from '$scrappers/pokemon_scraper.ts';
import {fetchCards, fetchSets} from '$scrappers/tcg_call.ts';
import {fetchPokemonTypes} from '$scrappers/types_scraper.ts';
import * as fs from 'node:fs';
import type {Card, FullCard, Pokemon, Set} from '~/types.ts';

export async function getPokemons(): Promise<Pokemon[]> {
	if (fs.existsSync(POKEMONS)) {
		return JSON.parse(fs.readFileSync(POKEMONS, 'utf-8')) as Pokemon[];
	}

	await fetchPokemons();
	return getPokemons();
}

export async function getCards(): Promise<FullCard[]> {
	const pokemons = await getPokemons();
	if (fs.existsSync(CARDS)) {
		if (!fs.existsSync(SETS)) {
			await fetchSets();
		}

		const sets = await getSets();
		const cardData = JSON.parse(fs.readFileSync(CARDS, 'utf-8')).flat() as Card[];
		return cardData.map(card => {
			card.rarity ??= 'Unknown';
			card.pokemon = pokemons.find(pokemon => pokemon.id === parseInt(card.numero))!;
			card.set = sets.find(set => set.name === card.set_name)!;

			return card as FullCard;
		}).filter(card => card.pokemon);
	}

	await fetchCards();
	return getCards();
}

export async function getSets(): Promise<Set[]> {
	if (fs.existsSync(SETS)) {
		return JSON.parse(fs.readFileSync(SETS, 'utf-8')) as Set[];
	}

	await getCards();
	await fetchSets();
	return getSets();
}

export async function getTypes(): Promise<string[]> {
	if (fs.existsSync(TYPES)) {
		return JSON.parse(fs.readFileSync(TYPES, 'utf-8')) as string[];
	}

	await getCards();
	await fetchPokemonTypes();
	return getTypes();
}

export async function getRarities(): Promise<string[]> {
	const cards = await getCards();
	return [...new Set(cards.map(card => card.rarity).filter(rarity => rarity))];
}

export async function getHoloFoilsCards(): Promise<Card[]> {
	if (fs.existsSync(HOLO_CARDS)) {
		return JSON.parse(fs.readFileSync(HOLO_CARDS, 'utf-8')) as Card[];
	}

	await getCards();
	await fetchHoloCards();
	return getHoloFoilsCards();
}
