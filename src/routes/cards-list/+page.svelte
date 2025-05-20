<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { filterSet, filterArtist, filterSupertype, filterName, filterType, sortBy, sortOrder, mostExpensiveOnly, filterRarity, resetFilters } from '$lib/helpers/filters';
	import { page } from '$app/state';
	import Loader from "$lib/components/Loader.svelte";
	import GlobeIcon from 'lucide-svelte/icons/globe';
	import { get } from 'svelte/store';

	export let data: PageData;

	// Use allCards from layout data passed down via PageData
	// $: allCards = data.allCards; // No longer needed here, will come from data.streamed.allCards
	$: sets = data.sets;
	$: rarities = data.rarities;
	$: types = data.types;
	$: artists = data.artists;
	$: pokemons = data.pokemons;
	// $: prices = data.prices; // No longer needed here, will come from data.streamed.prices

	onMount(() => {
		// Check if we have any filter parameters in the URL
		const setParam = page.url.searchParams.get('set');
		const artistParam = page.url.searchParams.get('artist');
		const typeParam = page.url.searchParams.get('type');
		const nameParam = page.url.searchParams.get('name');
		const pokemonTypeParam = page.url.searchParams.get('pokemontype');
		const sortByParam = page.url.searchParams.get('sortby');
		const sortOrderParam = page.url.searchParams.get('sortorder');
		const mostExpensiveParam = page.url.searchParams.get('mostexpensive');
		const rarityParam = page.url.searchParams.get('rarity');

		// If we have any filter parameters, reset all filters first
		if (setParam || artistParam || typeParam || nameParam || pokemonTypeParam || sortByParam || sortOrderParam || mostExpensiveParam || rarityParam) {
			resetFilters();

			// Then apply the specific filter from the URL
			if (setParam) {
				const decodedSetParam = decodeURIComponent(setParam).toLowerCase();
				const foundSet = sets.find(set => set.name.toLowerCase() === decodedSetParam);
				if (foundSet) {
					filterSet.set(foundSet.name.toLowerCase());
				}
			}

			if (artistParam) {
				const decodedArtistParam = decodeURIComponent(artistParam).toLowerCase();
				const foundArtist = artists.find(artist => artist.toLowerCase() === decodedArtistParam);
				if (foundArtist) {
					filterArtist.set(foundArtist.toLowerCase());
				}
			}
			
			if (typeParam) {
				// Convert the type parameter to match the expected supertype values
				// Map "pokemon" to "Pokémon", "trainer" to "Trainer", etc.
				const typeMap: Record<string, string> = {
					'pokemon': 'Pokémon',
					'trainer': 'Trainer',
					'energy': 'Energy'
				};
				
				const supertypeValue = typeMap[typeParam.toLowerCase()];
				if (supertypeValue) {
					filterSupertype.set(supertypeValue.toLowerCase());
				}
			}

			if (nameParam) {
				const decodedNameParam = decodeURIComponent(nameParam);
				filterName.set(decodedNameParam);
			}
			
			if (pokemonTypeParam) {
				const decodedPokemonTypeParam = decodeURIComponent(pokemonTypeParam);
				const typeExists = types.some(type => type.toLowerCase() === decodedPokemonTypeParam.toLowerCase());
				if (typeExists) {
					filterType.set(decodedPokemonTypeParam.toLowerCase());
				}
			}
			
			// Apply sort settings from URL
			if (sortByParam) {
				// Validate that the sort param matches one of our expected values
				const validSortValues = [
					'sort-pokedex', 'sort-price', 'sort-name', 'sort-id', 
					'sort-rarity', 'sort-release-date', 'sort-artist'
				];
				
				if (validSortValues.includes(sortByParam)) {
					sortBy.set(sortByParam);
				}
			}
			
			if (sortOrderParam) {
				// Validate sort order is either 'asc' or 'desc'
				if (sortOrderParam === 'asc' || sortOrderParam === 'desc') {
					sortOrder.set(sortOrderParam);
				}
			}
			
			// Apply most expensive filter from URL
			if (mostExpensiveParam === 'true') {
				mostExpensiveOnly.set(true);
			}
			
			// Apply rarity filter from URL
			if (rarityParam) {
				const decodedRarityParam = decodeURIComponent(rarityParam);
				const rarityExists = rarities.some(rarity => rarity.toLowerCase() === decodedRarityParam.toLowerCase());
				if (rarityExists) {
					filterRarity.set(decodedRarityParam.toLowerCase());
				}
			}
		}
	});

	$: selectedSetName = $filterSet !== 'all' && sets ? (sets.find(set => set.name.toLowerCase() === $filterSet)?.name ?? null) : null;
	$: selectedArtistName = $filterArtist !== 'all' && artists ? (artists.find(artist => artist.toLowerCase() === $filterArtist) ?? null) : null;
</script>

<main class="max-lg:px-0 text-white text-lg flex flex-col flex-1 lg:-mt-8">
	{#await data.streamed.allCards}
		<!-- todo: remove these messages when we have a proper loading state -->
		<!-- Pending for allCards (outer) -->
		<div class="flex justify-center items-center h-64">
			<Loader message="Loading cards..." />
		</div>
	{:then allCardsResolved}
		<!-- allCards resolved, now handle prices -->
		{#await data.streamed.prices}
			<!-- Pending for prices (while allCards is resolved) -->
			<div class="flex justify-center items-center h-64">
				<Loader message="Loading prices..." />
			</div>
		{:then pricesResolved}
			<!-- Both allCards and prices are resolved -->
			<CardGrid 
				cards={allCardsResolved} 
				sets={data.sets}
				rarities={data.rarities}
				types={data.types}
				artists={data.artists}
				pokemons={data.pokemons}
				prices={pricesResolved}
				pageTitle="Cards List" 
				selectedSetName={selectedSetName} 
				selectedArtistName={selectedArtistName} 
			/>
		{:catch priceError}
			<p class="text-red-500 p-4">Error loading card prices: {priceError.message}</p>
		{/await} <!-- Closes inner await for prices -->
	{:catch cardError}
		<!-- Error for allCards (outer) -->
		<p class="text-red-500 p-4">Error loading cards: {cardError.message}</p>
	{/await} <!-- Closes outer await for allCards -->

</main>

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
</style> 