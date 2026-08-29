import { browser } from '$app/environment';

const PREFIX = 'pokecards-collector-';

function read<T>(key: string): T | null {
	if (!browser) return null;

	const stored = localStorage.getItem(PREFIX + key);
	if (stored === null) return null;

	try {
		return JSON.parse(stored) as T;
	} catch {
		localStorage.removeItem(PREFIX + key);
		return null;
	}
}

function write(key: string, value: unknown) {
	if (browser) localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

/** A reactive value restored from localStorage at startup and written back on every assignment. */
export class Persisted<T> {
	#key: string;
	#current: T = $state()!;

	constructor(key: string, initial: T) {
		this.#key = key;
		this.#current = read<T>(key) ?? initial;
	}

	get current() {
		return this.#current;
	}

	set current(value: T) {
		this.#current = value;
		write(this.#key, value);
	}
}

/**
 * The same, for a record whose properties are read and written one at a time: writing any property saves the whole
 * record. Missing properties fall back to `defaults`, so adding a field does not invalidate what users already stored.
 */
export function persistedRecord<T extends object>(key: string, defaults: T): T {
	const values = $state({ ...defaults, ...read<Partial<T>>(key) });

	return new Proxy(values, {
		set(target, property, value) {
			Reflect.set(target, property, value);
			write(key, target);
			return true;
		},
	});
}
