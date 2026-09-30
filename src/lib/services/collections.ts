import { getSupabaseBrowserClient } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { collection } from '$stores/collection.svelte';
import { loading } from '$stores/loading.svelte';

// --- Constants ---
const MAX_CARD_QUANTITY = 99; // Define the maximum allowed quantity per card

// Add a new instance of a card to user's collection
export async function addCardToCollection(username: string, cardCode: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		loading.mutation = true;
		// --- Check current count against the limit ---
		const { count, error: countError } = await client
			.from('collections')
			.select('*', { count: 'exact', head: true }) // Use head: true for efficiency
			.eq('username', username)
			.eq('card_code', cardCode);

		if (countError) {
			console.error('Error checking card count:', countError);
			return { data: null, error: countError };
		}

		if (count !== null && count >= MAX_CARD_QUANTITY) {
			console.warn(`User ${username} reached quantity limit for card ${cardCode}`);
			// Return a specific error or indicator that limit was reached
			return { data: null, error: { message: `Maximum quantity (${MAX_CARD_QUANTITY}) reached for this card.` } };
		}
		// --- End Check ---

		// Insert a new row for this card instance
		const { data, error } = await client
			.from('collections')
			.insert({
				username,
				card_code: cardCode,
			})
			.select('card_code') // Select to confirm insertion
			.single();

		if (!error && data) collection.add(data.card_code, 1);

		// Return minimal data, error handling happens in component
		return { data: data ? { card_code: data.card_code } : null, error };
	} catch (error) {
		console.error('Error adding card instance to collection:', error);
		return { data: null, error };
	} finally {
		loading.mutation = false;
	}
}

// Remove one instance of a card from user's collection
export async function removeCardFromCollection(username: string, cardCode: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		loading.mutation = true;
		// Find *one* specific row ID for this card to delete
		const { data: rowToDelete, error: fetchError } = await client
			.from('collections')
			.select('id') // Select only the id
			.eq('username', username)
			.eq('card_code', cardCode)
			.limit(1) // Ensure we only get one row
			.maybeSingle();
		
		if (fetchError) throw fetchError;
		
		if (!rowToDelete) {
			// Card not found, maybe store count was out of sync
			console.warn('Attempted to remove a card instance not found in DB:', cardCode);
			collection.remove(cardCode);
			return { data: null, error: { message: 'Card instance not found in collection' } };
		}

		// Delete the specific row found
		const { error: deleteError } = await client
			.from('collections')
			.delete()
			.eq('id', rowToDelete.id);

		if (!deleteError) collection.add(cardCode, -1);

		// Return minimal data, error handling happens in component
		return { data: !deleteError ? { card_code: cardCode } : null, error: deleteError }; 

	} catch (error) {
		console.error('Error removing card instance from collection:', error);
		return { data: null, error };
	} finally {
		loading.mutation = false;
	}
}

// Get user's collection (only card codes needed for counting)
export async function getUserCollection(username: string, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		const { data, error } = await client
			.from('collections')
			.select('card_code') // Select ONLY card_code
			.eq('username', username);

		return { data, error };
	} catch (error) {
		console.error('Error getting user collection card codes:', error);
		return { data: null, error };
	}
}
