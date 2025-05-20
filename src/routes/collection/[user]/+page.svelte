<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { page } from '$app/state'; // Keep page store if needed for URL params, etc.
	import { Home, UserX, ShieldAlert, Search } from 'lucide-svelte'; // Keep icon import
	import PageTitle from '@components/PageTitle.svelte'; // Import PageTitle
	import { fade, fly } from 'svelte/transition'; // Import transitions
	import { onMount } from 'svelte'; // Import onMount for ready state

	export let data: PageData;

	// --- Ready state for transitions ---
	let ready = false;
	onMount(() => {
		ready = true;
	});

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
	<!-- Use server-provided description only, title is managed by Seo -->
	<meta name="description" content={description} />
</svelte:head>

{#if ready} <!-- Wrap content in ready check for transitions -->
<div class="flex flex-col flex-grow py-8 min-h-[calc(100svh-200px)]">
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
				<PageTitle title={profileNotFound ? 'User Not Found' : 'Collection is Private'} />
			</div>

			<p class="max-w-md text-lg text-gray-300" in:fly={{ y: 20, duration: 400, delay: 400 }}>
				{#if profileNotFound}
					The user <strong class="text-gold-300">"{targetUsername}"</strong> could not be found. They may have changed their username or the account no longer exists.
				{:else if profileIsPrivate}
					The collection for <strong class="text-gold-300">"{targetUsername}"</strong> is set to private. You cannot view their cards at this time.
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
{/if} <!-- End of ready check -->
