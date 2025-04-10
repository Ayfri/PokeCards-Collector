<script lang="ts">
	import { onMount } from "svelte";
	import PokemonDisplay from "@components/card/PokemonDisplay.svelte";
	import { spriteCache } from "$stores/spriteCache";
	import type { PageData } from "./$types";
	import type { Pokemon, FullCard } from "$lib/types";

	export let data: PageData;
	const card: FullCard = data.cards[0];
	const pokemon: Pokemon = data.pokemon;

	let spritesMap: Record<number, string> = {};

	onMount(async () => {
		const sprites = await Promise.all(
			data.evolutionChain.map(async (pokemon: Pokemon) => ({
				id: pokemon.id,
				sprite: await spriteCache.getSprite(pokemon.id),
			})),
		);

		spritesMap = Object.fromEntries(sprites.map(({ id, sprite }) => [id, sprite]));
	});

	$: pokemonName = pokemon.name;
	$: capitalizedPokemonName = pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1);
</script>

<svelte:head>
	<title>{capitalizedPokemonName} - Cards</title>
	<meta name="description" content="{capitalizedPokemonName}: {pokemon.description}" />
	<meta property="og:image" content={card.image} />
	<meta property="og:image:alt" content={pokemon.description} />
</svelte:head>

<main class="max-w-[100vw] p-2 text-lg text-white">
	<div class="mt-10 mx-auto flex flex-col gap-8 w-[90%] -z-10 max-lg:mt-8">
		<PokemonDisplay cards={data.cards} pokemons={data.pokemons} sprites={spritesMap} sets={data.sets} />
	</div>
</main>
