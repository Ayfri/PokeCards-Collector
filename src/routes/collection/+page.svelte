<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { page } from '$app/state'; // Keep page store if needed for URL params, etc.
	import { Home } from 'lucide-svelte'; // Keep icon import

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
	$: displayCards = data.serverCollectionCards || []; // Use server data directly
	$: targetUsername = data.targetUsername;
	$: pageTitleDisplay = data.title; // Use server title
	$: description = data.description; // Use server description
	$: loggedInUsername = page.data.profile?.username; // Get logged-in user from layout data via page store
	$: isOwnCollection = !targetUsername || (loggedInUsername === targetUsername);
	$: profileNotFound = !targetProfile && !!targetUsername; // If targetUsername exists but targetProfile doesn't
	$: profileIsPrivate = !!targetProfile && !isPublic && !isOwnCollection; // If profile exists, not public, and not own

	// --- Derived State --- 
	$: if (displayCards.length > 0) {
		const uniquePokemonIds = new Set<number>();
		displayCards.forEach(card => {
			if (card.pokemonNumber) {
				uniquePokemonIds.add(card.pokemonNumber);
			}
		});
	}
	
	$: statusMessage = (() => {
		if (profileNotFound) return `User "${targetUsername}" not found.`;
		if (profileIsPrivate) return `Collection for "${targetUsername}" is private.`;
		if (displayCards.length === 0 && targetProfile) return isOwnCollection ? 'Your collection is empty.' : `"${targetUsername}" collection is empty.`;
		if (displayCards.length === 0 && !targetUsername && !loggedInUsername) return 'Sign in to view your collection.'; // Case for /collection when logged out
		return null;
	})();

	// Removed: loadDataBasedOnUrl, modifyCollectionLinks, afterUpdate, onMount
</script>

<svelte:head>
	<!-- Use server-provided title/description -->
	<title>{pageTitleDisplay}</title>
	<meta name="description" content={description} />
	<!-- Removed client-side reload script -->
</svelte:head>

<div class="flex flex-col flex-grow">
	{#if profileNotFound || profileIsPrivate}
		<div class="text-center p-8 flex flex-col items-center justify-center flex-grow">
			<p class="font-bold mb-4 {profileNotFound ? 'text-4xl' : 'text-3xl'} text-gold-400">
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
		<!-- Always display CardGrid, pass server data -->
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
		
		<!-- Display status message if collection is empty or user needs to sign in -->
		{#if statusMessage && !profileNotFound && !profileIsPrivate}
			<div class="text-center p-8 mt-8">
				<p class="text-lg text-gray-400">{statusMessage}</p>
				{#if statusMessage === 'Your collection is empty.'}
					<p class="mt-2 text-gray-500">Add cards to your collection by browsing card pages.</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>
