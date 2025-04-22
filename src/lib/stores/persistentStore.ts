import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment'; // Use SvelteKit's browser check

/**
 * Creates a Svelte writable store that automatically persists its value
 * to localStorage and initializes from localStorage if a value exists,
 * handling SSR correctly.
 * @param key The key to use for localStorage.
 * @param initialValue The initial value to use if nothing is found in localStorage or on the server.
 */
export function persistentWritable<T>(key: string, initialValue: T): Writable<T> {
	const keyName = `pokestore-${key}`;
	let value = initialValue; // Start with the default

	// --- Step 1: If on client, try to load from localStorage ---
	if (browser) {
		const storedString = localStorage.getItem(keyName);
		if (storedString !== null) {

			try {
				value = JSON.parse(storedString); // Update the value *before* creating the store
			} catch (e) {
				localStorage.removeItem(keyName); // Clear corrupted data
			}
		}
	}

	// --- Step 2: Create the store with the determined initial value ---
	const store = writable<T>(value);

	// --- Step 3: If on client, subscribe to write subsequent changes back ---
	if (browser) {
		store.subscribe(currentValue => {
			// Prevent writing undefined/null back
			if (currentValue !== undefined && currentValue !== null) {
				localStorage.setItem(keyName, JSON.stringify(currentValue));
			} else {
				localStorage.removeItem(keyName);
			}
		});
	}

	return store;
}
