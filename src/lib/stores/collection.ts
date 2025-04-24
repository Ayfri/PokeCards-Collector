import { writable, get } from 'svelte/store';
import { getUserCollection } from '$lib/services/collections';
import { authStore } from './auth';
import { browser } from '$app/environment';

// Store for the cardCodes of cards in the collection
export const collectionStore = writable<Set<string>>(new Set());

// Variable to track if a loading is in progress
let isLoadingCollection = false;
// Variable to track if the collection has already been loaded at least once
let collectionLoaded = false;

// Function to load the complete collection
export async function loadCollection() {
	const authState = get(authStore);
	if (!authState.profile?.username) return;
	
	// Avoid multiple simultaneous loadings
	if (isLoadingCollection) return;
	
	// If the collection is already loaded and the store has elements, don't reload
	if (collectionLoaded && get(collectionStore).size > 0) return;

	try {
		isLoadingCollection = true;
		const { data: collectionItems, error } = await getUserCollection(authState.profile.username);
		
		if (error) {
			console.error('Error loading collection:', error);
			return;
		}

		// Create a Set of cardCodes for O(1) lookup
		const collectionCardCodes = new Set(collectionItems?.map(item => item.card_code) || []);
		collectionStore.set(collectionCardCodes);
		collectionLoaded = true;
	} catch (error) {
		console.error('Exception loading collection:', error);
	} finally {
		isLoadingCollection = false;
	}
}

// Function to add a card to the local collection
export function addToCollectionStore(cardCode: string) {
	collectionStore.update(set => {
		const newSet = new Set(set);
		newSet.add(cardCode);
		return newSet;
	});
}

// Function to remove a card from the local collection
export function removeFromCollectionStore(cardCode: string) {
	collectionStore.update(set => {
		const newSet = new Set(set);
		newSet.delete(cardCode);
		return newSet;
	});
}

// Client-side initialization
if (browser) {
	// Subscribe to authentication changes to load/clear the collection
	authStore.subscribe(state => {
		if (state.initialized && !state.loading) {
			if (state.profile) {
				// User is logged in, load their collection
				loadCollection();
			} else {
				// User is logged out, clear the collection
				collectionStore.set(new Set());
				collectionLoaded = false;
			}
		}
	});
} 