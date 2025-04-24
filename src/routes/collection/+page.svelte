<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { getUserCollection } from '$lib/services/collections';
	import { collectionStore, loadCollection } from '$lib/stores/collection';
	import { goto } from '$app/navigation';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import type { FullCard, Pokemon, Set, UserProfile, PriceData } from '$lib/types';
	import { page } from '$app/stores';

	export let data: PageData;

	// --- State Variables ---
	let isLoading = false;
	let displayCards: FullCard[] = [];
	let pageTitleDisplay = data.title; // Start with title from server
	let statusMessage: string | null = null;
	let loggedInUser: UserProfile | null = null;
	let isOwnProfile = false;
	let pokemonCount = 0;
	let profileNotFound = false;
	let profileIsPrivate = false;
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
	$: serverCollectionCards = data.serverCollectionCards;
	$: targetUsername = data.targetUsername;

	$: if (displayCards.length > 0) {
		// Calculate the number of unique Pokémon in the collection
		const uniquePokemonIds = new Set<number>();
		displayCards.forEach(card => {
			if (card.pokemonNumber) {
				uniquePokemonIds.add(card.pokemonNumber);
			}
		});
		pokemonCount = uniquePokemonIds.size;
	} else {
		pokemonCount = 0;
	}

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
		
		// Reset state variables before loading new data
		displayCards = [];
		statusMessage = null;
		profileNotFound = false;
		profileIsPrivate = false;
		
		// Get the updated user parameter from the URL
		const urlParams = new URLSearchParams($page.url.search);
		const urlUsername = urlParams.get('user');
		
		// Process based on the new URL parameters
		if (urlUsername) {
			// Viewing specific user's collection
			if (data.targetUsername !== urlUsername) {
				// URL changed but page didn't reload, manually reload page
				await goto(`/collection?user=${encodeURIComponent(urlUsername)}`, { invalidateAll: true });
				return;
			}
			
			isOwnProfile = loggedInUser?.username === urlUsername;
			
			if (!targetProfile) {
				statusMessage = `User "${urlUsername}" not found.`;
				pageTitleDisplay = 'User Not Found';
				profileNotFound = true;
			} else if (!isPublic && !isOwnProfile) {
				statusMessage = `Collection for "${urlUsername}" is private.`;
				pageTitleDisplay = 'Private Collection';
				profileIsPrivate = true;
			} else {
				// Profile is public or own profile
				displayCards = serverCollectionCards || [];
				pageTitleDisplay = isOwnProfile 
					? 'My Collection'
					: `${urlUsername}'s Collection`;
				if (displayCards.length === 0) {
					statusMessage = isOwnProfile ? 'Your collection is empty.' : `"${urlUsername}" collection is empty.`;
				}
			}
		} else {
			// Viewing own collection
			isOwnProfile = true;
			pageTitleDisplay = 'My Collection';
			
			if (loggedInUser) {
				// Force reload the collection store
				await loadCollection(true);
				const collectionCardCodes = $collectionStore;
				displayCards = allCards.filter(card => collectionCardCodes.has(card.cardCode));
				if (displayCards.length === 0) {
					statusMessage = 'Your collection is empty.';
				}
			} else {
				goto('/');
				return;
			}
		}
	}

	onMount(() => {
		const unsubscribe = authStore.subscribe(async (state) => {
			if (!state.loading) {
				loggedInUser = state.profile;
				await loadDataBasedOnUrl();
			}
		});

		return unsubscribe;
	});
</script>

<div class="px-10 flex flex-col flex-grow">
	{#if profileNotFound || profileIsPrivate}
		<div class="text-center p-8 flex flex-col items-center justify-center flex-grow">
			<p class="font-bold mb-4 {statusMessage?.includes('not found') ? 'text-4xl' : 'text-3xl'}">
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
		<!-- Always display CardGrid even if collection is empty -->
		<CardGrid 
			cards={displayCards} 
			pokemons={pokemons} 
			sets={sets}
			rarities={rarities}
			types={types}
			prices={prices}
			artists={artists}
			pageTitle={pageTitleDisplay}
			disableLoader={true}
		/>
		
		{#if statusMessage && !profileNotFound && !profileIsPrivate}
			<div class="text-center p-8 mt-8">
				<p class="text-lg">{statusMessage}</p>
				{#if statusMessage === 'Your collection is empty.'}
					<p class="mt-2">Add cards to your collection by browsing card pages.</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>
