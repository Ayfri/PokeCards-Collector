import { getSupabaseBrowserClient } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { collection } from '$stores/collection.svelte';
import type { Card, CollectionStats, PriceData, Set } from '../types';
import { loading } from '$stores/loading.svelte';
import { getUserWishlist } from './wishlists';
import { cardPrice } from '$helpers/card-utils';

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

/** Number of owned cards the profile showcases, most valuable first. */
const SHOWCASE_SIZE = 6;

const roundCents = (value: number) => Math.round(value * 100) / 100;

/** Collection figures for a profile: copies and values count duplicates, rarities and set completion count distinct cards. */
export async function getCollectionStats(username: string, allCards: Card[], allSets: Set[], prices: Record<string, PriceData>, client: SupabaseClient = getSupabaseBrowserClient()) {
	try {
		const [{ data: collectionRows, error }, { data: wishlistItems, error: wishlistError }] = await Promise.all([
			getUserCollection(username, client),
			getUserWishlist(username, client),
		]);
		if (error || !collectionRows) return { data: null, error };

		const wishlist = wishlistError ? [] : wishlistItems ?? [];
		const copies = new Map<string, number>();
		for (const { card_code } of collectionRows) copies.set(card_code, (copies.get(card_code) ?? 0) + 1);

		const setsById = new Map(allSets.map(set => [set.setId, set]));
		const cardsByRarity: Record<string, number> = {};
		const setCompletion: CollectionStats['set_completion'] = {};
		const owned: { card: Card; copies: number; price: number }[] = [];
		let totalValue = 0;

		/** Sets are only listed once one of their cards is owned, so the catalogue is walked once and the totals of untouched sets are dropped. */
		for (const card of allCards) {
			const set = setsById.get(card.setId);
			const price = cardPrice(prices[card.cardCode]) ?? 0;
			const count = copies.get(card.cardCode) ?? 0;
			const completion = set ? (setCompletion[set.name] ??= { collectedValue: 0, count: 0, percentage: 0, total: 0, totalValue: 0 }) : undefined;
			if (completion) {
				completion.total++;
				completion.totalValue += price;
			}
			if (!count) continue;

			owned.push({ card, copies: count, price });
			totalValue += price * count;
			cardsByRarity[card.rarity] = (cardsByRarity[card.rarity] ?? 0) + 1;
			if (completion) {
				completion.count++;
				completion.collectedValue += price;
			}
		}

		for (const [name, completion] of Object.entries(setCompletion)) {
			if (!completion.count) {
				delete setCompletion[name];
				continue;
			}
			completion.percentage = (completion.count / completion.total) * 100;
			completion.collectedValue = roundCents(completion.collectedValue);
			completion.totalValue = roundCents(completion.totalValue);
		}

		const stats: CollectionStats = {
			cards_by_rarity: cardsByRarity,
			set_completion: setCompletion,
			top_cards: owned.filter(({ price }) => price > 0).sort((a, b) => b.price - a.price).slice(0, SHOWCASE_SIZE),
			total_instances: collectionRows.length,
			total_value: roundCents(totalValue),
			unique_cards: copies.size,
			wishlist_count: wishlist.length,
			wishlist_total_value: roundCents(wishlist.reduce((sum, item) => sum + (cardPrice(prices[item.card_code]) ?? 0), 0)),
		};
		return { data: stats, error: null };
	} catch (error) {
		console.error('Error getting collection stats:', error);
		return { data: null, error };
	}
}
