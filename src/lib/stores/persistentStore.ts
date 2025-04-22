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
	console.log(`[persistentWritable ${keyName}] Initializing. Default value:`, initialValue);

	// --- Step 1: If on client, try to load from localStorage ---
	if (browser) {
		console.log(`[persistentWritable ${keyName}] Running on client. Trying to load from localStorage.`);
		const storedString = localStorage.getItem(keyName);
		if (storedString !== null) {
			console.log(`[persistentWritable ${keyName}] Found value in localStorage:`, storedString);
			try {
				value = JSON.parse(storedString); // Update the value *before* creating the store
				console.log(`[persistentWritable ${keyName}] Parsed value from localStorage:`, value);
			} catch (e) {
				console.error(`[persistentWritable ${keyName}] Failed to parse localStorage:`, e);
				localStorage.removeItem(keyName); // Clear corrupted data
			}
		} else {
			console.log(`[persistentWritable ${keyName}] No value found in localStorage. Using default.`);
		}
	} else {
		console.log(`[persistentWritable ${keyName}] Running on server. Using default value.`);
	}

	// --- Step 2: Create the store with the determined initial value ---
	const store = writable<T>(value);
	console.log(`[persistentWritable ${keyName}] Store created with initial value:`, value);

	// --- Step 3: If on client, subscribe to write subsequent changes back ---
	if (browser) {
		store.subscribe(currentValue => {
			console.log(`[persistentWritable ${keyName}] Value changed. Saving to localStorage:`, currentValue);
			// Prevent writing undefined/null back
			if (currentValue !== undefined && currentValue !== null) {
				localStorage.setItem(keyName, JSON.stringify(currentValue));
			} else {
				console.log(`[persistentWritable ${keyName}] Value is undefined/null. Removing from localStorage.`);
				// Optionally clear the item if the store value becomes null/undefined
				localStorage.removeItem(keyName);
			}
		});
	}

	return store;
}
