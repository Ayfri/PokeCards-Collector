import { persistentWritable } from './persistentStore';

export type ArtistsSortValue = 'averageValue' | 'firstReleaseDate' | 'lastReleaseDate' | 'name' | 'totalCards' | 'totalValue';

export const artistsSortValue = persistentWritable<ArtistsSortValue>('artists-sort-value', 'name');
export const artistsSortDirection = persistentWritable<'asc' | 'desc'>('artists-sort-direction', 'asc');
