<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth';
  import { getUserWishlist } from '$lib/services/wishlists';
  import { wishlistStore, loadWishlist } from '$lib/stores/wishlist';
  import { goto } from '$app/navigation';
  import PageTitle from '$lib/components/PageTitle.svelte';
  import CardGrid from '$lib/components/list/CardGrid.svelte';
  import type { PageData } from './$types';
  import type { FullCard, Pokemon, Set, UserProfile, PriceData } from '$lib/types';
  import { resetFilters } from '$lib/helpers/filters';

  export let data: PageData;

  // --- State Variables ---
  let isLoading = false; // Modifié à false pour ne pas afficher le loader
  let displayCards: FullCard[] = [];
  let pageTitleDisplay = data.title; // Start with title from server
  let statusMessage: string | null = null; // For errors like private/not found
  let loggedInUser: UserProfile | null = null;
  let isOwnProfile = false;

  // --- Reactive Data from Server ---
  $: allCards = data.allCards || [];
  $: pokemons = data.pokemons || [];
  $: sets = data.sets || [];
  $: rarities = data.rarities || [];
  $: types = data.types || [];
  $: prices = data.prices || {};
  $: artists = data.artists || [];
  $: targetProfile = data.targetProfile;
  $: isPublic = data.isPublic;
  $: serverWishlistCards = data.serverWishlistCards;
  $: targetUsername = data.targetUsername;

  onMount(() => {
    const unsubscribe = authStore.subscribe(async (state) => {
      if (!state.loading) {
        loggedInUser = state.profile;

        if (targetUsername) {
          // --- Case 1: Viewing a specific user (?user=...) ---
          isOwnProfile = loggedInUser?.username === targetUsername;

          if (!targetProfile) {
            statusMessage = `User "${targetUsername}" not found.`;
            pageTitleDisplay = 'User Not Found';
            displayCards = [];
          } else if (!isPublic && !isOwnProfile) {
            statusMessage = `Profile for "${targetUsername}" is private.`;
            pageTitleDisplay = 'Private Wishlist';
            displayCards = [];
          } else {
            // Profile is public or own profile
            displayCards = serverWishlistCards || []; // Use cards from server
            pageTitleDisplay = isOwnProfile ? 'My Wishlist' : `${targetUsername}'s Wishlist`;
            if (displayCards.length === 0) {
              statusMessage = isOwnProfile ? 'Your wishlist is empty.' : `"${targetUsername}" wishlist is empty.`;
            }
          }
        } else {
          // --- Case 2: Viewing own wishlist (no ?user=...) ---
          isOwnProfile = true;
          pageTitleDisplay = 'My Wishlist';
          if (loggedInUser) {
            // Pour l'utilisateur connecté, utiliser le store si possible
            if ($wishlistStore.size > 0) {
              // Si le store a déjà des données, les utiliser
              const wishlistCardCodes = $wishlistStore;
              displayCards = allCards.filter(card => wishlistCardCodes.has(card.cardCode));
              if (displayCards.length === 0) {
                statusMessage = 'Your wishlist is empty.';
              }
            } else {
              // Sinon, charger la wishlist (ce qui mettra aussi à jour le store)
              await loadWishlist();
              // Après chargement, filtrer les cartes avec le store mis à jour
              const wishlistCardCodes = $wishlistStore;
              displayCards = allCards.filter(card => wishlistCardCodes.has(card.cardCode));
              if (displayCards.length === 0) {
                statusMessage = 'Your wishlist is empty.';
              }
            }
          } else {
            // Not logged in and no target user -> redirect
            goto('/');
            return; // Prevent further processing
          }
        }
      }
    });

    return unsubscribe;
  });
</script>

<div class="px-10 flex flex-col flex-grow">
  {#if statusMessage}
    <div class="text-center p-8 flex flex-col items-center justify-center flex-grow">
      <p
        class="font-bold mb-4 {statusMessage.includes('not found') ? 'text-4xl' : 'text-3xl'}"
      >
        {statusMessage}
      </p>
      {#if statusMessage === 'Your wishlist is empty.'}
        <p class="mt-2 mb-4">Add cards to your wishlist by browsing card pages.</p>
      {/if}
      <a
        href="/"
        class="home-button animated-hover-button relative overflow-hidden bg-transparent border-2 border-white text-white text-sm font-medium py-1.5 px-4 rounded flex items-center transition-all duration-300 h-8 mt-4"
      >
        <span class="relative z-10 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Return to Home
        </span>
      </a>
    </div>
  {:else}
    <CardGrid
      cards={displayCards}
      {pokemons}
      {sets}
      {rarities}
      {types}
      {prices}
      {artists}
      pageTitle={pageTitleDisplay}
      disableLoader={true}
    />
  {/if}
</div>
