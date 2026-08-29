import { writable } from 'svelte/store';

/** How many copies of each card code the current user owns, mirrored client-side so a card knows its own count. */
export const collectionStore = writable<Map<string, number>>(new Map());

/** A count that drops to zero removes the entry, so `has()` still answers "is this card owned". */
export function updateCollectionStoreCount(cardCode: string, change: number) {
	collectionStore.update(map => {
		const newMap = new Map(map);
		const newCount = (newMap.get(cardCode) || 0) + change;

		if (newCount > 0) {
			newMap.set(cardCode, newCount);
		} else {
			newMap.delete(cardCode);
		}
		return newMap;
	});
}
