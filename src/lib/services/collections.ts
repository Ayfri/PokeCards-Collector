import { supabase } from '../supabase';
import { addToCollectionStore, removeFromCollectionStore } from '$lib/stores/collection';
import type { Card, PriceData, Set } from '../types';
import { findSetByCardCode } from '$helpers/set-utils';

// Add a card to user's collection
export async function addCardToCollection(username: string, cardCode: string) {
	try {
		// Check if card already exists in collection
		const { data: existingCard } = await supabase
			.from('collections')
			.select('*')
			.eq('username', username)
			.eq('card_code', cardCode)
			.maybeSingle();

		if (existingCard) {
			// Card already exists, just return it
			if (!existingCard.error) {
				addToCollectionStore(cardCode); // Add to local store
			}
			return { data: existingCard, error: null };
		} else {
			// Insert new card if it doesn't exist
			const { data, error } = await supabase
				.from('collections')
				.insert({
					username,
					card_code: cardCode,
				})
				.select();

			if (!error) {
				addToCollectionStore(cardCode); // Add to local store
			}

			return { data, error };
		}
	} catch (error) {
		console.error('Error adding card to collection:', error);
		return { data: null, error };
	}
}

// Update card quantity in collection
export async function updateCardQuantity(collectionId: string, quantity: number) {
	try {
		const { data, error } = await supabase
			.from('collections')
			.update({ quantity })
			.eq('id', collectionId)
			.select();

		return { data, error };
	} catch (error) {
		console.error('Error updating card quantity:', error);
		return { data: null, error };
	}
}

// Remove a card from user's collection
export async function removeCardFromCollection(username: string, cardCode: string) {
	try {
		// Delete the card
		const { data, error } = await supabase
			.from('collections')
			.delete()
			.eq('username', username)
			.eq('card_code', cardCode)
			.select();

		if (!error) {
			removeFromCollectionStore(cardCode); // Remove from local store
		}

		return { data, error };
	} catch (error) {
		console.error('Error removing card from collection:', error);
		return { data: null, error };
	}
}

// Get user's collection
export async function getUserCollection(username: string) {
	try {
		const { data, error } = await supabase
			.from('collections')
			.select('*')
			.eq('username', username);

		return { data, error };
	} catch (error) {
		console.error('Error getting user collection:', error);
		return { data: null, error };
	}
}

// Get collection for a specific card
export async function getCardInCollection(username: string, cardCode: string) {
	try {
		const { data, error } = await supabase
			.from('collections')
			.select('*')
			.eq('username', username)
			.eq('card_code', cardCode)
			.maybeSingle();

		return { data, error };
	} catch (error) {
		console.error('Error getting card in collection:', error);
		return { data: null, error };
	}
}

// Get collection stats (count by rarity, set, total value, etc.)
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
