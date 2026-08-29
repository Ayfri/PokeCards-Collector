<script lang="ts">
	import CardGrid from '@components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { filters } from '$stores/filters.svelte';
	import GridHeading from '$lib/components/list/GridHeading.svelte';
	import BouncyLoader from '@components/BouncyLoader.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const sets = $derived(data.sets);

	const selectedSetName = $derived(filters.set !== 'all' && sets ? (sets.find(set => set.name.toLowerCase() === filters.set)?.name ?? null) : null);
	const artistName = (artists: string[]) => filters.artist !== 'all' ? (artists.find(artist => artist.toLowerCase() === filters.artist) ?? null) : null;
</script>

<GridHeading
	description={data.description}
	note="Japanese catalogue still incomplete."
	title={data.title}
/>

{#await data.streamed.cardData}
	<div class="flex flex-col items-center justify-center text-center text-xl mt-12">
		<BouncyLoader size={40} />
		<p class="mt-3 text-white">Loading cards...</p>
	</div>
{:then cardDataResolved}
	{@const allCards = cardDataResolved.allCards}
	<main class="max-lg:px-0 text-white text-lg flex min-h-0 flex-col flex-1 lg:-mt-8">
		<CardGrid cards={allCards} {sets} rarities={cardDataResolved.rarities} types={cardDataResolved.types} artists={cardDataResolved.artists} pokemons={cardDataResolved.pokemons} prices={cardDataResolved.prices} pageTitle={null} selectedSetName={selectedSetName} selectedArtistName={artistName(cardDataResolved.artists)} />
	</main>
{:catch error}
	<p style="color: red">Error loading cards: {error.message}</p>
{/await}

