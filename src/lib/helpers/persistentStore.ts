import { writable } from 'svelte/store';

export function persistentStore<T>(key: string, initialValue: T) {
	const store = writable(initialValue);
	const {
		subscribe,
		set,
	} = store;

	if (globalThis.window === undefined) {
		return store;
	}

	const json = localStorage.getItem(key);
	if (json) {
		try {
			set(JSON.parse(json));
		} catch (e) {
			console.error(`Error parsing localStorage key "${key}":`, e);
			// Optionally remove the invalid item
			localStorage.removeItem(key);
			set(initialValue); // Reset to initial value
		}
	}

	return {
		subscribe,
		set: (value: T) => {
			localStorage.setItem(key, JSON.stringify(value));
			set(value);
		},
		update: store.update, // Pass through the update method as well
	};
}
