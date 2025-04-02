<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth';
  import { getUserCollection, getCollectionStats } from '$lib/services/collections';
  import { goto } from '$app/navigation';
  import PageTitle from '$lib/components/PageTitle.svelte';
  import type { UserCollection, Card, CollectionStats } from '$lib/types';
  
  let isLoading = true;
  let collection: UserCollection[] = [];
  let stats: CollectionStats | null = null;
  let cards: Card[] = [];
  
  async function loadCollection() {
    if (!$authStore.user || !$authStore.profile) {
      return;
    }
    
    isLoading = true;
    
    try {
      // Get collection
      const { data: collectionData, error: collectionError } = await getUserCollection($authStore.profile.username);
      
      if (collectionError) {
        console.error('Error loading collection:', collectionError);
        return;
      }
      
      collection = collectionData || [];
      
      // Get stats
      const { data: statsData } = await getCollectionStats($authStore.profile.username);
      stats = statsData;
      
      // TODO: Fetch card details using card_ids from collection
      // This would depend on your API for fetching cards
      
    } catch (error) {
      console.error('Error in loadCollection:', error);
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
        loadCollection();
      }
    });
    
    return unsubscribe;
  });
</script>

<div class="w-full mx-auto pb-4 lg:pb-5">
  <div class="flex justify-between mx-28 max-lg:mx-4 items-center">
    <PageTitle title="My Collection" />
  </div>
</div>

<div class="container mx-auto px-4 py-8">
  {#if isLoading}
    <div class="flex justify-center items-center p-8">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
    </div>
  {:else if !$authStore.user}
    <div class="text-center p-8">
      <p class="text-lg">Please sign in to view your collection.</p>
    </div>
  {:else if collection.length === 0}
    <div class="text-center p-8">
      <p class="text-lg">Your collection is empty.</p>
      <p class="mt-2">Add cards to your collection by browsing card pages.</p>
    </div>
  {:else}
    <!-- Stats section -->
    {#if stats}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">Statistics</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
            <p class="text-sm text-gray-500 dark:text-gray-400">Total cards</p>
            <p class="text-2xl font-bold">{stats.total_cards}</p>
          </div>
          <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
            <p class="text-sm text-gray-500 dark:text-gray-400">Estimated value</p>
            <p class="text-2xl font-bold">{stats.total_value}€</p>
          </div>
          <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
            <p class="text-sm text-gray-500 dark:text-gray-400">Unique cards</p>
            <p class="text-2xl font-bold">{collection.length}</p>
          </div>
        </div>
      </div>
    {/if}
    
    <!-- Collection cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {#each collection as item}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div class="p-4">
            <p class="text-sm font-semibold">ID: {item.card_id}</p>
            <p class="text-xs text-gray-500">Quantity: {item.quantity}</p>
            <!-- TODO: Display card image and details once fetched -->
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div> 