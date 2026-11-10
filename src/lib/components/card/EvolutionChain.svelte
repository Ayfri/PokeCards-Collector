<script lang="ts">
	import { titleCase } from '#helpers/format.ts';
	import { getPokemonImageSrc, handlePokemonImageError } from '#helpers/pokemon-utils.ts';
	import { getCardImageForPokemon, NO_IMAGES } from '#helpers/card-images.ts';
	import type { FullCard, Pokemon } from '#lib/types.js';

	interface Props {
		card: FullCard;
		/** The path of each Pokémon of the chain that has a card, by Pokédex id. */
		pokemonPaths: Record<number, string>;
		pokemons: Pokemon[];
		/** The prints of the shown Pokémon: the sprite falls back to their scan. */
		prints: FullCard[];
	}

	let {
		card,
		pokemonPaths,
		pokemons,
		prints
	}: Props = $props();

	function buildEvolutionChain(card: FullCard) {
		const currentPokemon = pokemons.find(p => p.id === card.pokemonNumber);
		if (!currentPokemon) {
			console.error(`Pokemon #${card.pokemonNumber} not found in pokemons array`);
			return [];
		}

		const preEvolution = currentPokemon.evolves_from ?
			pokemons.find(pokemon => pokemon.id === currentPokemon.evolves_from) :
			undefined;

		const prePreEvolution = preEvolution?.evolves_from ?
			pokemons.find(pokemon => pokemon.id === preEvolution.evolves_from) :
			undefined;

		const evolutions = currentPokemon.evolves_to?.map(evoId => pokemons.find(pokemon => pokemon.id === evoId)) ?? [];
		const furtherEvolutions = evolutions.flatMap(evo => evo?.evolves_to?.map(furtherEvoId => pokemons.find(pokemon => pokemon.id === furtherEvoId)) ?? []);
		const fullChain = [prePreEvolution, preEvolution, currentPokemon, ...evolutions, ...furtherEvolutions].filter((pokemon): pokemon is Pokemon => pokemon !== undefined);
		return fullChain.filter((pokemon, index, self) => index === self.findIndex(p => p.id === pokemon.id));
	}

	const currentPokemon = $derived(pokemons.find(p => p.id === card.pokemonNumber));
	const uniqueChain = $derived(buildEvolutionChain(card));
</script>

{#if uniqueChain.length > 1}
	<div class="bg-gray-800/75 flex items-center justify-center gap-4 max-w-full overflow-x-auto p-3 rounded-2xl border-2 border-gold-400">
		{#each uniqueChain as pokemon, i (pokemon.id)}
			<div class="flex flex-col items-center">
				<!-- A real link so crawlers follow the evolution line from card to card. A Pokémon with no card in the catalogue has nothing to open. -->
				<a
					class="group relative rounded-full bg-black/20 p-1 transition-all duration-200 ease-in-out hover:bg-gold-400/20"
					href={pokemonPaths[pokemon.id]}
					title="{titleCase(pokemon.name)} cards"
				>
					<div class="text-[0.6rem] absolute -top-1 -right-1 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center z-10 border border-gold-400 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
						{pokemon.id}
					</div>

					{#if !NO_IMAGES}
					<img
						alt={pokemon.name}
						class="w-16 h-16 object-contain rounded-full bg-black/50 shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-in-out group-hover:scale-110"
						onerror={(e) => handlePokemonImageError(e, pokemon.id, getCardImageForPokemon(pokemon.id, prints))}
						src={getPokemonImageSrc(pokemon.id)}
						title={titleCase(pokemon.name)}
					/>
					{:else}
					<div class="w-16 h-16 flex items-center justify-center text-white text-xs bg-black/50 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-in-out group-hover:scale-110">
						#{pokemon.id}
					</div>
					{/if}

					{#if pokemon.id === currentPokemon?.id}
						<div class="absolute inset-0 border-2 border-gold-400 rounded-full shadow-[0_0_8px_var(--color-gold-400)]"></div>
					{/if}
				</a>
				<span class="text-xs text-center mt-1 max-w-16 overflow-hidden text-ellipsis">
					{titleCase(pokemon.name)}
				</span>
			</div>

			{#if i < uniqueChain.length - 1}
				<div class="text-gold-400 flex items-center">
					<svg fill="none" height="20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
						<path d="M5 12h14"></path>
						<path d="m12 5 7 7-7 7"></path>
					</svg>
				</div>
			{/if}
		{/each}
	</div>
{/if}
