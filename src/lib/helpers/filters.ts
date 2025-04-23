import { get } from 'svelte/store';
import type { FullCard, Pokemon, Set } from '$lib/types';
import { persistentWritable } from '$lib/stores/persistentStore';
import { getSetCodeFromImage } from '$lib/helpers/set-utils';

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

export const displayAll = persistentWritable('display-all', true);

export function resetFilters() {
	filterNumero.set('');
	filterName.set('');
	filterSet.set('all');
	filterType.set('all');
	filterRarity.set('all');
	filterSupertype.set('all');
	filterArtist.set('all');
	mostExpensiveOnly.set(false);
	displayAll.set(true);
}

export function resetSort() {
	sortBy.set('sort-pokedex');
	sortOrder.set('asc');
}

export function isVisible(card: FullCard, cardPokemon: Pokemon | undefined, cardSet: Set, mainSelectedSet: Set | null) {
	const numero = get(filterNumero).toLowerCase();
	const name = get(filterName).toLowerCase();
	const setFilterValue = get(filterSet).toLowerCase();
	const type = get(filterType).toLowerCase();
	const rarity = get(filterRarity).toLowerCase();
	const supertype = get(filterSupertype).toLowerCase();
	const artist = get(filterArtist).toLowerCase();

	const hasNumero = card.pokemonNumber ? card.pokemonNumber.toString().includes(numero) : true;
	const hasName = card.name.toLowerCase().includes(name);

	let hasSet = setFilterValue === 'all';
	if (!hasSet && mainSelectedSet) {
		if (cardSet.name.toLowerCase() === mainSelectedSet.name.toLowerCase()) {
			hasSet = true;
		} else if (mainSelectedSet.aliases && mainSelectedSet.aliases.length > 0) {
			const cardDerivedCode = getSetCodeFromImage(cardSet.logo);
			if (cardDerivedCode && mainSelectedSet.aliases.includes(cardDerivedCode)) {
				hasSet = true;
			}
		}
	} else if (!hasSet && !mainSelectedSet && setFilterValue !== 'all') {
		hasSet = cardSet.name.toLowerCase() === setFilterValue;
	}

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
