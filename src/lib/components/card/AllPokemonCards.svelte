<script lang="ts">
	import type {FullCard, Pokemon, Set} from '$lib/types';
	import CardImage from '@components/card/CardImage.svelte';
	import {fade} from 'svelte/transition';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import ArrowUp from 'lucide-svelte/icons/arrow-up';

	export let cards: FullCard[];
	export let pokemons: Pokemon[];
	export let sets: Set[];
	export let currentPokemonId: number;
	export let onCardSelect: (card: FullCard) => void;

	let localSortBy = 'sort-set';
	let localSortOrder = 'asc';

	function getPokemon(pokemonNumber: number | undefined): Pokemon | undefined {
		return pokemons.find(p => p.id === pokemonNumber);
	}

	function getSet(setName: string): Set | undefined {
		return sets.find(s => s.name === setName);
	}

	// Sort the filtered cards based on the current sort settings
	function sortCards(cardsToSort: FullCard[], sortType: string, order: string) {
		if (!cardsToSort.length) return [];

		let sorted = [...cardsToSort];

		switch (sortType) {
			case 'sort-price':
				sorted = sorted.sort((a, b) => {
					const priceA = a.price;
					const priceB = b.price;
					return order === 'asc' ? priceA - priceB : priceB - priceA;
				});
				break;
			case 'sort-rarity':
				sorted = sorted.sort((a, b) => {
					return order === 'asc' ? a.rarity.localeCompare(b.rarity) : b.rarity.localeCompare(a.rarity);
				});
				break;
			case 'sort-artist':
				sorted = sorted.sort((a, b) => {
					const artistA = a.artist || '';
					const artistB = b.artist || '';
					return order === 'asc' ? artistA.localeCompare(artistB) : artistB.localeCompare(artistA);
				});
				break;
			case 'sort-date':
				sorted = sorted.sort((a, b) => {
					const aSet = getSet(a.setName);
					const bSet = getSet(b.setName);
					const aTime = aSet?.releaseDate.getTime() ?? 0;
					const bTime = bSet?.releaseDate.getTime() ?? 0;
					return order === 'asc' ? aTime - bTime : bTime - aTime;
				});
				break;
			default: // sort-set (default)
				sorted = sorted.sort((a, b) => {
					return order === 'asc' ? a.setName.localeCompare(b.setName) : b.setName.localeCompare(a.setName);
				});
				break;
		}

		return sorted;
	}

	// Toggle sort order
	function toggleSortOrder() {
		localSortOrder = localSortOrder === 'asc' ? 'desc' : 'asc';
	}

	// Filter the cards by current Pokémon
	$: filteredCards = [...cards].filter(card => card.pokemonNumber === currentPokemonId);

	// Sort the filtered cards based on the current sort settings
	$: sortedCards = sortCards(filteredCards, localSortBy, localSortOrder);

	// Get the first Pokémon for the title display
	$: firstPokemon = getPokemon(sortedCards[0]?.pokemonNumber);
</script>

<div class="bg-gray-800/40 border-gold-400 border-2 rounded-2xl p-6 mt-8 w-full">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-xl font-bold text-gold-400">
			All {firstPokemon ? firstPokemon.name.charAt(0).toUpperCase() + firstPokemon.name.slice(1) : ''} Cards
			<span class="font-medium text-lg ml-1">({sortedCards.length})</span>
		</h2>

		<div class="flex items-center gap-4">
			<div class="form-element-container">
				<button
					class="sort-order-btn fill-white !w-8 flex justify-center items-center hover:fill-black {localSortOrder !== 'asc' ? 'sort-active' : ''}"
					on:click={toggleSortOrder}
				>
					<ArrowUp class={localSortOrder === 'asc' ? 'rotate-180' : ''} size={16} />
				</button>
			</div>

			<div class="form-element-container">
				<select
					bind:value={localSortBy}
					class="filter {localSortBy !== 'sort-set' ? 'filter-active' : ''}"
					id="sort"
					name="sort"
				>
					<option value="sort-set">Set Name</option>
					<option value="sort-date">Release Date</option>
					<option value="sort-price">Price</option>
					<option value="sort-rarity">Rarity</option>
					<option value="sort-artist">Artist</option>
				</select>
			</div>
		</div>
	</div>

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

<style>
	.form-element-container {
		height: 42px;
		display: flex;
		align-items: center;
	}

	select:hover {
		cursor: pointer;
	}

	select {
		background: transparent;
		border: 3px solid #FFF;
		border-radius: 4px;
		box-sizing: border-box;
		color: white;
		font-family: "Clash Display", serif;
		font-weight: 500;
		height: 2.2rem;
		line-height: 1.4rem;
		padding: 0.2rem 0.4rem;
		width: 10rem;
		transition: border-color 0.2s ease, color 0.2s ease;
		font-size: 0.85rem;
	}

	.filter-active {
		border-color: #FFB700;
		color: #FFB700;
	}

	.sort-active {
		fill: #FFB700;
	}

	select option {
		background-color: black;
		color: white;
		font-size: 0.85rem;
		padding: 8px;
	}

	.sort-order-btn {
		background-color: transparent;
		background-image: linear-gradient(to right, #FFF, #FFF);
		background-position: 0 100%;
		background-repeat: no-repeat;
		background-size: 100% 0;
		border: 3px solid #FFF;
		border-radius: 4px;
		box-sizing: border-box;
		color: white;
		font-weight: 500;
		height: 2.2rem;
		line-height: 1.4rem;
		padding: 0.2rem 0.4rem;
		transition: background-size 0.4s cubic-bezier(0.22, 1, 0.36, 1), color 0.4s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.2s ease;
		width: 2.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.sort-order-btn:hover {
		background-size: 100% 100%;
		background-image: linear-gradient(to right, #FFB700, #FFB700);
		color: #000;
		cursor: pointer;
		font-weight: 500;
		border-color: #FFB700;
	}

	@media (max-width: 1024px) {
		.form-element-container {
			height: 36px;
		}

		select, .sort-order-btn {
			border-width: 2px;
			font-size: 0.75rem;
			height: 2rem;
		}

		select {
			width: 8rem;
		}
	}

	@media (max-width: 420px) {
		.form-element-container {
			height: 32px;
		}

		select, .sort-order-btn {
			font-size: 0.7rem;
			height: 1.8rem;
			line-height: normal;
			padding: 0.1rem 0.2rem;
		}

		select {
			width: 7rem;
		}
	}
</style>
