import { writable, get } from 'svelte/store';
import { getUserWishlist } from '$lib/services/wishlists';
import { setLoading } from './loading';

// Store for the cardCodes of cards in the wishlist
export const wishlistStore = writable<Set<string>>(new Set());

// Function to load the complete wishlist for a specific user
export async function loadWishlist(username: string) {
	if (!username) {
		console.warn('[WishlistStore] loadWishlist called without username.');
		wishlistStore.set(new Set()); // Ensure store is empty if no user
		return;
	}

	// Consider managing loading state differently if still needed
	try {
		setLoading(true); // Use global loading store if appropriate
		const { data: wishlistItems, error } = await getUserWishlist(username);

		if (error) {
			console.error('Error loading wishlist:', error);
			wishlistStore.set(new Set()); // Reset on error
			return;
		}

		const wishlistCardCodes = new Set(wishlistItems?.map(item => item.card_code) || []);
		wishlistStore.set(wishlistCardCodes);

	} catch (error) {
		console.error('Exception loading wishlist:', error);
		wishlistStore.set(new Set()); // Reset on error
	} finally {
		setLoading(false);
	}
}

// Function to add a card to the local wishlist store
export function addToWishlistStore(cardCode: string) {
	wishlistStore.update(set => {
		const newSet = new Set(set);
		newSet.add(cardCode);
		return newSet;
	});
}

// Function to remove a card from the local wishlist store
export function removeFromWishlistStore(cardCode: string) {
	wishlistStore.update(set => {
		const newSet = new Set(set);
		newSet.delete(cardCode);
		return newSet;
	});
}
