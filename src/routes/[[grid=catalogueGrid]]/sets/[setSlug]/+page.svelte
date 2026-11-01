<script lang="ts">
	import CardGrid from '#lib/components/list/CardGrid.svelte';
	import GridHeading from '#lib/components/list/GridHeading.svelte';
	import Loader from '#lib/components/Loader.svelte';
	import SetChecklist from '#lib/components/list/SetChecklist.svelte';
	import { formatCardNumber, setCardCount } from '#helpers/card-utils.ts';
	import { formatDate, formatEuros } from '#helpers/format.ts';
	import { filters } from '#stores/filters.svelte.ts';
	import { cardSize } from '#stores/grid.svelte.ts';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	/** Only the L and XL card sizes are wide enough to need the full-resolution art. */
	const lowRes = $derived(cardSize.current < 2);
	const sets = $derived([data.set]);
</script>

<div class="flex min-h-0 flex-1 flex-col text-lg text-white">
	<GridHeading description={data.description} title={data.title} />

	<!-- The facts and the priciest cards are plain text in the document, which is all a crawler without JavaScript reads of the grid below. -->
	<p class="mx-4 mb-1 flex shrink-0 flex-wrap gap-x-4 text-xs text-gray-300 lg:mx-10">
		<span>Released {formatDate(data.set.releaseDate)}</span>
		{#if data.set.series}<span>Series: {data.set.series}</span>{/if}
		<span>{setCardCount(data.set)} cards</span>
		{#if data.value}<span>Total value: <span class="text-gold-400">{formatEuros(data.value)}</span></span>{/if}
	</p>
	{#if data.topCards.length}
		<p class="mx-4 mb-2 shrink-0 text-xs text-gray-300 lg:mx-10">
			<span class="font-semibold text-gold-400">Most valuable:</span>
			{#each data.topCards as card, index (card.cardCode)}
				{#if index}, {/if}<a class="transition-colors hover:text-gold-400" href={card.path}>{card.name} {formatCardNumber(card.localId, data.set.printedTotal)}</a> {formatEuros(card.price)}
			{/each}
		</p>
	{/if}
	<SetChecklist entries={data.checklist} />

	<!-- The loader is absolutely positioned so that during its out transition the grid mounts under it, not below it. -->
	<div class="relative flex min-h-0 flex-1 flex-col">
		{#await data.streamed.grid}
			<div class="absolute inset-x-0 top-32 flex justify-center">
				<Loader message="Loading cards..." />
			</div>
		{:then grid}
			<CardGrid
				artists={grid.artists}
				cards={grid.cards}
				{lowRes}
				note={data.note}
				pageTitle={null}
				pokemons={grid.pokemons}
				rarities={grid.rarities}
				selectedArtistName={filters.artist !== 'all' ? (grid.artists.find(artist => artist.toLowerCase() === filters.artist) ?? null) : null}
				selectedSetName={data.set.name}
				{sets}
				types={grid.types}
			/>
		{:catch cardError}
			<p class="p-4 text-red-400">Error loading cards: {cardError.message}</p>
		{/await}
	</div>
</div>
