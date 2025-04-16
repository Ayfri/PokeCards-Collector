import { writable } from 'svelte/store';
import { browser } from '$app/environment'; // Use SvelteKit's browser check

/**
 * Creates a Svelte writable store that automatically persists its value
 * to localStorage and initializes from localStorage if a value exists.
 * @param key The key to use for localStorage.
 * @param initialValue The initial value to use if nothing is found in localStorage.
 */
export function persistentWritable<T>(key: string, initialValue: T) {
	let storedValue: T | null = null;

	// Check localStorage only on the client-side
	if (browser) {
		const storedString = localStorage.getItem(key);
		if (storedString !== null) {
			try {
				storedValue = JSON.parse(storedString);
			} catch (e) {
				console.error(`Failed to parse localStorage key "${key}":`, e);
				// Fallback to initial value if parsing fails
				localStorage.removeItem(key); // Clear corrupted data
				storedValue = initialValue;
			}
		} else {
			storedValue = initialValue;
		}
	} else {
		// On server-side or environments without localStorage, just use initial value
		storedValue = initialValue;
	}


	const store = writable<T>(storedValue as T); // Initialize with stored or initial value

	// Subscribe to store changes and update localStorage on the client
	if (browser) {
		store.subscribe(value => {
			localStorage.setItem(key, JSON.stringify(value));
		});
	}

	return store;
} 