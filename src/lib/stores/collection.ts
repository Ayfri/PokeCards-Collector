import { writable, get } from 'svelte/store';
import { getUserCollection } from '$lib/services/collections';
import { authStore } from './auth';
import { browser } from '$app/environment';
import { setLoading } from './loading';

// Store for the cardCodes and their counts in the collection
export const collectionStore = writable<Map<string, number>>(new Map());

// Variable to track if a loading is in progress
let isLoadingCollection = false;
// Variable to track if the collection has already been loaded at least once
let collectionLoaded = false;

// Function to load the complete collection and count card occurrences
export async function loadCollection(forceReload: boolean = false) {
	const authState = get(authStore);
	if (!authState.profile?.username) return;
	
	if (isLoadingCollection) return;
	
	if (!forceReload && collectionLoaded && get(collectionStore).size > 0) return;

	try {
		isLoadingCollection = true;
		setLoading(true);
		// Fetch all collection entries (just need card_code)
		const { data: collectionItems, error } = await getUserCollection(authState.profile.username);
		
		if (error) {
			console.error('Error loading collection:', error);
			collectionStore.set(new Map()); // Reset on error
			collectionLoaded = false;
			return;
		}

		// Count occurrences of each cardCode
		const collectionMap = new Map<string, number>();
		collectionItems?.forEach(item => {
			const currentCount = collectionMap.get(item.card_code) || 0;
			collectionMap.set(item.card_code, currentCount + 1);
		});
		
		collectionStore.set(collectionMap);
		collectionLoaded = true;
	} catch (error) {
		console.error('Exception loading collection:', error);
		collectionStore.set(new Map()); // Reset on error
		collectionLoaded = false;
	} finally {
		isLoadingCollection = false;
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
	authStore.subscribe(state => {
		if (state.initialized && !state.loading) {
			if (state.profile) {
				loadCollection();
			} else {
				collectionStore.set(new Map());
				collectionLoaded = false;
			}
		}
	});
} 