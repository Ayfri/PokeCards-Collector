<script lang="ts">
	import CardGrid from '#lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { filters } from '#stores/filters.svelte.ts';
	import GridHeading from '#lib/components/list/GridHeading.svelte';
	import Loader from '#lib/components/Loader.svelte';
	import { cardSize } from '#stores/grid.svelte.ts';
	import { catalogueRoutes } from '#helpers/catalogues.ts';
	import { payloadUrl } from '#helpers/utils.ts';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const sets = $derived(data.sets);

	/** Only the L and XL card sizes are wide enough to need the full-resolution art. */
	const lowRes = $derived(cardSize.current < 2);

	const selectedSetName = $derived(filters.set !== 'all' && sets ? (sets.find(set => set.name.toLowerCase() === filters.set)?.name ?? null) : null);

</script>

<svelte:head>
	{#if data.preloadPayload}
		<link as="fetch" crossorigin="anonymous" href={payloadUrl(data.payload)} rel="preload" />
	{/if}
</svelte:head>

<div class="flex min-h-0 flex-1 flex-col text-lg text-white">
	<GridHeading description={data.description} language="en" paths={catalogueRoutes('gridRoute')} title={data.title} />

	<!-- The loader is absolutely positioned so that during its out transition the grid mounts under it, not below it. -->
	<div class="relative flex min-h-0 flex-1 flex-col">
		{#await data.streamed.grid}
			<div class="absolute inset-x-0 top-32 flex justify-center">
				<Loader />
			</div>
		{:then grid}
			<CardGrid
				artists={grid.artists}
				cards={grid.cards}
				{lowRes}
				pageTitle={null}
				pokemons={grid.pokemons}
				rarities={grid.rarities}
				selectedArtistName={filters.artist !== 'all' ? (grid.artists.find(artist => artist.toLowerCase() === filters.artist) ?? null) : null}
				selectedSetName={selectedSetName}
				sets={data.sets}
				types={grid.types}
			/>
		{:catch cardError}
			<p class="p-4 text-red-400">Error loading cards: {cardError.message}</p>
		{/await}
	</div>
</div>
