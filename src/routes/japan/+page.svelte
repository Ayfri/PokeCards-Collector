<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { filterSet, filterArtist, filterSupertype, filterName, filterType, sortBy, sortOrder, mostExpensiveOnly, filterRarity, resetFilters } from '$lib/helpers/filters';
	import { page } from '$app/state';
	import CardStackIcon from 'lucide-svelte/icons/layers';

	export let data: PageData;

	// Use allCards from layout data passed down via PageData
	$: allCards = data.allCards;
	$: sets = data.sets;
	$: rarities = data.rarities;
	$: types = data.types;
	$: artists = data.artists;
	$: pokemons = data.pokemons;
	$: prices = data.prices;

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
			resetFilters(); // Reset filters on page load

			// Then apply the specific filter from the URL
			if (setParam) {
				const decodedSetParam = decodeURIComponent(setParam);
				const setExists = sets.some(set => set.name === decodedSetParam);
				if (setExists) {
					filterSet.set(decodedSetParam.toLowerCase());
				}
			}

			if (artistParam) {
				const decodedArtistParam = decodeURIComponent(artistParam);
				const artistExists = artists.some(artist => artist.toLowerCase() === decodedArtistParam.toLowerCase());
				if (artistExists) {
					filterArtist.set(decodedArtistParam.toLowerCase());
				}
			}

			if (typeParam) {
				const decodedTypeParam = decodeURIComponent(typeParam);
				const typeExists = ["Pokémon", "Trainer", "Energy"].includes(decodedTypeParam);
				if (typeExists) {
					filterSupertype.set(decodedTypeParam);
				}
			}

			if (nameParam) {
				const decodedNameParam = decodeURIComponent(nameParam);
				filterName.set(decodedNameParam);
			}

			if (pokemonTypeParam) {
				const decodedPokemonTypeParam = decodeURIComponent(pokemonTypeParam);
				const pokemonTypeExists = types.some(type => type.toLowerCase() === decodedPokemonTypeParam.toLowerCase());
				if (pokemonTypeExists) {
					filterType.set(decodedPokemonTypeParam.toLowerCase());
				}
			}

			if (sortByParam) {
				const decodedSortByParam = decodeURIComponent(sortByParam);
				if (["sort-name", "sort-price", "sort-number", "sort-set"].includes(decodedSortByParam)) {
					sortBy.set(decodedSortByParam);
				}
			}

			if (sortOrderParam) {
				const decodedSortOrderParam = decodeURIComponent(sortOrderParam);
				if (["asc", "desc"].includes(decodedSortOrderParam)) {
					sortOrder.set(decodedSortOrderParam);
				}
			}

			if (mostExpensiveParam) {
				const decodedMostExpensiveParam = decodeURIComponent(mostExpensiveParam);
				if (decodedMostExpensiveParam === "true") {
					mostExpensiveOnly.set(true);
				}
			}

			if (rarityParam) {
				const decodedRarityParam = decodeURIComponent(rarityParam);
				const rarityExists = rarities.some(rarity => rarity.toLowerCase() === decodedRarityParam.toLowerCase());
				if (rarityExists) {
					filterRarity.set(decodedRarityParam.toLowerCase());
				}
			}
		}
	});
</script>

<main class="max-lg:px-0 text-white text-lg flex flex-col flex-1 lg:-mt-8">
	<div class="p-4 flex justify-end">
		<a href="/cards-list" class="text-gold-400 hover:text-gold-300 transition-colors flex items-center gap-2">
			<CardStackIcon size={16} />
			View International Cards
		</a>
	</div>
	<CardGrid cards={allCards} {sets} {rarities} {types} {artists} {pokemons} {prices} pageTitle="Japanese Cards" />
</main>

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
</style> 