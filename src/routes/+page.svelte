<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	// Use allCards from layout data passed down via PageData
	$: allCards = data.allCards;
	$: sets = data.sets;
	$: rarities = data.rarities;
	$: types = data.types;
	$: artists = data.artists;
	$: pokemons = data.pokemons;
</script>

<main class="max-lg:px-0 text-white text-lg flex flex-col flex-1">
	<CardGrid cards={allCards} {sets} {rarities} {types} {artists} {pokemons} />
</main>

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
</style>
