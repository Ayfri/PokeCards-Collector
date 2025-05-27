<script lang="ts">
	import type { PageData } from './$types';
	import CardDisplay from "@components/card/CardDisplay.svelte";
	import type { Card, Pokemon, Set, PriceData } from "$lib/types";
	import { fade } from 'svelte/transition';	
	
	export let data: PageData;

	$: allCards = data.allCards as Card[];
	$: pokemonCards = data.pokemonCards as Card[];
	$: pokemons = data.pokemons as Pokemon[];
	$: sets = data.sets as Set[];
	$: pokemon = data.pokemon as Pokemon;
	$: prices = data.prices as Record<string, PriceData>;
	$: targetCard = data.targetCard as Card;
</script>

<main class="max-w-[100vw] p-4 mb-4 text-lg text-white">
	<div class="mt-4 mx-auto flex flex-col gap-8 w-[90%] -z-10">
		{#if !pokemonCards || pokemonCards.length === 0 || !targetCard}
			<p class="text-center text-lg">Chargement en cours...</p>
		{:else}
			{#key targetCard.cardCode}
				<div in:fade={{ duration: 300 }}>
					<CardDisplay allCards={allCards} pokemonCards={pokemonCards} {pokemons} {sets} {prices} />
				</div>
			{/key}
		{/if}
	</div>
</main> 