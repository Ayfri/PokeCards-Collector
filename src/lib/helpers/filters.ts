import { get } from 'svelte/store';
import type { FullCard, Pokemon, Set } from '$lib/types';
import { persistentStore } from '$lib/helpers/persistentStore';

export const sortBy = persistentStore('sort-by', 'sort-numero');
export const sortOrder = persistentStore<'asc' | 'desc'>('sort-order', 'asc');
export const filterNumero = persistentStore('filter-numero', '');
export const filterName = persistentStore('filter-name', '');
export const filterSet = persistentStore('filter-set', 'all');
export const filterType = persistentStore('filter-type', 'all');
export const filterRarity = persistentStore('filter-rarity', 'all');
export const filterSupertype = persistentStore('filter-supertype', 'all');
export const filterArtist = persistentStore('filter-artist', 'all');
export const mostExpensiveOnly = persistentStore('most-expensive-only', false);

export const displayAll = persistentStore('display-all', true);

export function resetFilters() {
	filterNumero.set('');
	filterName.set('');
	filterSet.set('all');
	filterType.set('all');
	filterRarity.set('all');
	filterSupertype.set('all');
	filterArtist.set('all');
	mostExpensiveOnly.set(false);
	displayAll.set(true); // Reset displayAll as well, if desired
	sortBy.set('sort-numero'); // Optionally reset sorting
	sortOrder.set('asc'); // Optionally reset sorting order
}

export function isVisible(card: FullCard, cardPokemon: Pokemon | undefined, cardSet: Set) {
	const numero = get(filterNumero).toLowerCase();
	const name = get(filterName).toLowerCase();
	const set = get(filterSet).toLowerCase();
	const type = get(filterType).toLowerCase();
	const rarity = get(filterRarity).toLowerCase();
	const supertype = get(filterSupertype).toLowerCase();
	const artist = get(filterArtist).toLowerCase();

	const hasNumero = card.pokemonNumber ? card.pokemonNumber.toString().includes(numero) : true;
	const hasName = card.name.toLowerCase().includes(name);
	const hasSet = set === 'all' || cardSet.name.toLowerCase() === set;
	const hasType = type === 'all' || card.types.toLowerCase().includes(type);
	const hasRarity = rarity === 'all' || card.rarity.toLowerCase() === rarity;
	const hasSupertype = supertype === 'all' || (card.supertype.toLowerCase() === supertype);
	const hasArtist = artist === 'all' || (card.artist.toLowerCase() === artist);

	return (
		hasNumero &&
		hasName &&
		hasSet &&
		hasType &&
		hasRarity &&
		hasSupertype &&
		hasArtist
	);
}
