<script lang="ts">
	import { pascalCase } from '#helpers/format.ts';
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

		const evolutions = currentPokemon.evolves_to ?
			currentPokemon.evolves_to.map(evoId => pokemons.find(pokemon => pokemon.id === evoId)) :
			[];

		const furtherEvolutions = evolutions.length ?
			evolutions.flatMap(evo =>
				evo?.evolves_to ?
					evo.evolves_to.map(furtherEvoId => pokemons.find(pokemon => pokemon.id === furtherEvoId)) :
					[]
			) :
			[];

		const fullChain = [];

		if (prePreEvolution) fullChain.push(prePreEvolution);
		if (preEvolution) fullChain.push(preEvolution);
		fullChain.push(currentPokemon);
		evolutions.forEach(evo => {
			if (evo) fullChain.push(evo);
		});
		furtherEvolutions.forEach(evo => {
			if (evo) fullChain.push(evo);
		});

		const uniqueChain = fullChain.filter((pokemon, index, self) =>
			index === self.findIndex(p => p.id === pokemon.id)
		);

		return uniqueChain;
	}

	const currentPokemon = $derived(pokemons.find(p => p.id === card.pokemonNumber));
	const uniqueChain = $derived(buildEvolutionChain(card));
</script>

{#if uniqueChain.length > 1}
	<div class="evolution-chain bg-gray-800/75 flex items-center justify-center gap-4 max-w-full overflow-x-auto px-4 py-2">
		{#each uniqueChain as pokemon, i (pokemon.id)}
			<div class="evolution-item flex flex-col items-center">
				<!-- A real link so crawlers follow the evolution line from card to card. A Pokémon with no card in the catalogue has nothing to open. -->
				<a
					href={pokemonPaths[pokemon.id]}
					class="evolution-image-wrapper relative"
					title="{pascalCase(pokemon.name)} cards"
				>
					<div class="pokemon-number text-[0.6rem] absolute -top-1 -right-1 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center z-10">
						{pokemon.id}
					</div>

					{#if !NO_IMAGES}
					<img
						src={getPokemonImageSrc(pokemon.id)}
						alt={pokemon.name}
						class="evolution-image w-16 h-16 object-contain"
						title={pascalCase(pokemon.name)}
						onerror={(e) => handlePokemonImageError(e, pokemon.id, getCardImageForPokemon(pokemon.id, prints))}
						data-pokemon-id={pokemon.id}
					/>
					{:else}
					<div class="evolution-image w-16 h-16 flex items-center justify-center text-white text-xs bg-gray-800 rounded-full">
						#{pokemon.id}
					</div>
					{/if}

					{#if pokemon.id === currentPokemon?.id}
						<div class="current-marker absolute inset-0 border-2 border-gold-400 rounded-full"></div>
					{/if}
				</a>
				<span class="evolution-name text-xs text-center mt-1 max-w-16 overflow-hidden text-ellipsis">
					{pascalCase(pokemon.name)}
				</span>
			</div>

			{#if i < uniqueChain.length - 1}
				<div class="evolution-arrow text-gold-400 flex items-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M5 12h14"></path>
						<path d="m12 5 7 7-7 7"></path>
					</svg>
				</div>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.evolution-chain {
		border-color: var(--color-gold-400);
		border-radius: 1rem;
		border-style: solid;
		border-width: 2px;
		padding: 0.75rem;
	}

	.evolution-image {
		background-color: rgba(0, 0, 0, 0.5);
		border-radius: 50%;
		transition: transform 0.2s ease-in-out;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.evolution-image-wrapper {
		padding: 0.25rem;
		border-radius: 50%;
		background-color: rgba(0, 0, 0, 0.2);
		transition: all 0.2s ease-in-out;
	}

	.evolution-image-wrapper:hover {
		background-color: color-mix(in oklab, var(--color-gold-400) 20%, transparent);
	}

	.evolution-image-wrapper:hover .evolution-image {
		transform: scale(1.1);
	}

	@keyframes pulse {
		0% { opacity: 0.7; }
		50% { opacity: 1; }
		100% { opacity: 0.7; }
	}

	.current-marker {
		box-shadow: 0 0 8px var(--color-gold-400);
	}

	.evolution-arrow {
		color: var(--color-gold-400);
	}

	.pokemon-number {
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
		font-weight: 600;
		border: 1px solid var(--color-gold-400);
	}
</style>
