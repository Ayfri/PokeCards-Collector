<script lang="ts">
	import CardGrid from '#components/list/CardGrid.svelte';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { filters } from '#stores/filters.svelte.ts';
	import GridHeading from '#lib/components/list/GridHeading.svelte';
	import BouncyLoader from '#components/BouncyLoader.svelte';
	import { payloadUrl } from '#helpers/utils.ts';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const sets = $derived(data.sets);

	const selectedSetName = $derived(filters.set !== 'all' && sets ? (sets.find(set => set.name.toLowerCase() === filters.set)?.name ?? null) : null);
	const artistName = (artists: string[]) => filters.artist !== 'all' ? (artists.find(artist => artist.toLowerCase() === filters.artist) ?? null) : null;
</script>

<svelte:head>
	<link rel="preload" as="fetch" crossorigin="anonymous" href={payloadUrl(data.payload)} />
</svelte:head>

<GridHeading description={data.description} title={data.title} />

{#key page.params.grid}
	{#await data.streamed.cardData}
		<div class="flex flex-col items-center justify-center text-center text-xl mt-12">
			<BouncyLoader size={40} />
			<p class="mt-3 text-white">Loading cards...</p>
		</div>
	{:then cardDataResolved}
		<div class="flex min-h-0 flex-1 flex-col text-lg text-white">
			<CardGrid cards={cardDataResolved.cards} {sets} rarities={cardDataResolved.rarities} types={cardDataResolved.types} artists={cardDataResolved.artists} pokemons={cardDataResolved.pokemons} note={data.note} pageTitle={null} selectedSetName={selectedSetName} selectedArtistName={artistName(cardDataResolved.artists)} />
		</div>
	{:catch error}
		<p class="p-4 text-red-400">Error loading cards: {error.message}</p>
	{/await}
{/key}

