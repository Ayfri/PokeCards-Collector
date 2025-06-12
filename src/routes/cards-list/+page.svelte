<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { filterSet, filterArtist, filterSupertype, filterName, filterType, sortBy, sortOrder, mostExpensiveOnly, filterRarity, resetFilters } from '$lib/helpers/filters';
	import { page } from '$app/state';
	import Loader from "$lib/components/Loader.svelte";
	import { cardSize } from '$lib/stores/gridStore';

	export let data: PageData;

	// Use allCards from layout data passed down via PageData
	// $: allCards = data.allCards; // No longer needed here, will come from data.streamed.allCards
	$: sets = data.sets;
	$: rarities = data.rarities;
	$: types = data.types;
	$: artists = data.artists;

	// Determine lowRes based on cardSize
	$: lowRes = !($cardSize === 2 || $cardSize === 3); // true if not L or XL

	let selectedSetName: string | null;
	let selectedArtistName: string | null;

	onMount(() => {
		const mountStart = performance.now();
		console.log('🚀 CardsListPage: Starting mount');

		// Check if we have any filter parameters in the URL
		const urlParamStart = performance.now();
		const setParam = page.url.searchParams.get('set');
		const artistParam = page.url.searchParams.get('artist');
		const typeParam = page.url.searchParams.get('type');
		const nameParam = page.url.searchParams.get('name');
		const pokemonTypeParam = page.url.searchParams.get('pokemontype');
		const sortByParam = page.url.searchParams.get('sortby');
		const sortOrderParam = page.url.searchParams.get('sortorder');
		const mostExpensiveParam = page.url.searchParams.get('mostexpensive');
		const rarityParam = page.url.searchParams.get('rarity');

		console.log('🔗 CardsListPage: URL params extracted:', {
			set: setParam,
			artist: artistParam,
			type: typeParam,
			name: nameParam,
			pokemonType: pokemonTypeParam,
			sortBy: sortByParam,
			sortOrder: sortOrderParam,
			mostExpensive: mostExpensiveParam,
			rarity: rarityParam
		});

		// If we have any filter parameters, reset all filters first
		if (setParam || artistParam || typeParam || nameParam || pokemonTypeParam || sortByParam || sortOrderParam || mostExpensiveParam || rarityParam) {
			const filterProcessStart = performance.now();
			console.log('🔄 CardsListPage: Resetting filters before applying URL params');
			resetFilters();

			// Then apply the specific filter from the URL
			if (setParam) {
				const decodedSetParam = decodeURIComponent(setParam).toLowerCase();
				const foundSet = sets.find(set => set.name.toLowerCase() === decodedSetParam);
				if (foundSet) {
					filterSet.set(foundSet.name.toLowerCase());
					console.log(`🎯 CardsListPage: Applied set filter: ${foundSet.name}`);
				}
			}

			if (artistParam) {
				const decodedArtistParam = decodeURIComponent(artistParam).toLowerCase();
				const foundArtist = artists.find(artist => artist.toLowerCase() === decodedArtistParam);
				if (foundArtist) {
					filterArtist.set(foundArtist.toLowerCase());
					console.log(`🎨 CardsListPage: Applied artist filter: ${foundArtist}`);
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
					console.log(`🏷️ CardsListPage: Applied supertype filter: ${supertypeValue}`);
				}
			}

			if (nameParam) {
				const decodedNameParam = decodeURIComponent(nameParam);
				filterName.set(decodedNameParam);
				console.log(`📝 CardsListPage: Applied name filter: ${decodedNameParam}`);
			}

			if (pokemonTypeParam) {
				const decodedPokemonTypeParam = decodeURIComponent(pokemonTypeParam);
				const typeExists = types.some(type => type.toLowerCase() === decodedPokemonTypeParam.toLowerCase());
				if (typeExists) {
					filterType.set(decodedPokemonTypeParam.toLowerCase());
					console.log(`⚡ CardsListPage: Applied type filter: ${decodedPokemonTypeParam}`);
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
					console.log(`🔤 CardsListPage: Applied sort by: ${sortByParam}`);
				}
			}

			if (sortOrderParam) {
				// Validate sort order is either 'asc' or 'desc'
				if (sortOrderParam === 'asc' || sortOrderParam === 'desc') {
					sortOrder.set(sortOrderParam);
					console.log(`🔄 CardsListPage: Applied sort order: ${sortOrderParam}`);
				}
			}

			// Apply most expensive filter from URL
			if (mostExpensiveParam === 'true') {
				mostExpensiveOnly.set(true);
				console.log('💰 CardsListPage: Applied most expensive filter');
			}

			// Apply rarity filter from URL
			if (rarityParam) {
				const decodedRarityParam = decodeURIComponent(rarityParam);
				const rarityExists = rarities.some(rarity => rarity.toLowerCase() === decodedRarityParam.toLowerCase());
				if (rarityExists) {
					filterRarity.set(decodedRarityParam.toLowerCase());
					console.log(`💎 CardsListPage: Applied rarity filter: ${decodedRarityParam}`);
				}
			}

			console.log(`⚡ CardsListPage: All filters processed in ${performance.now() - filterProcessStart}ms`);
		}

		console.log(`✅ CardsListPage: Mount completed in ${performance.now() - mountStart}ms`);
	});

	$: {
		const reactiveStart = performance.now();
		selectedSetName = $filterSet !== 'all' && sets ? (sets.find(set => set.name.toLowerCase() === $filterSet)?.name ?? null) : null;
		selectedArtistName = $filterArtist !== 'all' && artists ? (artists.find(artist => artist.toLowerCase() === $filterArtist) ?? null) : null;
		console.log(`🔄 CardsListPage: Reactive selectedNames calculated in ${performance.now() - reactiveStart}ms - Set: ${selectedSetName}, Artist: ${selectedArtistName}`);
	}
</script>

<main class="max-lg:px-0 text-white text-lg flex flex-col flex-1 lg:-mt-8">
	{#await data.streamed.allCards}
		<!-- todo: remove these messages when we have a proper loading state -->
		<!-- Pending for allCards (outer) -->
		<div class="flex justify-center items-center h-64">
			<Loader message="Loading cards..." />
		</div>
	{:then allCardsResolved}
		{@const cardsLoadTime = performance.now()}
		{@const cardsLogSuccess = console.log(`📦 CardsListPage: Cards loaded (${allCardsResolved.length} cards) at ${cardsLoadTime}ms`)}
		<!-- allCards resolved, now handle prices -->
		{#await data.streamed.prices}
			<!-- Pending for prices (while allCards is resolved) -->
			<div class="flex justify-center items-center h-64">
				<Loader message="Loading prices..." />
			</div>
		{:then pricesResolved}
			{@const pricesLoadTime = performance.now()}
			{@const pricesLogSuccess = console.log(`💰 CardsListPage: Prices loaded (${Object.keys(pricesResolved).length} entries) at ${pricesLoadTime}ms`)}
			{@const gridStartTime = performance.now()}
			{@const gridStartLog = console.log(`🎯 CardsListPage: Starting CardGrid render at ${gridStartTime}ms`)}
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
				{lowRes}
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
