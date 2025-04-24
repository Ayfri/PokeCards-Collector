import { supabase } from '../supabase';
import type { UserCollection } from '../types';
import { addToCollectionStore, removeFromCollectionStore } from '$lib/stores/collection';

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
export async function getCollectionStats(username: string) {
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

		// Import necessary data
		const { getCards, getSets, getPrices } = await import('$helpers/data');
		const allCards = await getCards();
		const allSets = await getSets();
		const prices = await getPrices();
		
		// Create a set of cardCodes for quick lookup
		const collectionCardCodes = new Set(collection.map(item => item.card_code));
		
		// Calculate basic stats
		const totalCards = collection.length;
		
		// Calculate total value
		let totalValue = 0;
		const cardsInCollection = allCards.filter(card => collectionCardCodes.has(card.cardCode));
		cardsInCollection.forEach(card => {
			const cardPrice = prices[card.cardCode];
			if (cardPrice && cardPrice.trend) {
				totalValue += cardPrice.trend;
			}
		});
		
		// Calculate cards by rarity
		const cardsByRarity: Record<string, number> = {};
		cardsInCollection.forEach(card => {
			if (!cardsByRarity[card.rarity]) {
				cardsByRarity[card.rarity] = 0;
			}
			cardsByRarity[card.rarity]++;
		});
		
		// Calculate cards by set and completion percentages
		const setStats: Record<string, { count: number; total: number; percentage: number }> = {};
		
		// Initialize sets with cards in collection
		const setsWithCards = new Set<string>();
		cardsInCollection.forEach(card => {
			setsWithCards.add(card.setName);
		});
		
		// Calculate completion for each set in the collection
		allSets.forEach(set => {
			if (setsWithCards.has(set.name)) {
				const setCards = allCards.filter(card => card.setName === set.name);
				const collectionSetCards = cardsInCollection.filter(card => card.setName === set.name);
				
				setStats[set.name] = {
					count: collectionSetCards.length,
					total: setCards.length,
					percentage: Math.round((collectionSetCards.length / setCards.length) * 100)
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
