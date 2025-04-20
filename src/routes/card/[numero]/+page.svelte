<script lang="ts">
	import { onMount } from "svelte";
	import CardDisplay from "@components/card/CardDisplay.svelte";
	import CardImage from "@components/card/CardImage.svelte";
	import { spriteCache } from "$stores/spriteCache";
	import type { PageData } from "./$types";
	import type { Pokemon, FullCard } from "$lib/types";

	export let data: PageData;
	const pokemon: Pokemon | undefined = data.pokemon;
	const primaryCard: FullCard = data.cards[0];

	let spritesMap: Record<number, string> = {};

	onMount(async () => {
		if (pokemon && data.evolutionChain?.length > 0) {
			const sprites = await Promise.all(
				data.evolutionChain.map(async (evoPokemon: Pokemon) => ({
					id: evoPokemon.id,
					sprite: await spriteCache.getSprite(evoPokemon.id),
				})),
			);
			spritesMap = Object.fromEntries(sprites.map(({ id, sprite }) => [id, sprite]));
		}
	});
</script>

<main class="max-w-[100vw] p-2 text-lg text-white">
	<div class="mt-10 mx-auto flex flex-col gap-8 w-[90%] -z-10 max-lg:mt-8">
		<CardDisplay
			cards={data.cards}
			pokemons={data.pokemons}
			sprites={spritesMap}
			sets={data.sets}
			{pokemon} />
	</div>
</main>
