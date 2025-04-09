<script lang="ts">
	import { onMount } from 'svelte';
	import PokemonDisplay from '@components/card/PokemonDisplay.svelte';
	import CardActions from '@components/card/CardActions.svelte';
	import { spriteCache } from '$stores/spriteCache';
	import { authStore } from '$lib/stores/auth';
	import type { PageData } from './$types';
	import type { Pokemon } from '~/lib/types';

	export let data: PageData;

	let spritesMap = {};

	onMount(async () => {
		const sprites = await Promise.all(
			data.evolutionChain.map(async (pokemon: Pokemon) => ({
				id: pokemon.id,
				sprite: await spriteCache.getSprite(pokemon.id)
			}))
		);

		spritesMap = Object.fromEntries(
			sprites.map(({id, sprite}) => [id, sprite])
		);
	});

	$: pokemonName = data.cards[0].pokemon.name;
	$: capitalizedPokemonName = pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1);
	$: cardId = data.cards[0].id;
</script>

<svelte:head>
	<title>{capitalizedPokemonName} - Cards</title>
	<meta name="description" content="{capitalizedPokemonName}: {data.cards[0].pokemon.description}" />
	<meta property="og:image" content="{data.cards[0].image}" />
	<meta property="og:image:alt" content="{data.cards[0].pokemon.description}" />
</svelte:head>

<main class="max-w-[100vw] p-2 text-lg text-white">
	<div class="mt-10 mx-auto flex flex-col gap-8 w-[90%] -z-10 max-lg:mt-8">
		<PokemonDisplay cards={data.cards} pokemons={data.pokemons} sprites={spritesMap}/>

		{#if $authStore.user}
			<div class="bg-gray-800 p-4 rounded-lg">
				<h2 class="text-xl font-semibold mb-2">Actions</h2>
				<CardActions cardId={cardId} />
			</div>
		{/if}
	</div>
</main>
