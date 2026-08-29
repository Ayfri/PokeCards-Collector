<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { filterSet, filterArtist, filterSupertype, filterName, filterType, sortBy, sortOrder, mostExpensiveOnly, filterRarity, resetFilters } from '$lib/helpers/filters';
	import { page } from '$app/state';
	import Loader from "$lib/components/Loader.svelte";
	import { cardSize } from '$lib/stores/gridStore';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const sets = $derived(data.sets);

	// Determine lowRes based on cardSize
	const lowRes = $derived(!($cardSize === 2 || $cardSize === 3)); // true if not L or XL

	const selectedSetName = $derived($filterSet !== 'all' && sets ? (sets.find(set => set.name.toLowerCase() === $filterSet)?.name ?? null) : null);

	onMount(() => {
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

			// Artist, rarity and type filters compare lowercased, so the URL value is already the store value.
			if (artistParam) {
				filterArtist.set(decodeURIComponent(artistParam).toLowerCase());
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
				const typeExists = data.types.some(type => type.toLowerCase() === decodedPokemonTypeParam.toLowerCase());
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

			if (rarityParam) {
				filterRarity.set(decodeURIComponent(rarityParam).toLowerCase());
			}
		}
	});
</script>

<main class="max-lg:px-0 text-white text-lg flex flex-col flex-1 lg:-mt-8">
	{#await data.streamed.grid}
		<div class="flex flex-1 justify-center items-start pt-32">
			<Loader message="Loading cards..." />
		</div>
	{:then grid}
		<CardGrid
			cards={grid.cards}
			sets={data.sets}
			rarities={grid.rarities}
			types={data.types}
			artists={grid.artists}
			pokemons={data.pokemons}
			prices={grid.prices}
			pageTitle="Cards List"
			selectedSetName={selectedSetName}
			selectedArtistName={$filterArtist !== 'all' ? (grid.artists.find(artist => artist.toLowerCase() === $filterArtist) ?? null) : null}
			{lowRes}
		/>
	{:catch cardError}
		<p class="text-red-500 p-4">Error loading cards: {cardError.message}</p>
	{/await}
</main>
