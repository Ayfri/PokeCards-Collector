<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { Home, UserX, ShieldAlert, Search } from 'lucide-svelte';
	import PageTitle from '@components/PageTitle.svelte';
	import { fade, fly } from 'svelte/transition';
	import BouncyLoader from '$lib/components/BouncyLoader.svelte';

	export let data: PageData;

	// --- Use Server Data Directly (for non-streamed parts) ---
	$: targetProfile = data.targetProfile;
	$: isPublic = data.isPublic;
	$: targetUsername = data.targetUsername;
	$: description = data.description;
	$: loggedInUsername = page.data.profile?.username;
	$: isOwnWishlist = !targetUsername || (loggedInUsername === targetUsername);
	$: profileNotFound = !targetProfile && !!targetUsername && !data.streamed?.wishlistData;
	$: profileIsPrivate = !!targetProfile && !isPublic && !isOwnWishlist && !data.streamed?.wishlistData;

	// pageTitleDisplay will be reactive to targetProfile and isOwnWishlist, considering data.title as fallback
	$: pageTitleDisplay = (() => {
		if (profileNotFound) return 'User Not Found';
		if (profileIsPrivate) return 'Wishlist is Private';
		if (targetProfile) {
			return isOwnWishlist ? 'My Wishlist' : `${targetProfile.username}'s Wishlist`;
		}
		return data.title || 'Wishlist'; // Fallback to server title or generic
	})();

</script>

<svelte:head>
	<meta name="description" content={description} />
</svelte:head>

{#if profileNotFound || profileIsPrivate}
	<main 
		class="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-5"
		in:fade={{ duration: 300, delay: 100 }}
	>
		<div in:fly={{ y: 20, duration: 400, delay: 200 }} class="mb-4">
			{#if profileNotFound}
				<UserX size={64} class="mx-auto text-gold-400" />
			{:else if profileIsPrivate}
				<ShieldAlert size={64} class="mx-auto text-gold-400" />
			{/if}
		</div>

		<div in:fly={{ y: 20, duration: 400, delay: 300 }}>
			<PageTitle title={pageTitleDisplay} />
		</div>

		<p class="max-w-md text-lg text-gray-300" in:fly={{ y: 20, duration: 400, delay: 400 }}>
			{#if profileNotFound}
				The user <strong class="text-gold-300">"{targetUsername || 'Unknown'}"</strong> could not be found. Their wishlist cannot be displayed.
			{:else if profileIsPrivate}
				The wishlist for <strong class="text-gold-300">"{targetUsername}"</strong> is set to private. You cannot view their wishlist at this time.
			{/if}
		</p>
		
		<div class="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4" in:fly={{ y: 20, duration: 400, delay: 500 }}>
			<a
				href="/"
				class="animated-hover-button relative inline-flex items-center gap-2 overflow-hidden rounded border-2 border-gold-400 px-6 py-2.5 text-sm font-medium text-gold-400 transition-all duration-300 hover:bg-gold-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-gray-900"
			>
				<Home size={18} />
				Return to Home
			</a>
			<a
				href="/users"
				class="animated-hover-button relative inline-flex items-center gap-2 overflow-hidden rounded border-2 border-gold-400 px-6 py-2.5 text-sm font-medium text-gold-400 transition-all duration-300 hover:bg-gold-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-gray-900"
			>
				<Search size={18} />
				Search Users
			</a>
		</div>
	</main>
{:else}
  {#await data.streamed.wishlistData}
    <div class="flex flex-col flex-grow py-8 min-h-[calc(100svh-200px)] items-center justify-center text-center">
        <BouncyLoader size={40} />
        <p class="text-white text-xl mt-3">Loading wishlist...</p>
    </div>
  {:then resolvedWishlistData}
    {@const displayCards = resolvedWishlistData.serverWishlistCards || []}
    {@const pokemons = resolvedWishlistData.pokemons || []}
    {@const sets = resolvedWishlistData.sets || []}
    {@const rarities = resolvedWishlistData.rarities || []}
    {@const types = resolvedWishlistData.types || []}
    {@const artists = resolvedWishlistData.artists || []}
    
    <!-- Prices are top-level from data, not from resolvedWishlistData -->
    {@const prices = data.prices || {}}

    {@const statusMessage = (() => {
      if (displayCards.length === 0 && targetProfile) return isOwnWishlist ? 'Your wishlist is empty.' : `"${targetUsername}" wishlist is empty.`;
      if (displayCards.length === 0 && !targetUsername && !loggedInUsername) return 'Sign in to view your wishlist.';
      return null;
    })()}

    <div class="flex flex-col flex-grow py-8 min-h-[calc(100svh-200px)]">
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
      
      {#if statusMessage}
        <div class="text-center p-8 mt-8">
          <p class="text-lg text-gray-400">{statusMessage}</p>
          {#if statusMessage === 'Your wishlist is empty.'}
            <p class="mt-2 text-gray-500">Add cards to your wishlist by browsing card pages.</p>
          {/if}
        </div>
      {/if}
    </div>
  {:catch error}
    <div class="flex flex-col flex-grow py-8 min-h-[calc(100svh-200px)] items-center justify-center text-center p-6 space-y-5">
        <ShieldAlert size={64} class="mx-auto text-red-500" />
        <PageTitle title="Error Loading Wishlist" />
        <p class="max-w-md text-lg text-gray-300">There was an error loading the wishlist data: {error.message}</p>
        <a
            href="/"
            class="animated-hover-button relative inline-flex items-center gap-2 overflow-hidden rounded border-2 border-gold-400 px-6 py-2.5 text-sm font-medium text-gold-400 transition-all duration-300 hover:bg-gold-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
            <Home size={18} />
            Return to Home
        </a>
    </div>
  {/await}
{/if}
