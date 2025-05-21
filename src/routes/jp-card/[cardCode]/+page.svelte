<script lang="ts">
	import type { PageData } from './$types';
	import CardDisplay from "@components/card/CardDisplay.svelte";
	import type { FullCard, Pokemon, Set, PriceData } from "$lib/types";
	import { fade } from 'svelte/transition';	

	export let data: PageData;

	$: allCards = data.allCards as FullCard[];
	$: pokemonCards = data.pokemonCards as FullCard[];
	$: pokemons = data.pokemons as Pokemon[];
	$: sets = data.sets as Set[];
	$: pokemon = data.pokemon as Pokemon;
	$: prices = (data.prices as Record<string, PriceData> | undefined) || {};
	
	// This will ensure all components know we're in the Japanese card context
	let isJpContext = true;
</script>

<main class="max-w-[100vw] p-4 mb-4 text-lg text-white">
	<div class="mt-4 mx-auto flex flex-col gap-8 w-[90%] -z-10">
		{#if !pokemonCards || pokemonCards.length === 0}
			<p class="text-center text-lg">Loading...</p>
		{:else}
			<div in:fade={{ duration: 300 }}>
				<CardDisplay 
					allCards={allCards} 
					pokemonCards={pokemonCards} 
					{pokemons} 
					{sets} 
					{prices}
					isJapaneseContext={isJpContext} 
				/>
			</div>
		{/if}
	</div>
</main> 