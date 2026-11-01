<script lang="ts">
	import type { PageData } from './$types';
	import CardDisplay from "#components/card/CardDisplay.svelte";
	import type { FullCard, Pokemon, Set, PriceData } from "#lib/types.js";
	import { fade } from 'svelte/transition';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const allCards = $derived(data.allCards as FullCard[]);
	const pokemonCards = $derived(data.pokemonCards as FullCard[]);
	const pokemons = $derived(data.pokemons as Pokemon[]);
	const sets = $derived(data.sets as Set[]);
	const prices = $derived((data.prices as Record<string, PriceData> | undefined) || {});
</script>

<main class="max-w-[100vw] p-4 mb-4 text-lg text-white">
	<div class="mt-4 mx-auto flex flex-col gap-8 w-[90%] -z-10">
		{#if !pokemonCards || pokemonCards.length === 0}
			<p class="text-center text-lg">Loading...</p>
		{:else}
			{#key data.card.cardCode}
				<div in:fade={{ duration: 300 }}>
					<CardDisplay
						allCards={allCards}
						pokemonCards={pokemonCards}
						{pokemons}
						{sets}
						{prices}
						versions={data.versions}
					/>
				</div>
			{/key}
		{/if}
	</div>
</main>
