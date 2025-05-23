<script lang="ts">
	import type {FullCard, Pokemon, PriceData, Set} from '$lib/types';
	import CardImage from '@components/card/CardImage.svelte';
	import {fade} from 'svelte/transition';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import { persistentWritable } from '$lib/stores/persistentStore';
	import SortControl from '@components/filters/SortControl.svelte';
	import { NO_IMAGES } from '$lib/images';
	import { findSetByCardCode } from '$helpers/set-utils';
	import { addCardToCollection, removeCardFromCollection } from '$lib/services/collections';
	import { addCardToWishlist, removeCardFromWishlist } from '$lib/services/wishlists';
	import { collectionStore } from '$lib/stores/collection';
	import { Heart, Minus, Plus } from 'lucide-svelte';
	import { page } from '$app/state';
	import { wishlistStore } from '$lib/stores/wishlist';

	// --- Props ---
	export let cards: FullCard[];
	export let pokemons: Pokemon[]; // Still needed for lookups if a card *is* a pokemon
	export let prices: Record<string, PriceData>;
	export let sets: Set[];
	export let pokemon: Pokemon | undefined = undefined; // Optional Pokemon context
	export let onCardSelect: (card: FullCard) => void;

	// --- Persistent Sorting State ---
	const relatedSortBy = persistentWritable('related-cards-sort-by', 'sort-set');
	const relatedSortOrder = persistentWritable<'asc' | 'desc'>('related-cards-sort-order', 'asc');

	// --- Force reactivity for stores ---
	$: _collection = $collectionStore;
	$: _wishlist = $wishlistStore;

	// --- User/Profile State ---
	$: user = page.data.user;
	$: profile = page.data.profile;

	// --- Collection/Wishlist State ---
	function getCollectionCount(cardCode: string) {
		return $collectionStore.get(cardCode) || 0;
	}
	function isInWishlist(cardCode: string) {
		return $wishlistStore.has(cardCode);
	}

	const MAX_CARD_QUANTITY = 99;

	// --- Helper Functions ---
	function getPokemon(pokemonNumber: number | undefined): Pokemon | undefined {
		if (!pokemonNumber) return undefined;
		return pokemons.find(p => p.id === pokemonNumber);
	}

	// Sort the cards based on the current sort settings
	function sortCards(cardsToSort: FullCard[], sortType: string, order: string) {
		if (!cardsToSort?.length) return [];

		let sorted = [...cardsToSort];

		switch (sortType) {
			case 'sort-price':
				sorted = sorted.sort((a, b) => {
					const priceA = prices[a.cardCode]?.simple ?? 0; // Handle null/undefined price
					const priceB = prices[b.cardCode]?.simple ?? 0;
					return order === 'asc' ? priceA - priceB : priceB - priceA;
				});
				break;
			case 'sort-rarity':
				sorted = sorted.sort((a, b) => {
					const rarityA = a.rarity ?? ''; // Handle null/undefined rarity
					const rarityB = b.rarity ?? '';
					return order === 'asc' ? rarityA.localeCompare(rarityB) : rarityB.localeCompare(rarityA);
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
					const aSet = findSetByCardCode(a.cardCode, sets);
					const bSet = findSetByCardCode(b.cardCode, sets);
					const aTime = aSet?.releaseDate?.getTime() ?? 0; // Handle null/undefined date
					const bTime = bSet?.releaseDate?.getTime() ?? 0;
					return order === 'asc' ? aTime - bTime : bTime - aTime;
				});
				break;
			default: // sort-set (default)
				sorted = sorted.sort((a, b) => {
					const aSet = findSetByCardCode(a.cardCode, sets);
					const bSet = findSetByCardCode(b.cardCode, sets);
					const aName = aSet?.name ?? '';
					const bName = bSet?.name ?? '';
					return order === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
				});
				break;
		}

		return sorted;
	}

	// Sort the cards based on the current sort settings (use the passed 'cards' directly)
	$: sortedCards = sortCards(cards, $relatedSortBy, $relatedSortOrder);

	// Determine the title based on whether a specific Pokémon context is provided
	$: titleName = pokemon
		? pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)
		: (sortedCards[0]?.name || 'Related'); // Fallback to first card name or generic term

	// --- Actions ---
	async function toggleWishlist(cardCode: string, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!user || !profile) return;
		if (isInWishlist(cardCode)) {
			await removeCardFromWishlist(profile.username, cardCode);
		} else {
			await addCardToWishlist(profile.username, cardCode);
		}
		sortedCards = [...sortedCards]; // Force re-render
	}
	async function handleAddCard(cardCode: string, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!user || !profile) return;
		const count = getCollectionCount(cardCode);
		if (count >= MAX_CARD_QUANTITY) return;
		await addCardToCollection(profile.username, cardCode);
		sortedCards = [...sortedCards]; // Force re-render
	}
	async function handleRemoveCard(cardCode: string, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!user || !profile) return;
		const count = getCollectionCount(cardCode);
		if (count === 0) return;
		await removeCardFromCollection(profile.username, cardCode);
		sortedCards = [...sortedCards]; // Force re-render
	}
</script>

<div class="bg-gray-800/40 border-gold-400 border-2 rounded-2xl p-6 w-full">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-xl font-bold text-gold-400">
			All {titleName} Cards
			<span class="font-medium text-lg ml-1">({sortedCards.length})</span>
		</h2>

		<div class="flex items-center gap-4">
			<SortControl
				bind:sortDirection={$relatedSortOrder}
				bind:sortValue={$relatedSortBy}
				options={[
					{ value: 'sort-set', label: 'Set Name' },
					{ value: 'sort-date', label: 'Release Date' },
					{ value: 'sort-price', label: 'Price' },
					{ value: 'sort-rarity', label: 'Rarity' },
					{ value: 'sort-artist', label: 'Artist' }
				]}
			/>
		</div>
	</div>

	{#if sortedCards.length > 0}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-4">
			{#each sortedCards as card (card.cardCode)}
				{@const cardPokemon = getPokemon(card.pokemonNumber)}
				{@const cardSet = findSetByCardCode(card.cardCode, sets)}
				<button
					class="flex flex-col items-center transition-transform duration-200 hover:-translate-y-2.5 cursor-pointer"
					transition:fade={{ duration: 200 }}
					on:click={() => onCardSelect(card)}
					aria-label={`View details for ${card.name} from ${cardSet?.name || 'unknown set'}`}
				>
					<div class="relative rounded-lg overflow-hidden shadow-lg w-full" style="aspect-ratio: 63/88;">
						{#if !NO_IMAGES}
							<CardImage
								imageUrl={card.image}
								alt={cardPokemon ? cardPokemon.name : card.name}
								class="card-image"
								lazy={true}
								highRes={false}
							/>
						{:else}
							<div class="w-full h-full"></div>
						{/if}
						{#if cardSet}
							<div class="absolute bottom-1 right-1 bg-black/70 rounded-full p-0.5 border border-gold-400">
								{#if !NO_IMAGES}
									<img
										src={cardSet.logo}
										alt={cardSet.name}
										class="w-[30px] h-[30px] md:w-[24px] md:h-[24px] object-contain"
										title={cardSet.name}
										loading="lazy"
									/>
								{/if}
							</div>
						{/if}
						{#if user && profile}
							<!-- Collection/Wishlist Actions -->
							<div class="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full bg-black/50 p-1">
								{#if getCollectionCount(card.cardCode) > 0}
									<button
										aria-label="Remove one copy from collection"
										class="p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
										on:click={(e) => handleRemoveCard(card.cardCode, e)}
										disabled={getCollectionCount(card.cardCode) === 0}
										title="Remove one copy from collection"
									>
										<Minus size={16} class="text-white" />
									</button>
									<span
										class="text-sm font-semibold text-green-400 px-1 min-w-[1.5ch] text-center select-none"
										title={`You have ${getCollectionCount(card.cardCode)} cop${getCollectionCount(card.cardCode) > 1 ? 'ies' : 'y'}`}
									>
										{getCollectionCount(card.cardCode)}
									</span>
								{/if}
								<button
									aria-label="Add one copy to collection"
									class="p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
									on:click={(e) => handleAddCard(card.cardCode, e)}
									disabled={getCollectionCount(card.cardCode) >= MAX_CARD_QUANTITY}
									title={getCollectionCount(card.cardCode) >= MAX_CARD_QUANTITY ? `Limit (${MAX_CARD_QUANTITY}) reached` : 'Add to collection'}
								>
									<Plus size={16} class={getCollectionCount(card.cardCode) > 0 ? 'text-green-400' : 'text-white'} />
								</button>
								<div class="w-px h-5 bg-white/30 mx-1"></div>
								<button
									aria-label={isInWishlist(card.cardCode) ? 'Remove from wishlist' : 'Add to wishlist'}
									class="p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
									on:click={(e) => toggleWishlist(card.cardCode, e)}
									title={isInWishlist(card.cardCode) ? 'Remove from wishlist' : 'Add to wishlist'}
								>
									<Heart size={16} class={isInWishlist(card.cardCode) ? 'text-red-500 fill-red-500' : 'text-white'} />
								</button>
							</div>
						{/if}
					</div>
					<div class="mt-0.5 w-full text-center flex flex-col">
						<h3 class="text-center font-bold text-sm">{cardSet?.name || 'Unknown Set'}</h3>
						<div class="flex items-center justify-center">
							{#if card.cardMarketUrl && card.cardMarketUrl.trim() !== '' && prices[card.cardCode]?.simple && prices[card.cardCode]?.simple !== 100_000}
								<a
									href={card.cardMarketUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="hover:text-gold-300 transition-colors duration-200 text-center"
									on:click|stopPropagation
									aria-label="View on Cardmarket"
								>
									<div class="flex items-center justify-center whitespace-nowrap">
										<span class="text-sm">
											{prices[card.cardCode]?.simple?.toFixed(2)} $
										</span>
										<span class="mx-1 text-sm">-</span>
										<span class="text-gold-400 font-bold underline text-sm flex items-center">
											Cardmarket
											<ExternalLink size={10} class="ml-1" />
										</span>
									</div>
								</a>
							{:else}
								<div class="text-sm">
									{prices[card.cardCode]?.simple && prices[card.cardCode]?.simple !== 100_000 ? `${prices[card.cardCode]?.simple?.toFixed(2)} $` : 'Priceless'}
								</div>
							{/if}
						</div>
					</div>
				</button>
			{/each}
		</div>
	{:else}
		<p class="text-center text-gray-400">No other related cards found.</p>
	{/if}
</div>
