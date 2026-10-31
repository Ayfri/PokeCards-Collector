import { getSupabaseBrowserClient } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { collection } from '$stores/collection.svelte';
import { loading } from '$stores/loading.svelte';
import { selectAll } from './select-all';

const MAX_CARD_QUANTITY = 99;

export async function addCardToCollection(username: string, cardCode: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		loading.mutation = true;
		const { count, error: countError } = await client
			.from('collections')
			/** `head: true` returns the count without the rows. */
			.select('*', { count: 'exact', head: true })
			.eq('username', username)
			.eq('card_code', cardCode);

		if (countError) {
			console.error('Error checking card count:', countError);
			return { data: null, error: countError };
		}

		if (count !== null && count >= MAX_CARD_QUANTITY) {
			console.warn(`User ${username} reached quantity limit for card ${cardCode}`);
			return { data: null, error: { message: `Maximum quantity (${MAX_CARD_QUANTITY}) reached for this card.` } };
		}

		const { data, error } = await client
			.from('collections')
			.insert({
				username,
				card_code: cardCode,
			})
			.select('card_code')
			.single();

		if (!error && data) collection.add(data.card_code, 1);

		/** Only the card code is returned, the caller handles the error. */
		return { data: data ?{ card_code: data.card_code } : null, error };
	} catch (error) {
		console.error('Error adding card instance to collection:', error);
		return { data: null, error };
	} finally {
		loading.mutation = false;
	}
}

export async function removeCardFromCollection(username: string, cardCode: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		loading.mutation = true;
		/** One row per copy, so removing one copy deletes exactly one row. */
		const { data: rowToDelete, error: fetchError } = await client
			.from('collections')
			.select('id')
			.eq('username', username)
			.eq('card_code', cardCode)
			.limit(1)
			.maybeSingle();
		
		if (fetchError) throw fetchError;
		
		if (!rowToDelete) {
			/** No row means the client-side count was probably out of sync, so it is corrected here. */
			console.warn('Attempted to remove a card instance not found in DB:', cardCode);
			collection.remove(cardCode);
			return { data: null, error: { message: 'Card instance not found in collection' } };
		}

		const { error: deleteError } = await client
			.from('collections')
			.delete()
			.eq('id', rowToDelete.id);

		if (!deleteError) collection.add(cardCode, -1);

		/** Only the card code is returned, the caller handles the error. */
		return { data: !deleteError ? { card_code: cardCode } : null, error: deleteError }; 

	} catch (error) {
		console.error('Error removing card instance from collection:', error);
		return { data: null, error };
	} finally {
		loading.mutation = false;
	}
}

/** Every copy the user owns, one row per copy and only its card code, paged past the row cap. */
export async function getUserCollection(username: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		return await selectAll(() => client
			.from('collections')
			.select('card_code', { count: 'exact' })
			.eq('username', username)
			.order('id'));
	} catch (error) {
		console.error('Error getting user collection card codes:', error);
		return { data: null, error };
	}
}
