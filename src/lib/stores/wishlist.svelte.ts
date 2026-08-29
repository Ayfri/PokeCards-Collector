import { SvelteSet } from 'svelte/reactivity';

/**
 * The card codes on the current user's wishlist, mirrored client-side so a card knows its own state without a query.
 * Backed by a `SvelteSet`, so a card only re-renders when its own code is added or removed.
 */
class Wishlist {
	#cardCodes = new SvelteSet<string>();

	has(cardCode: string) {
		return this.#cardCodes.has(cardCode);
	}

	add(cardCode: string) {
		this.#cardCodes.add(cardCode);
	}

	remove(cardCode: string) {
		this.#cardCodes.delete(cardCode);
	}

	/** Mirrors the rows the server load returned, touching only the codes that actually changed. */
	replaceAll(cardCodes: string[]) {
		const wanted = new Set(cardCodes);

		for (const cardCode of this.#cardCodes) {
			if (!wanted.has(cardCode)) this.#cardCodes.delete(cardCode);
		}
		for (const cardCode of wanted) this.#cardCodes.add(cardCode);
	}
}

export const wishlist = new Wishlist();
