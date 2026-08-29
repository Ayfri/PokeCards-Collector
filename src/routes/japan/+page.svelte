<script lang="ts">
	import CardGrid from '@components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { filterSet, filterArtist, filterSupertype, filterName, filterType, sortBy, sortOrder, mostExpensiveOnly, filterRarity } from '$helpers/filters';
	import { page } from '$app/state';
	import GridHeading from '$lib/components/list/GridHeading.svelte';
	import BouncyLoader from '@components/BouncyLoader.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const sets = $derived(data.sets);
	const types = $derived(data.types);
	const pokemons = $derived(data.pokemons);
	const prices = $derived(data.prices);

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

		// Apply the URL filters directly, without resetFilters
		if (setParam || artistParam || typeParam || nameParam || pokemonTypeParam || sortByParam || sortOrderParam || mostExpensiveParam || rarityParam) {
			if (setParam) {
				const decodedSetParam = decodeURIComponent(setParam).toLowerCase();
				const foundSet = sets.find(set => set.name.toLowerCase() === decodedSetParam);
				if (foundSet) {
					$filterSet = foundSet.name.toLowerCase();
				}
			}

			// Artist and rarity filters compare lowercased, so the URL value is already the store value.
			if (artistParam) {
				$filterArtist = decodeURIComponent(artistParam).toLowerCase();
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
				$filterRarity = decodeURIComponent(rarityParam).toLowerCase();
			}
		}
	});

	const selectedSetName = $derived($filterSet !== 'all' && sets ? (sets.find(set => set.name.toLowerCase() === $filterSet)?.name ?? null) : null);
	const artistName = (artists: string[]) => $filterArtist !== 'all' ? (artists.find(artist => artist.toLowerCase() === $filterArtist) ?? null) : null;
</script>

<GridHeading
	description={data.description}
	note="Some features may be missing: the Japanese catalogue is not yet complete."
	title={data.title}
/>

{#await data.streamed.cardData}
	<div class="flex flex-col items-center justify-center text-center text-xl mt-12">
		<BouncyLoader size={40} />
		<p class="mt-3 text-white">Loading cards...</p>
	</div>
{:then cardDataResolved}
	{@const allCards = cardDataResolved.allCards}
	<main class="max-lg:px-0 text-white text-lg flex flex-col flex-1 lg:-mt-8">
		<CardGrid cards={allCards} {sets} rarities={cardDataResolved.rarities} {types} artists={cardDataResolved.artists} {pokemons} {prices} pageTitle={null} selectedSetName={selectedSetName} selectedArtistName={artistName(cardDataResolved.artists)} />
	</main>
{:catch error}
	<p style="color: red">Error loading cards: {error.message}</p>
{/await}

