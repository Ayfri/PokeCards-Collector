import { getSupabaseBrowserClient } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { wishlist } from '$stores/wishlist.svelte';
import { loading } from '$stores/loading.svelte';

// Add a card to user's wishlist
export async function addCardToWishlist(username: string, cardCode: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		loading.mutation = true;
		// Check if card already exists in wishlist
		const { data: existingCard } = await client
			.from('wishlists')
			.select('*')
			.eq('username', username)
			.eq('card_code', cardCode)
			.maybeSingle();

		if (existingCard) {
			wishlist.add(cardCode);
			return { data: existingCard, error: null };
		} else {
			// Insert new card if it doesn't exist
			const { data, error } = await client
				.from('wishlists')
				.insert({
					username,
					card_code: cardCode,
				})
				.select();

			if (!error) wishlist.add(cardCode);

			return { data, error };
		}
	} catch (error) {
		console.error('Error adding card to wishlist:', error);
		return { data: null, error };
	} finally {
		loading.mutation = false;
	}
}

// Remove a card from user's wishlist
export async function removeCardFromWishlist(username: string, cardCode: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		loading.mutation = true;
		const { data, error } = await client
			.from('wishlists')
			.delete()
			.eq('username', username)
			.eq('card_code', cardCode)
			.select();

		if (!error) wishlist.remove(cardCode);

		return { data, error };
	} catch (error) {
		console.error('Error removing card from wishlist:', error);
		return { data: null, error };
	} finally {
		loading.mutation = false;
	}
}

// Get user's wishlist
export async function getUserWishlist(username: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		const { data, error } = await client
			.from('wishlists')
			.select('*')
			.eq('username', username);

		return { data, error };
	} catch (error) {
		console.error('Error getting user wishlist:', error);
		return { data: null, error };
	}
}
