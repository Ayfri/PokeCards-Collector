import { writable, get } from 'svelte/store';
import { getUserCollection } from '$lib/services/collections';
import { browser } from '$app/environment';
import { setLoading } from './loading';

// Store for the cardCodes and their counts in the collection
export const collectionStore = writable<Map<string, number>>(new Map());

// Function to load the complete collection for a specific user
// It now requires the username to be passed explicitly.
export async function loadCollection(username: string) {
	if (!username) {
		console.warn('[CollectionStore] loadCollection called without username.');
		collectionStore.set(new Map()); // Ensure store is empty if no user
		return;
	}

	// Consider managing loading state differently if still needed
	try {
		setLoading(true); // Use global loading store if appropriate
		const { data: collectionItems, error } = await getUserCollection(username);

		if (error) {
			console.error('Error loading collection:', error);
			collectionStore.set(new Map()); // Reset on error
			return;
		}

		// Count occurrences of each cardCode
		const collectionMap = new Map<string, number>();
		collectionItems?.forEach(item => {
			const currentCount = collectionMap.get(item.card_code) || 0;
			collectionMap.set(item.card_code, currentCount + 1);
		});

		collectionStore.set(collectionMap);

	} catch (error) {
		console.error('Exception loading collection:', error);
		collectionStore.set(new Map()); // Reset on error
	} finally {
		setLoading(false);
	}
}

// Function to update the count of a card in the local collection store
export function updateCollectionStoreCount(cardCode: string, change: number) {
	collectionStore.update(map => {
		const newMap = new Map(map);
		const currentCount = newMap.get(cardCode) || 0;
		const newCount = currentCount + change;

		if (newCount > 0) {
			newMap.set(cardCode, newCount);
		} else {
			// Remove the card if count is 0 or less
			newMap.delete(cardCode);
		}
		return newMap;
	});
}

// // Function to remove a card completely from the local collection store (Less relevant now, count handles removal)
// export function removeFromCollectionStore(cardCode: string) {
// 	collectionStore.update(map => {
// 		const newMap = new Map(map);
// 		newMap.delete(cardCode);
// 		return newMap;
// 	});
// }

// Client-side initialization
if (browser) {
	// Removed client-side initialization block that subscribed to authStore
} 