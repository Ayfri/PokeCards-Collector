<script lang="ts">
	import type { PageData } from './$types';
	import CardDisplay from "@components/card/CardDisplay.svelte";

	export let data: PageData;

	$: cards = data.cards;
	$: pokemons = data.pokemons;
	$: sets = data.sets;
	$: pokemon = data.pokemon;
</script>

<main class="max-w-[100vw] p-2 text-lg text-white">
	<div class="mt-10 mx-auto flex flex-col gap-8 w-[90%] -z-10 max-lg:mt-8">
		{#if !cards || cards.length === 0}
			<p>Loading card details...</p>
		{:else}
			<CardDisplay {cards} {pokemons} {sets} pokemon={pokemon} />
		{/if}
	</div>
</main>
