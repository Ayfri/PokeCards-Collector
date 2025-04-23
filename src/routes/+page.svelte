<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { getUserWishlist } from '$lib/services/wishlists';
	import { filterSet, filterArtist, resetFilters } from '$lib/helpers/filters';
	import { page } from '$app/stores';

	export let data: PageData;

	// Use allCards from layout data passed down via PageData
	$: allCards = data.allCards;
	$: sets = data.sets;
	$: rarities = data.rarities;
	$: types = data.types;
	$: artists = data.artists;
	$: pokemons = data.pokemons;

	onMount(() => {
		// Check if we have any filter parameters in the URL
		const setParam = $page.url.searchParams.get('set');
		const artistParam = $page.url.searchParams.get('artist');

		// If we have any filter parameters, reset all filters first
		if (setParam || artistParam) {
			resetFilters(); // Removed to prevent resetting filters on page load

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
				const artistExists = artists.some(artist => artist.toLowerCase() === decodedArtistParam);
				if (artistExists) {
					filterArtist.set(decodedArtistParam);
				}
			}
		}

		const unsubscribe = authStore.subscribe(async (state) => {
			if (!state.loading) {
				if (state.profile) {
					const { data: wishlistItems, error } = await getUserWishlist(state.profile.username);
				}
			}
		});
		return unsubscribe;
	});
</script>

<main class="max-lg:px-0 text-white text-lg flex flex-col flex-1 lg:-mt-8">
	<CardGrid cards={allCards} {sets} {rarities} {types} {artists} {pokemons} />
</main>

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
</style>
