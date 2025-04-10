import { get, writable } from 'svelte/store';
import type { FullCard, Pokemon, Set } from '$lib/types';

function persistentStore<T>(key: string, initialValue: T) {
	const store = writable(initialValue);
	const {
		subscribe,
		set,
	} = store;

	if (globalThis.window === undefined) {
		return store;
	}

	const json = localStorage.getItem(key);
	if (json) {
		set(JSON.parse(json));
	}

	return {
		subscribe,
		set: (value: T) => {
			localStorage.setItem(key, JSON.stringify(value));
			set(value);
		},
	};

}

export const sortBy = persistentStore('sort-by', 'sort-numero');
export const sortOrder = persistentStore('sort-order', 'asc');
export const filterNumero = persistentStore('filter-numero', '');
export const filterName = persistentStore('filter-name', '');
export const filterSet = persistentStore('filter-set', 'all');
export const filterType = persistentStore('filter-type', 'all');
export const filterRarity = persistentStore('filter-rarity', 'all');
export const filterSupertype = persistentStore('filter-supertype', 'all');
export const filterArtist = persistentStore('filter-artist', 'all');
export const mostExpensiveOnly = persistentStore('most-expensive-only', false);

export const displayAll = persistentStore('display-all', true);

export function isVisible(card: FullCard, cardPokemon: Pokemon | undefined, cardSet: Set) {
	const numero = get(filterNumero).toLowerCase();
	const name = get(filterName).toLowerCase();
	const set = get(filterSet).toLowerCase();
	const type = get(filterType).toLowerCase();
	const rarity = get(filterRarity).toLowerCase();
	const supertype = get(filterSupertype).toLowerCase();
	const artist = get(filterArtist).toLowerCase();

	return (
		(card.pokemonNumber?.toString().includes(numero) || cardPokemon?.name.toLowerCase().includes(numero)) &&
		(cardPokemon?.name.toLowerCase().includes(name) || card.pokemonNumber?.toString().includes(name)) &&
		(set === 'all' || cardSet.name.toLowerCase() === set) &&
		(type === 'all' || card.types.toLowerCase().includes(type)) &&
		(rarity === 'all' || card.rarity.toLowerCase() === rarity) &&
		(supertype === 'all' || (card.supertype && card.supertype.toLowerCase() === supertype)) &&
		(artist === 'all' || (card.artist && card.artist.toLowerCase() === artist))
	);
}
