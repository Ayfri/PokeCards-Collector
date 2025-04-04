<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { FullCard, Set } from '~/lib/types';
	import { page } from '$app/state';

	const cards: FullCard[] = page.data.cards;
	const sets: Set[] = page.data.sets;
	const rarities: string[] = page.data.rarities;
	const types: string[] = page.data.types;
</script>

<main class="max-lg:px-0 text-white text-lg flex flex-col flex-1">
	<CardGrid {cards} {sets} {rarities} {types} />
</main>

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
</style>
