import { persistedRecord } from './persisted.svelte';

export type ArtistsSortValue = 'averageValue' | 'firstReleaseDate' | 'lastReleaseDate' | 'name' | 'totalCards' | 'totalValue';

export const artistsSort = persistedRecord('artists-sort', {
	direction: 'asc' as 'asc' | 'desc',
	value: 'name' as ArtistsSortValue,
});
