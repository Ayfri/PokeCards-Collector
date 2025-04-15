<script lang="ts">
	import type {FullCard, Pokemon, Set} from '$lib/types';
	import CardImage from '@components/card/CardImage.svelte';
	import {fade} from 'svelte/transition';
	import ExternalLink from 'lucide-svelte/icons/external-link';

	export let cards: FullCard[];
	export let pokemons: Pokemon[];
	export let sets: Set[];
	export let currentPokemonId: number;
	export let onCardSelect: (card: FullCard) => void;

	function getPokemon(pokemonNumber: number | undefined): Pokemon | undefined {
		return pokemons.find(p => p.id === pokemonNumber);
	}

	function getSet(setName: string): Set | undefined {
		return sets.find(s => s.name === setName);
	}

	// Sort cards by set name for a consistent display
	$: sortedCards = [...cards].filter(card => card.pokemonNumber === currentPokemonId).sort((a, b) => a.setName.localeCompare(b.setName));
	$: firstPokemon = getPokemon(sortedCards[0].pokemonNumber);
</script>

<div class="bg-gray-800/40 border-gold-400 border-2 rounded-2xl p-6 mt-8 w-full">
	<h2 class="text-xl font-bold text-gold-400 mb-4">
		All {firstPokemon ? firstPokemon.name.charAt(0).toUpperCase() + firstPokemon.name.slice(1) : ''} Cards
		<span class="font-medium text-lg ml-1">({sortedCards.length})</span>
	</h2>

	<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-4">
		{#each sortedCards as card (card.image)}
			<button
				class="flex flex-col items-center transition-transform duration-200 hover:-translate-y-2.5 cursor-pointer"
				transition:fade={{ duration: 200 }}
				on:click={() => onCardSelect(card)}
			>
				<div class="relative rounded-lg overflow-hidden shadow-lg w-full" style="aspect-ratio: 63/88;">
					<CardImage
						imageUrl={card.image}
						alt={getPokemon(card.pokemonNumber)?.name}
						class="card-image"
						lazy={true}
						highRes={false}
					/>
					<div class="absolute bottom-1 right-1 bg-black/70 rounded-full p-0.5 border border-gold-400">
						<img
							src={getSet(card.setName)?.logo}
							alt={getSet(card.setName)?.name}
							class="w-[30px] h-[30px] md:w-[24px] md:h-[24px] object-contain"
							title={getSet(card.setName)?.name}
						/>
					</div>
				</div>
				<div class="mt-0.5 w-full text-center flex flex-col">
					<h2 class="text-center font-bold text-sm">{getSet(card.setName)?.name}</h2>
					<div class="flex items-center justify-center">
						{#if card.cardMarketUrl && card.cardMarketUrl.trim() !== ''}
							<a
								href={card.cardMarketUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:text-gold-300 transition-colors duration-200 text-center"
								on:click|stopPropagation
								aria-label="View on Cardmarket"
							>
								<div class="flex items-center justify-center whitespace-nowrap">
									<span class="text-sm">{card.price ? `${card.price} $` : 'Priceless'}</span>
									<span class="mx-1 text-sm">-</span>
									<span class="text-gold-400 font-bold underline text-sm flex items-center">
										Cardmarket
										<ExternalLink size={10} class="ml-1" />
									</span>
								</div>
							</a>
						{:else}
							<div>{card.price ? `${card.price} $` : 'Priceless'}</div>
						{/if}
					</div>
				</div>
			</button>
		{/each}
	</div>
</div>
