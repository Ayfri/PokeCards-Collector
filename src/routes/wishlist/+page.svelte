<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth';
  import { getUserWishlist } from '$lib/services/wishlists';
  import { goto } from '$app/navigation';
  import PageTitle from '$lib/components/PageTitle.svelte';
  import type { UserWishlist, Card } from '$lib/types';
  
  let isLoading = true;
  let wishlist: UserWishlist[] = [];
  let cards: Card[] = [];
  
  async function loadWishlist() {
    if (!$authStore.user || !$authStore.profile) {
      return;
    }
    
    isLoading = true;
    
    try {
      // Get wishlist
      const { data: wishlistData, error: wishlistError } = await getUserWishlist($authStore.profile.username);
      
      if (wishlistError) {
        console.error('Error loading wishlist:', wishlistError);
        return;
      }
      
      wishlist = wishlistData || [];
      
      // TODO: Fetch card details using card_ids from wishlist
      // This would depend on your API for fetching cards
      
    } catch (error) {
      console.error('Error in loadWishlist:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Check if user is logged in
  onMount(() => {
    const unsubscribe = authStore.subscribe(state => {
      if (state.user === null && !state.loading) {
        // Redirect to home if not logged in
        goto('/');
      } else if (state.user && !state.loading) {
        loadWishlist();
      }
    });
    
    return unsubscribe;
  });
</script>

<div class="w-full mx-auto pb-4 lg:pb-5">
  <div class="flex justify-between mx-28 max-lg:mx-4 items-center">
    <PageTitle title="My Wishlist" />
  </div>
</div>

<div class="container mx-auto px-4 py-8">
  {#if isLoading}
    <div class="flex justify-center items-center p-8">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
    </div>
  {:else if !$authStore.user}
    <div class="text-center p-8">
      <p class="text-lg">Please sign in to view your wishlist.</p>
    </div>
  {:else if wishlist.length === 0}
    <div class="text-center p-8">
      <p class="text-lg">Your wishlist is empty.</p>
      <p class="mt-2">Add cards to your wishlist by browsing card pages.</p>
    </div>
  {:else}
    <!-- Wishlist cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {#each wishlist as item}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div class="p-4">
            <p class="text-sm font-semibold">ID: {item.card_id}</p>
            <p class="text-xs text-gray-500">Added on: {new Date(item.created_at).toLocaleDateString()}</p>
            <!-- TODO: Display card image and details once fetched -->
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div> 