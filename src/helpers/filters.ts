import {get, writable} from 'svelte/store';
import type {FullCard} from '~/types.js';

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

export const displayAll = persistentStore('display-all', true);

export function isVisible(card: FullCard) {
	const numero = get(filterNumero).toLowerCase();
	const name = get(filterName).toLowerCase();
	const set = get(filterSet).toLowerCase();
	const type = get(filterType).toLowerCase();
	const rarity = get(filterRarity).toLowerCase();

	return (
		(card.numero.includes(numero) || card.pokemon.name.toLowerCase().includes(numero)) &&
		(card.pokemon.name.toLowerCase().includes(name) || card.numero.includes(name)) &&
		(set === 'all' || card.set_name.toLowerCase() === set) &&
		(type === 'all' || card.types.toLowerCase().includes(type)) &&
		(rarity === 'all' || card.rarity.toLowerCase() === rarity)
	);
}
