import { supabase } from '../supabase';
import { updateCollectionStoreCount } from '$lib/stores/collection';
import type { Card, PriceData, Set } from '../types';
import { findSetByCardCode } from '$helpers/set-utils';

// Add a new instance of a card to user's collection
export async function addCardToCollection(username: string, cardCode: string) {
	try {
		// Insert a new row for this card instance
		const { data, error } = await supabase
			.from('collections')
			.insert({
				username,
				card_code: cardCode,
			})
			.select('card_code') // Select to confirm insertion
			.single();

		if (!error && data) {
			// Increment the count in the local store
			updateCollectionStoreCount(data.card_code, 1);
		}

		// Return minimal data, error handling happens in component
		return { data: data ? { card_code: data.card_code } : null, error };
	} catch (error) {
		console.error('Error adding card instance to collection:', error);
		return { data: null, error };
	}
}

// Remove one instance of a card from user's collection
export async function removeCardFromCollection(username: string, cardCode: string) {
	try {
		// Find *one* specific row ID for this card to delete
		const { data: rowToDelete, error: fetchError } = await supabase
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
			updateCollectionStoreCount(cardCode, 0); // Reset store count if needed
			return { data: null, error: { message: 'Card instance not found in collection' } };
		}

		// Delete the specific row found
		const { error: deleteError } = await supabase
			.from('collections')
			.delete()
			.eq('id', rowToDelete.id);

		if (!deleteError) {
			// Decrement the count in the local store
			updateCollectionStoreCount(cardCode, -1);
		}

		// Return minimal data, error handling happens in component
		return { data: !deleteError ? { card_code: cardCode } : null, error: deleteError }; 

	} catch (error) {
		console.error('Error removing card instance from collection:', error);
		return { data: null, error };
	}
}

// Get user's collection (only card codes needed for counting)
export async function getUserCollection(username: string) {
	try {
		const { data, error } = await supabase
			.from('collections')
			.select('card_code') // Select ONLY card_code
			.eq('username', username);

		return { data, error };
	} catch (error) {
		console.error('Error getting user collection card codes:', error);
		return { data: null, error };
	}
}

// Get *all instances* for a specific card (might be useful later)
export async function getCardInstancesInCollection(username: string, cardCode: string) {
	try {
		const { data, error } = await supabase
			.from('collections')
			.select('*') // Select all columns for potential future use
			.eq('username', username)
			.eq('card_code', cardCode);

		return { data, error };
	} catch (error) {
		console.error('Error getting card instances in collection:', error);
		return { data: null, error };
	}
}

// Get collection stats (count by rarity, set, total value, etc. - BASED ON UNIQUE CARDS)
export async function getCollectionStats(username: string, allCards: Card[], allSets: Set[], prices: Record<string, PriceData>) {
	try {
		// Get user's collection
		const { data: collection, error } = await getUserCollection(username);

		if (error || !collection) {
			return { data: null, error };
		}

		// Get user's wishlist
		const { getUserWishlist } = await import('$lib/services/wishlists');
		const { data: wishlist, error: wishlistError } = await getUserWishlist(username);
		
		// Default wishlist count to 0 if there's an error
		const wishlistCount = wishlistError || !wishlist ? 0 : wishlist.length;
		
		// Create a set of cardCodes for quick lookup
		const collectionCardCodes = new Set(collection.map(item => item.card_code));
		
		// Calculate basic stats
		const totalCards = collection.length;
		
		// Calculate total value
		let totalValue = 0;
		const cardsInCollection = allCards.filter(card => collectionCardCodes.has(card.cardCode));
		cardsInCollection.forEach(card => {
			const cardPrice = prices[card.cardCode];
			if (cardPrice && cardPrice.simple) {
				totalValue += cardPrice.simple;
			}
		});
		
		// Calculate cards by rarity
		const cardsByRarity: Record<string, number> = {};
		cardsInCollection.forEach(card => {
			cardsByRarity[card.rarity] ??= 0;
			cardsByRarity[card.rarity]++;
		});
		
		// Calculate cards by set, completion percentages, and values
		const setStats: Record<string, {
			count: number;
			total: number;
			percentage: number;
			collectedValue: number;
			totalValue: number;
		}> = {};
		
		// Initialize sets with cards in collection
		const setsWithCards = new Set<string>();
		cardsInCollection.forEach(card => {
			setsWithCards.add(card.setName);
		});
		
		// Calculate stats for each set in the collection
		allSets.forEach(set => {
			if (setsWithCards.has(set.name)) {
				const setCards = allCards.filter(card => findSetByCardCode(card.cardCode, [set]));
				const collectionSetCards = cardsInCollection.filter(card => findSetByCardCode(card.cardCode, [set]));

				let collectedSetValue = 0;
				collectionSetCards.forEach(card => {
					const cardPrice = prices[card.cardCode];
					if (cardPrice && cardPrice.simple) {
						collectedSetValue += cardPrice.simple;
					}
				});

				let totalSetValue = 0;
				setCards.forEach(card => {
					const cardPrice = prices[card.cardCode];
					if (cardPrice && cardPrice.simple) {
						totalSetValue += cardPrice.simple;
					}
				});

				setStats[set.name] = {
					count: collectionSetCards.length,
					total: setCards.length,
					percentage: setCards.length > 0 ? Math.round((collectionSetCards.length / setCards.length) * 100) : 0,
					collectedValue: Math.round(collectedSetValue * 100) / 100,
					totalValue: Math.round(totalSetValue * 100) / 100,
				};
			}
		});
		
		return {
			data: {
				total_cards: totalCards,
				total_value: Math.round(totalValue * 100) / 100,
				cards_by_rarity: cardsByRarity,
				set_completion: setStats,
				wishlist_count: wishlistCount
			},
			error: null
		};
	} catch (error) {
		console.error('Error getting collection stats:', error);
		return { data: null, error };
	}
}
