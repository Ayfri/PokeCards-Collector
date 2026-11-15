<script lang="ts">
	import type {Card, CardPageSet, Pokemon, PriceData} from '#lib/types.js';
	import CardImage from '#components/card/CardImage.svelte';
	import CardmarketLogo from '#components/card/CardmarketLogo.svelte';
	import CollectionControls from '#components/card/CollectionControls.svelte';
	import {fade} from 'svelte/transition';
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { persistedRecord } from '#stores/persisted.svelte.ts';
	import SortControl from '#components/filters/SortControl.svelte';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import { cardGroupName, cardPath, cardPrice, pokemonsById, setsById } from '#helpers/card-utils.ts';
	import { formatEuros } from '#helpers/format.ts';
	import { compareRarities } from '#helpers/rarity.ts';
	import SetBadge from '#components/SetBadge.svelte';
	import { page } from '$app/state';
	import { catalogueOfPath } from '#helpers/catalogues.ts';
	import { onMount } from 'svelte';

	interface Props {
		cards: Card[];
		lowRes?: boolean;
		onCardSelect: (card: Card) => void;
		pokemon?: Pokemon | undefined;
		/** Looked up when a card is a Pokémon card. */
		pokemons: Pokemon[];
		prices: Record<string, PriceData>;
		sets: CardPageSet[];
	}

	let {
		cards,
		lowRes = false,
		onCardSelect,
		pokemon,
		pokemons,
		prices,
		sets
	}: Props = $props();

	const relatedSort = persistedRecord('related-cards-sort', { direction: 'asc' as 'asc' | 'desc', value: 'sort-set' });

	const catalogue = $derived(catalogueOfPath(page.url.pathname));

	/** Hundreds of tiles block the main thread, so they replace same-sized placeholders once the card intro has played. */
	let showTiles = $state(false);
	onMount(() => {
		const timeout = setTimeout(() => showTiles = true, 800);
		return () => clearTimeout(timeout);
	});

	const pokemonIndex = $derived(pokemonsById(pokemons));
	const setIndex = $derived(setsById(sets));

	/**
	 * The grid's `sortCards` does not fit here: it reads `card.price`, which only a grid payload carries, and sets keyed by language,
	 * while a card page ships a price record and the sets of one language. Rarity sorts by tier like the grid, most common first.
	 */
	const compare = $derived.by((): (a: Card, b: Card) => number => {
		const price = (card: Card) => cardPrice(prices[card.cardCode]) ?? 0;
		const released = (card: Card) => setIndex.get(card.setId)?.releaseDate.getTime() ?? 0;
		const setName = (card: Card) => setIndex.get(card.setId)?.name ?? '';

		switch (relatedSort.value) {
			case 'sort-artist': return (a, b) => a.artist.localeCompare(b.artist);
			case 'sort-date': return (a, b) => released(a) - released(b);
			case 'sort-price': return (a, b) => price(a) - price(b);
			case 'sort-rarity': return (a, b) => compareRarities(a.rarity, b.rarity);
			/** `sort-set` is the default sort. */
			default: return (a, b) => setName(a).localeCompare(setName(b));
		}
	});

	const sortedCards = $derived(cards.toSorted(relatedSort.direction === 'asc' ? compare : (a, b) => compare(b, a)));

	const titleName = $derived(pokemon
		? pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)
		: (cardGroupName(sortedCards[0]?.name ?? '') || 'Related'));

	function selectCard(card: Card, event: MouseEvent) {
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		onCardSelect(card);
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
				icon={ArrowUpDownIcon}
				options={[
					{ label: 'Set Name', value: 'sort-set' },
					{ label: 'Release Date', value: 'sort-date' },
					{ label: 'Price', value: 'sort-price' },
					{ label: 'Rarity', value: 'sort-rarity' },
					{ label: 'Artist', value: 'sort-artist' }
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
					{@const setName = setIndex.get(card.setId)?.name ?? card.setName}
					{@const price = cardPrice(prices[card.cardCode])}
					<a class="flex flex-col items-center text-sm" href={cardPath(catalogue.language, card)} title="{card.name} - {setName}">
						<div class="w-full animate-pulse rounded-lg bg-gray-700/50" style="aspect-ratio: 63/88;"></div>
						<span class="mt-0.5 flex h-5 items-center font-bold">{setName}</span>
						<span class="flex h-5 items-center">{price ? formatEuros(price) : 'Priceless'}</span>
					</a>
				{/each}
			{:else}
			{#each sortedCards as card (card.cardCode)}
				{@const cardPokemon = pokemonIndex.get(card.pokemonNumber ?? 0)}
				{@const cardSet = setIndex.get(card.setId)}
				{@const price = cardPrice(prices[card.cardCode])}
				{@const path = cardPath(catalogue.language, card)}
				<div
					class="relative flex flex-col items-center transition-transform duration-300 hover:-translate-y-1"
					data-card-path={path}
					transition:fade={{ duration: 200 }}
				>
					<!-- Stretched link: covers the whole tile so the nested controls stay valid HTML. A plain click swaps the card in place,
					     a modified one opens the print's own page like any link. It does not wrap the image, so `data-card-path` names the tile's card for the swap. -->
					<a
						aria-label={`View details for ${card.name} from ${cardSet?.name || 'unknown set'}`}
						class="absolute inset-0 z-2 cursor-pointer"
						href={path}
						onclick={(event) => selectCard(card, event)}
						title={`View details for ${card.name} from ${cardSet?.name || 'unknown set'}`}
					></a>
					<div class="relative rounded-lg overflow-hidden shadow-lg w-full" style="aspect-ratio: 63/88;">
						{#if !NO_IMAGES}
							<CardImage
								alt="{cardPokemon ? cardPokemon.name : card.name} - {cardSet?.name ?? card.setName}"
								{card}
								class="card-image"
								imageUrl={card.image}
								lazy={true}
								lowRes={lowRes}
								set={cardSet}
								types={card.types}
							/>
						{:else}
							<div class="w-full h-full"></div>
						{/if}
						{#if cardSet}
							<SetBadge class="bottom-2 left-2" set={cardSet} />
						{/if}
						<CollectionControls cardCode={card.cardCode} class="bottom-2 right-2" />
					</div>
					<div class="mt-0.5 w-full text-center flex flex-col">
						<h3 class="text-center font-bold text-sm">{cardSet?.name || 'Unknown Set'}</h3>
						<div class="flex items-center justify-center">
							{#if card.cardMarketUrl && price}
								<a
									aria-label="View on Cardmarket"
									class="relative z-10 hover:text-gold-300 transition-colors duration-200 text-center"
									href={card.cardMarketUrl}
									rel="noopener noreferrer"
									target="_blank"
									title="Open this card on Cardmarket (new tab)"
								>
									<div class="flex items-center justify-center whitespace-nowrap">
										<span class="text-sm">
											{formatEuros(price)}
										</span>
										<span class="mx-1 text-sm">-</span>
										<span class="text-gold-400 font-bold underline text-sm flex items-center">
											<CardmarketLogo class="mr-1 shrink-0" size={12} />
											Cardmarket
											<ExternalLink class="ml-1" size={10} />
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
