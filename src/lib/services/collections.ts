import { supabase } from '../supabase';
import type { UserCollection } from '../types';

// Add a card to user's collection
export async function addCardToCollection(username: string, cardId: string, quantity: number = 1) {
  try {
    // Check if card already exists in collection
    const { data: existingCard } = await supabase
      .from('collections')
      .select('*')
      .eq('username', username)
      .eq('card_id', cardId)
      .single();

    if (existingCard) {
      // Update quantity if card exists
      const { data, error } = await supabase
        .from('collections')
        .update({ quantity: existingCard.quantity + quantity })
        .eq('id', existingCard.id)
        .select();
      
      return { data, error };
    } else {
      // Insert new card if it doesn't exist
      const { data, error } = await supabase
        .from('collections')
        .insert({
          username,
          card_id: cardId,
          quantity,
        })
        .select();
      
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
export async function removeCardFromCollection(username: string, cardId: string, quantity: number = 1) {
  try {
    // Get current card in collection
    const { data: existingCard } = await supabase
      .from('collections')
      .select('*')
      .eq('username', username)
      .eq('card_id', cardId)
      .single();
    
    if (!existingCard) {
      return { data: null, error: new Error('Card not found in collection') };
    }
    
    if (existingCard.quantity <= quantity) {
      // Delete the card if quantity will be 0 or less
      const { data, error } = await supabase
        .from('collections')
        .delete()
        .eq('id', existingCard.id)
        .select();
      
      return { data, error };
    } else {
      // Reduce the quantity
      const { data, error } = await supabase
        .from('collections')
        .update({ quantity: existingCard.quantity - quantity })
        .eq('id', existingCard.id)
        .select();
      
      return { data, error };
    }
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
export async function getCardInCollection(username: string, cardId: string) {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('username', username)
      .eq('card_id', cardId)
      .single();
    
    return { data, error };
  } catch (error) {
    console.error('Error getting card in collection:', error);
    return { data: null, error };
  }
}

// Get collection stats (count by rarity, set, total value, etc.)
export async function getCollectionStats(username: string) {
  try {
    const { data: collection, error } = await getUserCollection(username);
    
    if (error || !collection) {
      return { data: null, error };
    }

    // Calculate basic stats
    const totalCards = collection.reduce((sum, item) => sum + item.quantity, 0);
    
    // We'd need to fetch card details to calculate total value and other stats
    // For now, return basic stats
    return { 
      data: {
        total_cards: totalCards,
        total_value: 0, // Would require fetching card prices
        cards_by_rarity: {},
        cards_by_set: {}
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error getting collection stats:', error);
    return { data: null, error };
  }
} 