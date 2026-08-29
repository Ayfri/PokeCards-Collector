import { writable } from 'svelte/store';

/** The card codes on the current user's wishlist, mirrored client-side so a card knows its own state without a query. */
export const wishlistStore = writable<Set<string>>(new Set());

export function addToWishlistStore(cardCode: string) {
	wishlistStore.update(set => {
		const newSet = new Set(set);
		newSet.add(cardCode);
		return newSet;
	});
}

export function removeFromWishlistStore(cardCode: string) {
	wishlistStore.update(set => {
		const newSet = new Set(set);
		newSet.delete(cardCode);
		return newSet;
	});
}
