<script lang="ts">
  import { onMount } from 'svelte';
  import { Heart, Plus, Minus, Trash } from 'lucide-svelte';
  import { authStore } from '$lib/stores/auth';
  import { 
    addCardToCollection, 
    getCardInCollection, 
    updateCardQuantity, 
    removeCardFromCollection 
  } from '$lib/services/collections';
  import { 
    addCardToWishlist, 
    isCardInWishlist, 
    removeCardFromWishlist 
  } from '$lib/services/wishlists';
  import type { UserCollection } from '$lib/types';

  export let cardId: string;
  
  let isInCollection = false;
  let collectionItem: UserCollection | null = null;
  let isInWishlist = false;
  let quantity = 1;
  let isLoading = false;
  
  async function checkStatus() {
    if (!$authStore.user || !$authStore.profile) return;
    
    isLoading = true;
    
    try {
      // Check if card is in collection
      const { data: collectionData } = await getCardInCollection($authStore.profile.username, cardId);
      isInCollection = !!collectionData;
      collectionItem = collectionData;
      
      if (collectionItem) {
        quantity = collectionItem.quantity;
      }
      
      // Check if card is in wishlist
      const { exists } = await isCardInWishlist($authStore.profile.username, cardId);
      isInWishlist = exists;
    } catch (error) {
      console.error('Error checking card status:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function toggleWishlist() {
    if (!$authStore.user || !$authStore.profile) return;
    
    isLoading = true;
    
    try {
      if (isInWishlist) {
        // Remove from wishlist
        await removeCardFromWishlist($authStore.profile.username, cardId);
        isInWishlist = false;
      } else {
        // Add to wishlist
        await addCardToWishlist($authStore.profile.username, cardId);
        isInWishlist = true;
      }
    } catch (error) {
      console.error('Error toggling wishlist status:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function addToCollection() {
    if (!$authStore.user || !$authStore.profile) return;
    
    isLoading = true;
    
    try {
      await addCardToCollection($authStore.profile.username, cardId, 1);
      await checkStatus();
    } catch (error) {
      console.error('Error adding to collection:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function increaseQuantity() {
    if (!collectionItem || !$authStore.user || !$authStore.profile) return;
    
    isLoading = true;
    
    try {
      await updateCardQuantity(collectionItem.id, quantity + 1);
      quantity += 1;
      await checkStatus();
    } catch (error) {
      console.error('Error increasing quantity:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function decreaseQuantity() {
    if (!collectionItem || !$authStore.user || !$authStore.profile || quantity <= 1) return;
    
    isLoading = true;
    
    try {
      await updateCardQuantity(collectionItem.id, quantity - 1);
      quantity -= 1;
      await checkStatus();
    } catch (error) {
      console.error('Error decreasing quantity:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function removeFromCollection() {
    if (!$authStore.user || !$authStore.profile) return;
    
    isLoading = true;
    
    try {
      await removeCardFromCollection($authStore.profile.username, cardId);
      isInCollection = false;
      collectionItem = null;
      quantity = 1;
    } catch (error) {
      console.error('Error removing from collection:', error);
    } finally {
      isLoading = false;
    }
  }
  
  onMount(() => {
    const unsubscribe = authStore.subscribe(state => {
      if (state.user && !state.loading) {
        checkStatus();
      }
    });
    
    return unsubscribe;
  });
</script>

<div class="flex flex-col gap-2 mt-4">
  {#if $authStore.user}
    <div class="flex items-center gap-2">
      <!-- Wishlist button -->
      <button
        class="flex items-center justify-center p-2 rounded-md border {isInWishlist ? 'bg-red-100 border-red-300 text-red-500 dark:bg-red-900 dark:border-red-700 dark:text-red-300' : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400'}"
        on:click={toggleWishlist}
        disabled={isLoading}
        title={isInWishlist ? "Retirer de la wishlist" : "Ajouter à la wishlist"}
      >
        <Heart class="{isInWishlist ? 'fill-current' : ''}" size={20} />
      </button>
      
      <!-- Collection actions -->
      {#if isInCollection}
        <div class="flex items-center gap-2 flex-1">
          <button
            class="p-2 rounded-md border border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400"
            on:click={decreaseQuantity}
            disabled={isLoading || quantity <= 1}
            title="Diminuer la quantité"
          >
            <Minus size={20} />
          </button>
          
          <span class="px-2">{quantity}</span>
          
          <button
            class="p-2 rounded-md border border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400"
            on:click={increaseQuantity}
            disabled={isLoading}
            title="Augmenter la quantité"
          >
            <Plus size={20} />
          </button>
          
          <button
            class="p-2 rounded-md border border-red-300 text-red-500 dark:border-red-600 dark:text-red-400 ml-auto"
            on:click={removeFromCollection}
            disabled={isLoading}
            title="Retirer de ma collection"
          >
            <Trash size={20} />
          </button>
        </div>
      {:else}
        <button
          class="flex items-center justify-center p-2 rounded-md border border-green-300 text-green-500 dark:border-green-700 dark:text-green-400 gap-2 flex-1"
          on:click={addToCollection}
          disabled={isLoading}
        >
          <Plus size={20} />
          <span>Ajouter à ma collection</span>
        </button>
      {/if}
    </div>
  {:else}
    <p class="text-sm text-gray-500 dark:text-gray-400">
      <a href="/" class="text-red-500 hover:underline">Connectez-vous</a> pour ajouter cette carte à votre collection ou wishlist.
    </p>
  {/if}
</div> 