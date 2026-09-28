<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { filters } from '$stores/filters.svelte';
	import GridHeading from '$lib/components/list/GridHeading.svelte';
	import Loader from "$lib/components/Loader.svelte";
	import { cardSize } from '$stores/grid.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const sets = $derived(data.sets);

	/** Only the L and XL presets are wide enough to be worth the full-resolution art. */
	const lowRes = $derived(cardSize.current < 2);

	const selectedSetName = $derived(filters.set !== 'all' && sets ? (sets.find(set => set.name.toLowerCase() === filters.set)?.name ?? null) : null);

</script>

<main class="max-lg:px-0 text-white text-lg flex min-h-0 flex-col flex-1 lg:-mt-8">
	<GridHeading description={data.description} title={data.title} />

	<!-- The loader is out of the flow: during its out transition the grid mounts under it instead of below it. -->
	<div class="relative flex min-h-0 flex-1 flex-col">
		{#await data.streamed.grid}
			<div class="absolute inset-x-0 top-32 flex justify-center">
				<Loader message="Loading cards..." />
			</div>
		{:then grid}
			<CardGrid
				cards={grid.cards}
				sets={data.sets}
				rarities={grid.rarities}
				types={grid.types}
				artists={grid.artists}
				pokemons={grid.pokemons}
				prices={grid.prices}
				pageTitle={null}
				selectedSetName={selectedSetName}
				selectedArtistName={filters.artist !== 'all' ? (grid.artists.find(artist => artist.toLowerCase() === filters.artist) ?? null) : null}
				{lowRes}
			/>
		{:catch cardError}
			<p class="text-red-500 p-4">Error loading cards: {cardError.message}</p>
		{/await}
	</div>
</main>
