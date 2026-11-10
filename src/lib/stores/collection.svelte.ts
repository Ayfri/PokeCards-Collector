import { SvelteMap } from 'svelte/reactivity';

/**
 * How many copies of each card code the current user owns, mirrored client-side so a card knows its own count without
 * a query. Backed by a `SvelteMap`, so a card only re-renders when its own count changes.
 */
class Collection {
	#counts = new SvelteMap<string, number>();

	/**
	 * Distinct owned cards per Pokédex number, read from the second part of an English code (`pokemon_25_base1_58`). French codes (a `fr`-prefixed set part) are left out, and Japanese
	 * ones, which share the English shape, are counted: the code alone cannot tell them apart, so a total can exceed the English card count and callers cap it.
	 * The unknown-species sentinel 99999 lands on a number no Pokémon carries.
	 */
	ownedPerPokemon = $derived.by(() => {
		const owned = new Map<number, number>();
		for (const cardCode of this.#counts.keys()) {
			const id = Number(/^pokemon_(\d+)_(?!fr)/.exec(cardCode)?.[1]);
			if (id) owned.set(id, (owned.get(id) ?? 0) + 1);
		}
		return owned;
	});

	count(cardCode: string) {
		return this.#counts.get(cardCode) ?? 0;
	}

	/** A count that drops to zero removes the entry, so the map only ever holds owned cards. */
	add(cardCode: string, change: number) {
		const count = this.count(cardCode) + change;
		if (count > 0) {
			this.#counts.set(cardCode, count);
		} else {
			this.#counts.delete(cardCode);
		}
	}

	remove(cardCode: string) {
		this.#counts.delete(cardCode);
	}

	/** Mirrors the rows the server load returned, touching only the codes whose count actually moved. */
	replaceAll(cardCodes: string[]) {
		const counts = new Map<string, number>();
		for (const cardCode of cardCodes) counts.set(cardCode, (counts.get(cardCode) ?? 0) + 1);

		for (const cardCode of this.#counts.keys()) {
			if (!counts.has(cardCode)) this.#counts.delete(cardCode);
		}
		for (const [cardCode, count] of counts) {
			if (this.#counts.get(cardCode) !== count) this.#counts.set(cardCode, count);
		}
	}
}

export const collection = new Collection();
