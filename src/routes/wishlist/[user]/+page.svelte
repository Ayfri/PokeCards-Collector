<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { Home } from 'lucide-svelte';

	export let data: PageData;

	// --- Use Server Data Directly --- 
	$: pokemons = data.pokemons || [];
	$: sets = data.sets || [];
	$: rarities = data.rarities || [];
	$: types = data.types || [];
	$: prices = data.prices || {};
	$: artists = data.artists || [];
	
	$: targetProfile = data.targetProfile;
	$: isPublic = data.isPublic;
	$: displayCards = data.serverWishlistCards || []; // Use server data
	$: targetUsername = data.targetUsername;
	$: description = data.description;
	$: loggedInUsername = page.data.profile?.username; // Get logged-in user from layout
	$: isOwnWishlist = !targetUsername || (loggedInUsername === targetUsername);
	$: profileNotFound = !targetProfile && !!targetUsername;
	$: profileIsPrivate = !!targetProfile && !isPublic && !isOwnWishlist;

	// Determine the title to display based on ownership
	$: pageTitleDisplay = isOwnWishlist ? 'My Wishlist' : data.title;

	$: statusMessage = (() => {
		if (profileNotFound) return `User "${targetUsername}" not found.`;
		if (profileIsPrivate) return `Wishlist for "${targetUsername}" is private.`;
		if (displayCards.length === 0 && targetProfile) return isOwnWishlist ? 'Your wishlist is empty.' : `"${targetUsername}" wishlist is empty.`;
		if (displayCards.length === 0 && !targetUsername && !loggedInUsername) return 'Sign in to view your wishlist.';
		return null;
	})();

	// Removed: loadDataBasedOnUrl, modifyWishlistLinks, afterUpdate, onMount
</script>

<svelte:head>
	<!-- Use server-provided description only, title is managed by Seo -->
	<meta name="description" content={description} />
</svelte:head>

<div class="flex flex-col flex-grow">
	{#if profileNotFound || profileIsPrivate}
		<div class="text-center p-8 flex flex-col items-center justify-center flex-grow">
			<p
				class="font-bold mb-4 {profileNotFound ? 'text-4xl' : 'text-3xl'} text-gold-400"
			>
				{statusMessage}
			</p>
			<a
				href="/"
				class="home-button animated-hover-button relative overflow-hidden bg-transparent border-2 border-gold-400 text-gold-400 text-sm font-medium py-1.5 px-4 rounded flex items-center transition-all duration-300 h-8 mt-4 hover:bg-gold-400 hover:text-black"
			>
				<span class="relative z-10 flex items-center gap-2">
					<Home size={16} />
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
		
		<!-- Display status message if wishlist is empty or user needs to sign in -->
		{#if statusMessage && !profileNotFound && !profileIsPrivate}
			<div class="text-center p-8 mt-8">
				<p class="text-lg text-gray-400">{statusMessage}</p>
				{#if statusMessage === 'Your wishlist is empty.'}
					<p class="mt-2 text-gray-500">Add cards to your wishlist by browsing card pages.</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>
