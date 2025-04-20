<script lang="ts">
	import { pascalCase } from '$helpers/strings.js';
	import { processCardImage } from '$helpers/card-images';
	import type { FullCard, Pokemon } from '~/lib/types';

	export let cards: FullCard[];
	export let pokemons: Pokemon[];
	export let card: FullCard;

	function buildEvolutionChain(card: FullCard) {
		// Get current Pokemon from card
		const currentPokemon = pokemons.find(p => p.id === card.pokemonNumber);
		if (!currentPokemon) {
			console.error(`Pokemon #${card.pokemonNumber} not found in pokemons array`);
			return [];
		}

		// Find pre-evolution if it exists
		const preEvolution = currentPokemon.evolves_from ?
			pokemons.find(pokemon => pokemon.id === currentPokemon.evolves_from) :
			undefined;

		// Find pre-pre-evolution if it exists (for 3-stage chains)
		const prePreEvolution = preEvolution?.evolves_from ?
			pokemons.find(pokemon => pokemon.id === preEvolution.evolves_from) :
			undefined;

		// Find evolutions if they exist
		const evolutions = currentPokemon.evolves_to ?
			currentPokemon.evolves_to.map(evoId => pokemons.find(pokemon => pokemon.id === evoId)) :
			[];

		// Find further evolutions if they exist
		const furtherEvolutions = evolutions.length ?
			evolutions.flatMap(evo =>
				evo?.evolves_to ?
					evo.evolves_to.map(furtherEvoId => pokemons.find(pokemon => pokemon.id === furtherEvoId)) :
					[]
			) :
			[];

		// Build the full chain
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

		// Remove duplicates if any
		const uniqueChain = fullChain.filter((pokemon, index, self) =>
			index === self.findIndex(p => p.id === pokemon.id)
		);

		return uniqueChain;
	}

	// Handle error for Pokemon evolution image
	function handlePokemonImageError(event: Event, pokemonId: number) {
		const img = event.currentTarget as HTMLImageElement;
		const pokemonCard = cards.find(c => c.pokemonNumber === pokemonId);
		if (pokemonCard) {
			img.src = processCardImage(pokemonCard.image);
		} else {
			img.src = '/loading-spinner.svg';
		}

		// Add a class to prevent infinite loop if both sprite and card image fail
		if (img.classList.contains('fallback-attempted')) {
			img.src = '/loading-spinner.svg';
			img.onerror = null; // Prevent further error handling
		} else {
			img.classList.add('fallback-attempted');
		}
	}

	// Helper function to get the image source for a Pokémon
	function getPokemonImageSrc(pokemonId: number): string {
		// Always try the official artwork first
		const officialArtworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
		return officialArtworkUrl; // Will trigger onError if it fails
	}

	$: currentPokemon = pokemons.find(p => p.id === card.pokemonNumber);
	$: uniqueChain = buildEvolutionChain(card);
</script>

{#if uniqueChain.length > 1}
	<div class="evolution-chain mb-4 flex items-center justify-center gap-4 max-w-full overflow-x-auto px-4 py-2">
		{#each uniqueChain as pokemon, i}
			<div class="evolution-item flex flex-col items-center">
				<a
					href={`/card/${pokemon.id}/`}
					class="evolution-image-wrapper relative"
					class:current={pokemon.id === currentPokemon?.id}
				>
					<div class="pokemon-number text-[0.6rem] absolute -top-1 -right-1 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center z-10">
						{pokemon.id}
					</div>

					<img
						src={getPokemonImageSrc(pokemon.id)}
						alt={pokemon.name}
						class="evolution-image w-16 h-16 object-contain"
						title={pascalCase(pokemon.name)}
						on:error={(e) => handlePokemonImageError(e, pokemon.id)}
						data-pokemon-id={pokemon.id}
					/>

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
		background-color: rgba(35, 35, 35, 0.75);
		border-color: #f3d02c;
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
		background-color: rgba(243, 208, 44, 0.2);
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
		box-shadow: 0 0 8px #f3d02c;
	}

	.evolution-arrow {
		color: #f3d02c;
	}

	.pokemon-number {
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
		font-weight: bold;
		border: 1px solid #f3d02c;
	}
</style>
