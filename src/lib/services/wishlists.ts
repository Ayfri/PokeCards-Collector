import type { SupabaseClient } from '@supabase/supabase-js';
import { selectAll } from '#lib/services/select-all.ts';
import { getSupabaseBrowserClient } from '#lib/supabase.ts';
import { loading } from '#stores/loading.svelte.ts';
import { wishlist } from '#stores/wishlist.svelte.ts';

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
		}

		const { data, error } = await client
			.from('wishlists')
			.insert({
				card_code: cardCode,
				username,
			})
			.select();

		if (!error) wishlist.add(cardCode);

		return { data, error };
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
	} finally {
		loading.mutation = false;
	}
}

/** Every card the user wishes for, only its card code, paged past the row cap. */
export function getUserWishlist(username: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	return selectAll(() => client
		.from('wishlists')
		.select('card_code', { count: 'exact' })
		.eq('username', username)
		.order('id'));
}
