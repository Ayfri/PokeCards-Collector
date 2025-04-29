<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { authStore } from '$lib/stores/auth';
  import { getUserWishlist } from '$lib/services/wishlists';
  import { wishlistStore, loadWishlist } from '$lib/stores/wishlist';
  import { goto } from '$app/navigation';
  import PageTitle from '$lib/components/PageTitle.svelte';
  import CardGrid from '$lib/components/list/CardGrid.svelte';
  import type { PageData } from './$types';
  import type { FullCard, Pokemon, Set, UserProfile, PriceData } from '$lib/types';
  import { resetFilters } from '$lib/helpers/filters';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';

  export let data: PageData;

  // --- State Variables ---
  let isLoading = false;
  let displayCards: FullCard[] = [];
  let pageTitleDisplay = data.title; // Start with title from server
  let statusMessage: string | null = null; // For errors like private/not found
  let loggedInUser: UserProfile | null = null;
  let isOwnProfile = false;
  let currentUrl = '';
  let previousUrl = '';

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
  
  // React to changes in the URL
  $: currentUrl = $page.url.toString();
  $: if (currentUrl !== previousUrl) {
    previousUrl = currentUrl;
    if (loggedInUser) {
      loadDataBasedOnUrl();
    }
  }

  async function loadDataBasedOnUrl() {
    if (!loggedInUser) return;
    
    // Get the updated user parameter from the URL
    const urlParams = new URLSearchParams($page.url.search);
    const urlUsername = urlParams.get('user');
    
    // Reset state variables before loading new data
    displayCards = [];
    statusMessage = null;
    
    // Process based on the new URL parameters
    if (urlUsername) {
      // Viewing specific user's wishlist
      if (data.targetUsername !== urlUsername) {
        // URL changed but page didn't reload, manually reload page
        await goto(`/wishlist?user=${encodeURIComponent(urlUsername)}`, { invalidateAll: true });
        return;
      }
      
      isOwnProfile = loggedInUser?.username === urlUsername;
      
      if (!targetProfile) {
        statusMessage = `User "${urlUsername}" not found.`;
        pageTitleDisplay = 'User Not Found';
      } else if (!isPublic && !isOwnProfile) {
        statusMessage = `Profile for "${urlUsername}" is private.`;
        pageTitleDisplay = 'Private Wishlist';
      } else {
        // Profile is public or own profile
        displayCards = serverWishlistCards || [];
        pageTitleDisplay = isOwnProfile ? 'My Wishlist' : `${urlUsername}'s Wishlist`;
        if (displayCards.length === 0) {
          statusMessage = isOwnProfile ? 'Your wishlist is empty.' : `"${urlUsername}" wishlist is empty.`;
        }
      }
    } else {
      // Viewing own wishlist
      isOwnProfile = true;
      pageTitleDisplay = 'My Wishlist';
      
      if (loggedInUser) {
        // Force reload the wishlist store
        await loadWishlist(true);
        const wishlistCardCodes = $wishlistStore;
        displayCards = allCards.filter(card => wishlistCardCodes.has(card.cardCode));
        if (displayCards.length === 0) {
          statusMessage = 'Your wishlist is empty.';
        }
      } else {
        goto('/');
        return;
      }
    }
  }

  // Add link modifiers to force page reload
  function modifyWishlistLinks() {
    if (!browser) return;
    
    // Modify all wishlist links to force a page reload
    document.querySelectorAll('a[href^="/wishlist"]').forEach(link => {
      link.setAttribute('target', '_self');
    });
  }

  afterUpdate(() => {
    modifyWishlistLinks();
  });

  onMount(() => {
    const unsubscribe = authStore.subscribe(async (state) => {
      if (!state.loading) {
        loggedInUser = state.profile;
        await loadDataBasedOnUrl();
      }
    });

    modifyWishlistLinks();

    return unsubscribe;
  });
</script>

<svelte:head>
  {#if browser}
    <script>
      // Script executed on the client side
      document.addEventListener('DOMContentLoaded', function() {
        // Get the requested username from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlUsername = urlParams.get('user');
        
        // Force reload if we detect any inconsistency
        if (urlUsername && document.querySelector('h1')?.textContent?.indexOf(urlUsername) === -1) {
          window.location.reload();
        }
      });
    </script>
  {/if}
</svelte:head>

<div class="flex flex-col flex-grow">
  {#if statusMessage && (statusMessage.includes('not found') || statusMessage.includes('private'))}
    <div class="text-center p-8 flex flex-col items-center justify-center flex-grow">
      <p
        class="font-bold mb-4 {statusMessage.includes('not found') ? 'text-4xl' : 'text-3xl'}"
      >
        {statusMessage}
      </p>
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
    
    {#if statusMessage && statusMessage === 'Your wishlist is empty.'}
      <div class="text-center p-8 mt-8">
        <p class="text-lg">{statusMessage}</p>
        <p class="mt-2 mb-4">Add cards to your wishlist by browsing card pages.</p>
      </div>
    {/if}
  {/if}
</div>
