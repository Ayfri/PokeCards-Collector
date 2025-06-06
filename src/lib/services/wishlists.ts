import { supabase } from '../supabase';
import { addToWishlistStore, removeFromWishlistStore } from '$lib/stores/wishlist';
import { setLoading } from '$lib/stores/loading';

// Add a card to user's wishlist
export async function addCardToWishlist(username: string, cardCode: string) {
	try {
		setLoading(true);
		// Check if card already exists in wishlist
		const { data: existingCard } = await supabase
			.from('wishlists')
			.select('*')
			.eq('username', username)
			.eq('card_code', cardCode)
			.maybeSingle();

		if (existingCard) {
			// Card already in wishlist, return it
			addToWishlistStore(cardCode); // Ajoute au store local
			return { data: existingCard, error: null };
		} else {
			// Insert new card if it doesn't exist
			const { data, error } = await supabase
				.from('wishlists')
				.insert({
					username,
					card_code: cardCode,
				})
				.select();

			if (!error) {
				addToWishlistStore(cardCode); // Ajoute au store local
			}

			return { data, error };
		}
	} catch (error) {
		console.error('Error adding card to wishlist:', error);
		return { data: null, error };
	} finally {
		setLoading(false);
	}
}

// Remove a card from user's wishlist
export async function removeCardFromWishlist(username: string, cardCode: string) {
	try {
		setLoading(true);
		const { data, error } = await supabase
			.from('wishlists')
			.delete()
			.eq('username', username)
			.eq('card_code', cardCode)
			.select();

		if (!error) {
			removeFromWishlistStore(cardCode); // Retire du store local
		}

		return { data, error };
	} catch (error) {
		console.error('Error removing card from wishlist:', error);
		return { data: null, error };
	} finally {
		setLoading(false);
	}
}

// Get if a card is in user's wishlist
export async function isCardInWishlist(username: string, cardCode: string) {
	try {
		const { data, error } = await supabase
			.from('wishlists')
			.select('*')
			.eq('username', username)
			.eq('card_code', cardCode)
			.maybeSingle();

		return {
			exists: !!data,
			data,
			error
		};
	} catch (error) {
		console.error('Error checking wishlist:', error);
		return {
			exists: false,
			data: null,
			error
		};
	}
}

// Get user's wishlist
export async function getUserWishlist(username: string) {
	try {
		const { data, error } = await supabase
			.from('wishlists')
			.select('*')
			.eq('username', username);

		return { data, error };
	} catch (error) {
		console.error('Error getting user wishlist:', error);
		return { data: null, error };
	}
}
