<script lang="ts">
	import CardGrid from '@components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { filterSet, filterArtist, filterSupertype, filterName, filterType, sortBy, sortOrder, mostExpensiveOnly, filterRarity } from '$helpers/filters';
	import { page } from '$app/state';
	import BouncyLoader from '@components/BouncyLoader.svelte';

	export let data: PageData;

	// Data that is available immediately
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

		// If we have any filter parameters, appliquer directement les filtres sans resetFilters
		if (setParam || artistParam || typeParam || nameParam || pokemonTypeParam || sortByParam || sortOrderParam || mostExpensiveParam || rarityParam) {
			// Puis appliquer les filtres spécifiques depuis l'URL
			if (setParam) {
				const decodedSetParam = decodeURIComponent(setParam).toLowerCase();
				const foundSet = sets.find(set => set.name.toLowerCase() === decodedSetParam);
				if (foundSet) {
					$filterSet = foundSet.name.toLowerCase();
				}
			}

			if (artistParam) {
				const decodedArtistParam = decodeURIComponent(artistParam).toLowerCase();
				const foundArtist = artists.find(artist => artist.toLowerCase() === decodedArtistParam);
				if (foundArtist) {
					$filterArtist = foundArtist.toLowerCase();
				}
			}

			if (typeParam) {
				const decodedTypeParam = decodeURIComponent(typeParam);
				const typeExists = ["Pokémon", "Trainer", "Energy"].includes(decodedTypeParam);
				if (typeExists) {
					$filterSupertype = decodedTypeParam;
				}
			}

			if (nameParam) {
				const decodedNameParam = decodeURIComponent(nameParam);
				$filterName = decodedNameParam;
			}

			if (pokemonTypeParam) {
				const decodedPokemonTypeParam = decodeURIComponent(pokemonTypeParam);
				const pokemonTypeExists = types.some(type => type.toLowerCase() === decodedPokemonTypeParam.toLowerCase());
				if (pokemonTypeExists) {
					$filterType = decodedPokemonTypeParam.toLowerCase();
				}
			}

			if (sortByParam) {
				const decodedSortByParam = decodeURIComponent(sortByParam);
				if (["sort-name", "sort-price", "sort-number", "sort-set"].includes(decodedSortByParam)) {
					$sortBy = decodedSortByParam;
				}
			}

			if (sortOrderParam) {
				const decodedSortOrderParam = decodeURIComponent(sortOrderParam);
				if (["asc", "desc"].includes(decodedSortOrderParam)) {
					$sortOrder = decodedSortOrderParam as 'asc' | 'desc';
				}
			}

			if (mostExpensiveParam) {
				const decodedMostExpensiveParam = decodeURIComponent(mostExpensiveParam);
				if (decodedMostExpensiveParam === "true") {
					$mostExpensiveOnly = true;
				}
			}

			if (rarityParam) {
				const decodedRarityParam = decodeURIComponent(rarityParam);
				const rarityExists = rarities.some(rarity => rarity.toLowerCase() === decodedRarityParam.toLowerCase());
				if (rarityExists) {
					$filterRarity = decodedRarityParam.toLowerCase();
				}
			}
		}
	});

	$: selectedSetName = $filterSet !== 'all' && sets ? (sets.find(set => set.name.toLowerCase() === $filterSet)?.name ?? null) : null;
	$: selectedArtistName = $filterArtist !== 'all' && artists ? (artists.find(artist => artist.toLowerCase() === $filterArtist) ?? null) : null;
</script>

{#await data.streamed.cardData}
	<div class="flex flex-col items-center justify-center text-center text-xl mt-12">
		<BouncyLoader size={40} />
		<p class="mt-3 text-white">Loading cards...</p>
	</div>
{:then cardDataResolved}
	{@const allCards = cardDataResolved.allCards}
	<main class="max-lg:px-0 text-white text-lg flex flex-col flex-1 lg:-mt-8">
		<CardGrid cards={allCards} {sets} {rarities} {types} {artists} {pokemons} {prices} pageTitle="Japanese Cards" selectedSetName={selectedSetName} selectedArtistName={selectedArtistName} />
	</main>
{:catch error}
	<p style="color: red">Error loading cards: {error.message}</p>
{/await}

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
</style>
