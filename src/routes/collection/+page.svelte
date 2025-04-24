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
		// Calcul du nombre de Pokémon uniques dans la collection
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
						profileNotFound = true;
					} else if (!isPublic && !isOwnProfile) {
						statusMessage = `Collection for "${targetUsername}" is private.`;
						pageTitleDisplay = 'Private Collection';
						displayCards = [];
						profileIsPrivate = true;
					} else {
						// Profile is public or own profile
						displayCards = serverCollectionCards || []; // Use cards from server
						pageTitleDisplay = isOwnProfile 
							? `My Collection`
							: `${targetUsername}'s Collection`;
						if (displayCards.length === 0) {
							statusMessage = isOwnProfile ? 'Your collection is empty.' : `"${targetUsername}" collection is empty.`;
						}
					}
				} else {
					// --- Case 2: Viewing own collection (no ?user=...) ---
					isOwnProfile = true;
					
					if (loggedInUser) {
						// Pour l'utilisateur connecté, utiliser le store si possible
						if ($collectionStore.size > 0) {
							// Si le store a déjà des données, les utiliser
							const collectionCardCodes = $collectionStore;
							displayCards = allCards.filter(card => collectionCardCodes.has(card.cardCode));
							if (displayCards.length === 0) {
								statusMessage = 'Your collection is empty.';
							}
						} else {
							// Sinon, charger la collection (ce qui mettra aussi à jour le store)
							await loadCollection();
							// Après chargement, filtrer les cartes avec le store mis à jour
							const collectionCardCodes = $collectionStore;
							displayCards = allCards.filter(card => collectionCardCodes.has(card.cardCode));
							if (displayCards.length === 0) {
								statusMessage = 'Your collection is empty.';
							}
						}
						pageTitleDisplay = 'My Collection';
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
		<!-- Toujours afficher CardGrid même si la collection est vide -->
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
