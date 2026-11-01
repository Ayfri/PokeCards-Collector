<script lang="ts">
	import type {FullCard, Pokemon, PriceData, Set} from '#lib/types.js';
	import CardImage from '#components/card/CardImage.svelte';
	import {fade} from 'svelte/transition';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { persistedRecord } from '#stores/persisted.svelte.ts';
	import SortControl from '#components/filters/SortControl.svelte';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import { cardGroupName, cardPath, cardPrice } from '#helpers/card-utils.ts';
	import { formatEuros } from '#helpers/format.ts';
	import { addCardToCollection, removeCardFromCollection } from '#lib/services/collections.ts';
	import { addCardToWishlist, removeCardFromWishlist } from '#lib/services/wishlists.ts';
	import { collection } from '#stores/collection.svelte.ts';
	import Heart from '@lucide/svelte/icons/heart';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import SetBadge from '#components/SetBadge.svelte';
	import { page } from '$app/state';
	import { catalogueOfPath } from '#helpers/catalogues.ts';
	import { wishlist } from '#stores/wishlist.svelte.ts';
	import { onMount } from 'svelte';

	
	interface Props {
		cards: FullCard[];
		/** Looked up when a card is a Pokémon card. */
		pokemons: Pokemon[];
		prices: Record<string, PriceData>;
		sets: Set[];
		pokemon?: Pokemon | undefined;
		onCardSelect: (card: FullCard) => void;
		lowRes?: boolean;
	}

	let {
		cards,
		pokemons,
		prices,
		sets,
		pokemon = undefined,
		onCardSelect,
		lowRes = false
	}: Props = $props();

	const relatedSort = persistedRecord('related-cards-sort', { direction: 'asc' as 'asc' | 'desc', value: 'sort-set' });

	const catalogue = $derived(catalogueOfPath(page.url.pathname));
	const user = $derived(page.data.user);
	const profile = $derived(page.data.profile);

	const MAX_CARD_QUANTITY = 99;

	/** Hundreds of tiles block the main thread, so they replace same-sized placeholders once the card intro has played. */
	let showTiles = $state(false);
	onMount(() => {
		const timeout = setTimeout(() => showTiles = true, 800);
		return () => clearTimeout(timeout);
	});

	/** Built once per `sets`, so the sort comparators do a map lookup instead of scanning every set twice per comparison. */
	const setsById = $derived(new Map(sets.map(set => [set.setId, set])));

	function getPokemon(pokemonNumber: number | undefined): Pokemon | undefined {
		if (!pokemonNumber) return undefined;
		return pokemons.find(p => p.id === pokemonNumber);
	}

	function sortCards(cardsToSort: FullCard[], sortType: string, order: string) {
		if (!cardsToSort?.length) return [];

		let sorted = [...cardsToSort];

		switch (sortType) {
			case 'sort-price':
				sorted = sorted.sort((a, b) => {
					const priceA = cardPrice(prices[a.cardCode]) ?? 0;
					const priceB = cardPrice(prices[b.cardCode]) ?? 0;
					return order === 'asc' ? priceA - priceB : priceB - priceA;
				});
				break;
			case 'sort-rarity':
				sorted = sorted.sort((a, b) => {
					const rarityA = a.rarity ?? '';
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
					const aSet = setsById.get(a.setId);
					const bSet = setsById.get(b.setId);
					const aTime = aSet?.releaseDate?.getTime() ?? 0;
					const bTime = bSet?.releaseDate?.getTime() ?? 0;
					return order === 'asc' ? aTime - bTime : bTime - aTime;
				});
				break;
			/** `sort-set` is the default sort. */
			default:
				sorted = sorted.sort((a, b) => {
					const aSet = setsById.get(a.setId);
					const bSet = setsById.get(b.setId);
					const aName = aSet?.name ?? '';
					const bName = bSet?.name ?? '';
					return order === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
				});
				break;
		}

		return sorted;
	}

	const sortedCards = $derived(sortCards(cards, relatedSort.value, relatedSort.direction));

	const titleName = $derived(pokemon
		? pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)
		: (cardGroupName(sortedCards[0]?.name ?? '') || 'Related'));

	function selectCard(card: FullCard, event: MouseEvent) {
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		onCardSelect(card);
	}

	async function toggleWishlist(cardCode: string, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!user || !profile) return;
		if (wishlist.has(cardCode)) {
			await removeCardFromWishlist(profile.username, cardCode);
		} else {
			await addCardToWishlist(profile.username, cardCode);
		}
	}
	async function handleAddCard(cardCode: string, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!user || !profile) return;
		const count = collection.count(cardCode);
		if (count >= MAX_CARD_QUANTITY) return;
		await addCardToCollection(profile.username, cardCode);
	}
	async function handleRemoveCard(cardCode: string, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!user || !profile) return;
		const count = collection.count(cardCode);
		if (count === 0) return;
		await removeCardFromCollection(profile.username, cardCode);
	}
</script>

<div class="bg-gray-800/40 border-gold-400 border-2 rounded-2xl p-4 md:p-6 w-full">
	<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
		<h2 class="text-xl md:text-2xl font-bold text-gold-400">
			All {titleName} Cards
			<span class="font-medium text-lg ml-1">({sortedCards.length})</span>
		</h2>

		<div class="flex items-center gap-4 max-sm:w-full">
			<SortControl
				bind:sortDirection={relatedSort.direction}
				bind:sortValue={relatedSort.value}
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
			{#if !showTiles}
				<!-- The placeholders are what the server renders, so each one is a real link to its print for crawlers. They keep the
				     prop order, not the persisted sort, which only exists in the browser and would break hydration. -->
				{#each cards as card (card.cardCode)}
					{@const setName = setsById.get(card.setId)?.name ?? card.setName}
					{@const price = cardPrice(prices[card.cardCode])}
					<a class="flex flex-col items-center text-sm" href={cardPath(catalogue.language, card)} title="{card.name} - {setName}">
						<div class="w-full animate-pulse rounded-lg bg-gray-700/50" style="aspect-ratio: 63/88;"></div>
						<span class="mt-0.5 flex h-5 items-center font-bold">{setName}</span>
						<span class="flex h-5 items-center">{price ? formatEuros(price) : 'Priceless'}</span>
					</a>
				{/each}
			{:else}
			{#each sortedCards as card (card.cardCode)}
				{@const cardPokemon = getPokemon(card.pokemonNumber)}
				{@const cardSet = setsById.get(card.setId)}
				{@const price = cardPrice(prices[card.cardCode])}
				<div
					class="relative flex flex-col items-center transition-transform duration-300 hover:-translate-y-1"
					transition:fade={{ duration: 200 }}
				>
					<!-- Stretched link: covers the whole tile so the nested controls stay valid HTML. A plain click swaps the card in place,
					     a modified one opens the print's own page like any link. -->
					<a
						class="absolute inset-0 z-2 cursor-pointer"
						href={cardPath(catalogue.language, card)}
						onclick={(event) => selectCard(card, event)}
						aria-label={`View details for ${card.name} from ${cardSet?.name || 'unknown set'}`}
						title={`View details for ${card.name} from ${cardSet?.name || 'unknown set'}`}
					></a>
					<div class="relative rounded-lg overflow-hidden shadow-lg w-full" style="aspect-ratio: 63/88;">
						{#if !NO_IMAGES}
							<CardImage
								imageUrl={card.image}
								{card}
								set={cardSet}
								types={card.types}
								alt="{cardPokemon ? cardPokemon.name : card.name} - {cardSet?.name ?? card.setName}"
								class="card-image"
								lazy={true}
								lowRes={lowRes}
							/>
						{:else}
							<div class="w-full h-full"></div>
						{/if}
						{#if cardSet}
							<SetBadge class="bottom-2 left-2" set={cardSet} />
						{/if}
						{#if user && profile}
							<div class="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full bg-black/50 p-1">
								{#if collection.count(card.cardCode) > 0}
									<button
										aria-label="Remove one copy from collection"
										class="focus-ring p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
										onclick={(e) => handleRemoveCard(card.cardCode, e)}
										disabled={collection.count(card.cardCode) === 0}
										title="Remove one copy from collection"
									>
										<Minus size={16} class="text-white" />
									</button>
									<span
										class="text-sm font-semibold text-green-400 px-1 min-w-[1.5ch] text-center select-none"
										title={`You have ${collection.count(card.cardCode)} cop${collection.count(card.cardCode) > 1 ? 'ies' : 'y'}`}
									>
										{collection.count(card.cardCode)}
									</span>
								{/if}
								<button
									aria-label="Add one copy to collection"
									class="focus-ring p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
									onclick={(e) => handleAddCard(card.cardCode, e)}
									disabled={collection.count(card.cardCode) >= MAX_CARD_QUANTITY}
									title={collection.count(card.cardCode) >= MAX_CARD_QUANTITY ? `Limit (${MAX_CARD_QUANTITY}) reached` : 'Add to collection'}
								>
									<Plus size={16} class={collection.count(card.cardCode) > 0 ? 'text-green-400' : 'text-white'} />
								</button>
								<div class="w-px h-5 bg-white/30 mx-1"></div>
								<button
									aria-label={wishlist.has(card.cardCode) ? 'Remove from wishlist' : 'Add to wishlist'}
									class="focus-ring p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
									onclick={(e) => toggleWishlist(card.cardCode, e)}
									title={wishlist.has(card.cardCode) ? 'Remove from wishlist' : 'Add to wishlist'}
								>
									<Heart size={16} class={wishlist.has(card.cardCode) ? 'text-red-500 fill-red-500' : 'text-white'} />
								</button>
							</div>
						{/if}
					</div>
					<div class="mt-0.5 w-full text-center flex flex-col">
						<h3 class="text-center font-bold text-sm">{cardSet?.name || 'Unknown Set'}</h3>
						<div class="flex items-center justify-center">
							{#if card.cardMarketUrl && price}
								<a
									href={card.cardMarketUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="relative z-10 hover:text-gold-300 transition-colors duration-200 text-center"
									aria-label="View on Cardmarket"
									title="Open this card on Cardmarket (new tab)"
								>
									<div class="flex items-center justify-center whitespace-nowrap">
										<span class="text-sm">
											{formatEuros(price)}
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
									{price ? formatEuros(price) : 'Priceless'}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
			{/if}
		</div>
	{:else}
		<p class="text-center text-gray-400">No other related cards found.</p>
	{/if}
</div>
