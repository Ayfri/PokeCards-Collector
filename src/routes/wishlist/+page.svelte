<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth';
  import { getUserWishlist } from '$lib/services/wishlists';
  import { goto } from '$app/navigation';
  import PageTitle from '$lib/components/PageTitle.svelte';
  import CardGrid from '$lib/components/list/CardGrid.svelte';
  import type { PageData } from './$types';
  import type { FullCard, Pokemon, Set } from '$lib/types';
  
  export let data: PageData;
  
  let isLoading = true;
  let wishlistCards: FullCard[] = [];
  
  // Reactive variables for data from server
  $: allCards = data.allCards || [];
  $: pokemons = data.pokemons || [];
  $: sets = data.sets || [];
  $: rarities = data.rarities || [];
  $: types = data.types || [];
  
  onMount(() => {
    const unsubscribe = authStore.subscribe(async (state) => {
      if (!state.loading) {
        isLoading = true;
        if (state.profile) {
          const { data: wishlistItems, error } = await getUserWishlist(state.profile.username);
          if (error) {
            console.error('Error loading wishlist:', error);
            wishlistCards = [];
          } else {
            const wishlistCardCodes = new Set(wishlistItems?.map(item => item.card_code) || []);
            wishlistCards = allCards.filter(card => wishlistCardCodes.has(card.cardCode));
          }
        } else {
          goto('/');
        }
        isLoading = false;
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
  {:else if wishlistCards.length === 0}
    <div class="text-center p-8">
      <p class="text-lg">Your wishlist is empty.</p>
      <p class="mt-2">Add cards to your wishlist by browsing card pages.</p>
    </div>
  {:else}
    <!-- Display filtered cards using CardGrid -->
    <CardGrid cards={wishlistCards} {pokemons} {sets} {rarities} {types} />
  {/if}
</div> 