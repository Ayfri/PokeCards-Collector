<script lang="ts">
	import CardGrid from '#components/list/CardGrid.svelte';
	import Loader from '#components/Loader.svelte';
	import type { GridPayload } from '#helpers/grid-payload.ts';
	import type { Set as CardSet } from '#lib/types.js';
	import { filters } from '#stores/filters.svelte.ts';
	import { cardSize } from '#stores/grid.svelte.ts';

	interface Props {
		grid: Promise<GridPayload>;
		note?: string;
		selectedSetName: string | null;
		sets: CardSet[];
	}

	let { grid, note, selectedSetName, sets }: Props = $props();

	/** Only the L and XL card sizes are wide enough to need the full-resolution art. */
	const lowRes = $derived(cardSize.current < 2);
</script>

<!-- The loader is absolutely positioned so that during its out transition the grid mounts under it, not below it. -->
<div class="relative flex min-h-0 flex-1 flex-col">
	{#await grid}
		<div class="absolute inset-x-0 top-32 flex justify-center">
			<Loader />
		</div>
	{:then payload}
		<CardGrid
			artists={payload.artists}
			cards={payload.cards}
			{lowRes}
			{note}
			pageTitle={null}
			pokemons={payload.pokemons}
			rarities={payload.rarities}
			selectedArtistName={filters.artist !== 'all' ? (payload.artists.find(artist => artist.toLowerCase() === filters.artist) ?? null) : null}
			{selectedSetName}
			{sets}
			types={payload.types}
		/>
	{:catch cardError}
		<p class="p-4 text-red-400">Error loading cards: {cardError.message}</p>
	{/await}
</div>
