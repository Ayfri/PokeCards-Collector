import { getSupabaseBrowserClient } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { wishlist } from '$stores/wishlist.svelte';
import { loading } from '$stores/loading.svelte';
import { selectAll } from './select-all';

export async function addCardToWishlist(username: string, cardCode: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		loading.mutation = true;
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

/** Every wishlist row of the user, paged past the row cap. */
export async function getUserWishlist(username: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		return await selectAll(() => client
			.from('wishlists')
			.select('*', { count: 'exact' })
			.eq('username', username)
			.order('id'));
	} catch (error) {
		console.error('Error getting user wishlist:', error);
		return { data: null, error };
	}
}
