import { get } from 'svelte/store';
import type { FullCard, Set } from '$lib/types';
import { persistentWritable } from '$lib/stores/persistentStore';

export const sortBy = persistentWritable('sort-by', 'sort-pokedex');
export const sortOrder = persistentWritable<'asc' | 'desc'>('sort-order', 'asc');
export const filterNumero = persistentWritable('filter-numero', '');
export const filterName = persistentWritable('filter-name', '');
export const filterSet = persistentWritable('filter-set', 'all');
export const filterType = persistentWritable('filter-type', 'all');
export const filterRarity = persistentWritable('filter-rarity', 'all');
export const filterSupertype = persistentWritable('filter-supertype', 'all');
export const filterArtist = persistentWritable('filter-artist', 'all');

export const mostExpensiveOnly = persistentWritable('most-expensive-only', false);

export function resetFilters() {
	filterNumero.set('');
	filterName.set('');
	filterSet.set('all');
	filterType.set('all');
	filterRarity.set('all');
	filterSupertype.set('all');
	filterArtist.set('all');
	mostExpensiveOnly.set(false);
}

export function resetSort() {
	sortBy.set('sort-pokedex');
	sortOrder.set('asc');
}

export interface ActiveFilters {
	artist: string;
	name: string;
	numero: string;
	rarity: string;
	set: string;
	supertype: string;
	type: string;
}

/** Read once per filter pass: `isVisible` runs for all 23k cards, and `get()` subscribes and unsubscribes on every call. */
export function readActiveFilters(): ActiveFilters {
	return {
		artist: get(filterArtist).toLowerCase(),
		name: get(filterName).toLowerCase(),
		numero: get(filterNumero).toLowerCase(),
		rarity: get(filterRarity).toLowerCase(),
		set: get(filterSet).toLowerCase(),
		supertype: get(filterSupertype).toLowerCase(),
		type: get(filterType).toLowerCase(),
	};
}

export function isVisible(card: FullCard, cardSet: Set, mainSelectedSet: Set | null, filters: ActiveFilters) {
	// Each test short-circuits on the inactive filter value, so an unused filter costs no string work per card.
	if (filters.numero && !(card.pokemonNumber?.toString().includes(filters.numero) ?? true)) return false;
	if (filters.name && !card.name.toLowerCase().includes(filters.name)) return false;
	if (filters.type !== 'all' && !card.types.toLowerCase().includes(filters.type)) return false;
	if (filters.rarity !== 'all' && card.rarity.toLowerCase() !== filters.rarity) return false;
	if (filters.supertype !== 'all' && card.supertype.toLowerCase() !== filters.supertype) return false;
	if (filters.artist !== 'all' && card.artist.toLowerCase() !== filters.artist) return false;

	if (filters.set === 'all') return true;
	if (mainSelectedSet) {
		return cardSet.name.toLowerCase() === mainSelectedSet.name.toLowerCase() || (!!cardSet.setId && cardSet.setId === mainSelectedSet.setId);
	}
	return cardSet.name.toLowerCase() === filters.set;
}
