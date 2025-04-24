<script lang="ts">
	import type { PageData } from './$types';
	import CardDisplay from "@components/card/CardDisplay.svelte";
	import type { Card, Pokemon, Set, PriceData } from "$lib/types";
	
	export let data: PageData;

	$: cards = data.cards as Card[];
	$: pokemons = data.pokemons as Pokemon[];
	$: sets = data.sets as Set[];
	$: pokemon = data.pokemon as Pokemon;
	$: prices = data.prices as Record<string, PriceData>;
</script>

<main class="max-w-[100vw] p-2 text-lg text-white">
	<div class="mt-4 lg:mt-10 mx-auto flex flex-col gap-8 w-[90%] -z-10">
		{#if !cards || cards.length === 0}
			<p class="text-center text-lg">Chargement en cours...</p>
		{:else}
			<CardDisplay {cards} {pokemons} {sets} {prices} pokemon={pokemon} />
		{/if}
	</div>
</main> 