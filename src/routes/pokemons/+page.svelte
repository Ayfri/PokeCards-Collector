<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { pascalCase } from '$helpers/strings';
	import { getPokemonImageSrc, handlePokemonImageError, getMostExpensiveCardForPokemon } from '$lib/helpers/pokemon-utils';
	import { NO_IMAGES } from '$lib/images';
	import PageTitle from '@components/PageTitle.svelte';
	import type { Pokemon, FullCard } from '$lib/types';

	export let data: PageData;

	const { pokemons, allCards, prices } = data;

	function navigateToPokemonCard(pokemon: Pokemon) {
		const mostExpensiveCard = getMostExpensiveCardForPokemon(pokemon.id, allCards, prices);
		if (mostExpensiveCard) {
			goto(`/card/${mostExpensiveCard.cardCode}`);
		} else {
			// Fallback or error handling if no card is found for the pokemon
			// For now, let's log an error and maybe navigate to a generic page or show a message
			console.error(`No card found for ${pokemon.name}`);
			// Optionally, navigate to a generic Pokémon page or a not-found page
			// goto(`/pokemon/${pokemon.id}`); // Example, if such a route existed
		}
	}
</script>

<svelte:head>
	<title>All Pokémons | PokéCards Collector</title>
	<meta name="description" content="Browse all Pokémons and their cards." />
</svelte:head>

<div class="container mx-auto px-4 py-8 text-white">
	<PageTitle title="All Pokémons" />

	<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mt-8">
		{#each pokemons.sort((a, b) => a.id - b.id) as pokemon (pokemon.id)}
			<button
				on:click={() => navigateToPokemonCard(pokemon)}
				class="pokemon-card-item group bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-opacity-75 p-3 flex flex-col items-center text-center"
			>
				<div class="image-container relative w-24 h-24 md:w-28 md:h-28 mb-2">
					{#if !NO_IMAGES}
						<img
							src={getPokemonImageSrc(pokemon.id)}
							alt={pascalCase(pokemon.name)}
							class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 ease-in-out"
							on:error={(e) => handlePokemonImageError(e, pokemon.id, allCards)} 
							loading="lazy"
						/>
					{:else}
						<div class="w-full h-full flex items-center justify-center text-white text-sm bg-gray-700 rounded-md">
							#{pokemon.id}
						</div>
					{/if}
					<div class="absolute -top-1 -right-1 bg-gold-500 text-black text-xs font-bold rounded-full size-6 flex items-center justify-center shadow-md">
						{pokemon.id}
					</div>
				</div>
				<span class="pokemon-name text-sm md:text-base font-semibold group-hover:text-gold-400 transition-colors duration-200">
					{pascalCase(pokemon.name)}
				</span>
			</button>
		{/each}
	</div>
</div>

<style lang="postcss">
	.pokemon-card-item {
		border: 1px solid transparent;
	}
	.pokemon-card-item:hover {
		border-color: theme(colors.gold.400);
	}
</style> 