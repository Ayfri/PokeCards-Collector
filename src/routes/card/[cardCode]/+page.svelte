<script lang="ts">
	import type { PageData } from './$types';
	import CardDisplay from "@components/card/CardDisplay.svelte";
	import type { Card, Pokemon, Set, PriceData } from "$lib/types";
	import { fade } from 'svelte/transition';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const allCards = $derived(data.allCards as Card[]);
	const pokemonCards = $derived(data.pokemonCards as Card[]);
	const pokemons = $derived(data.pokemons as Pokemon[]);
	const sets = $derived(data.sets as Set[]);
	const prices = $derived(data.prices as Record<string, PriceData>);
	const targetCard = $derived(data.targetCard as Card);
</script>

<main class="max-w-[100vw] p-4 mb-4 text-lg text-white">
	<div class="mt-4 mx-auto flex flex-col gap-8 w-[90%] -z-10">
		{#if !pokemonCards?.length || !targetCard}
			<p class="text-center text-lg">Chargement en cours...</p>
		{:else}
			{#key targetCard.cardCode}
				<div in:fade={{ duration: 300 }}>
					<CardDisplay
						{allCards}
						{pokemonCards}
						{pokemons}
						{sets}
						{prices}
						lowRes={true}
					/>
				</div>
			{/key}
		{/if}
	</div>
</main>
