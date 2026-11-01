<script lang="ts">
	import "#src/styles/colors.css";
	import { filters } from "#stores/filters.svelte.ts";
	import CardComponent from "#components/list/Card.svelte";
	import Filters from "#components/list/Filters.svelte";
	import VirtualGrid from "#components/list/VirtualGrid.svelte";
	import PageTitle from "#components/PageTitle.svelte";
	import SetLogo from "#components/SetLogo.svelte";
	import ScrollProgress from "#components/list/ScrollProgress.svelte";
	import TextInput from "#lib/components/filters/TextInput.svelte";
	import { onMount } from "svelte";
	import type { FullCard, Set, GridPokemon } from "#lib/types.js";
	import { fade, fly } from "svelte/transition";
	import XIcon from "@lucide/svelte/icons/x";
	import SlidersHorizontalIcon from "@lucide/svelte/icons/sliders-horizontal";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import Button from "#lib/components/filters/Button.svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { filterCards, getCardDimensions, keepMostExpensivePerGroup, sortBySupertype, sortCards } from "#helpers/card-grid.ts";
	import { cardSize } from "#stores/grid.svelte.ts";
	import SizeSlider from "#lib/components/filters/SizeSlider.svelte";

	interface Props {
		cards: FullCard[];
		sets: Set[];
		pokemons: GridPokemon[];
		rarities: string[];
		types: string[];
		artists?: string[];
		/** A caveat about the catalogue (an incomplete one), shown next to the counts. */
		note?: string;
		pageTitle?: string | null;
		selectedSetName?: string | null;
		selectedArtistName?: string | null;
		lowRes?: boolean;
	}

	let {
		cards,
		sets,
		pokemons,
		rarities,
		types,
		artists = [],
		note,
		pageTitle,
		selectedSetName = null,
		selectedArtistName = null,
		lowRes = true
	}: Props = $props();

	let clientWidth: number = $state(0);
	let showFilters = $state(false);
	let searchName = $derived(filters.name);
	/** Cards above the fold skip lazy loading so the LCP candidate is requested with the document, not after layout. */
	const eagerCards = 12;

	/** Fixed height of the info container in Card.svelte, added to the card height to get the virtual grid's row size. */
	const infoContainerHeight = 70;

	/** A link into the grid names the filters it wants, so the URL wins over what the visitor last picked. */
	onMount(() => {
		filters.clearUnknown(sets, artists);
		filters.applyFromUrl(page.url, sets);
	});

	function setFilterName(value: string) {
		filters.name = value;

		const url = new URL(page.url.href);
		if (value) {
			url.searchParams.set('name', value);
		} else {
			url.searchParams.delete('name');
		}

		const activeElement = document.activeElement as HTMLElement;
		const activeElementId = activeElement?.id;

		goto(url.toString(), { replace: true }).then(() => {
			if (activeElementId !== 'name') return;
			const inputElement = document.getElementById('name') as HTMLInputElement | null;
			if (!inputElement) return;
			inputElement.focus();
			if (typeof inputElement.selectionStart === 'number') {
				const len = inputElement.value.length;
				inputElement.setSelectionRange(len, len);
			}
		});
	}

	/** Clears the filters, the search box and every filter parameter, keeping only the `user` the page was opened for. */
	function localResetFilters() {
		filters.reset();
		searchName = "";

		const url = new URL(page.url.href);
		const userParam = url.searchParams.get('user');
		url.search = '';
		if (userParam) url.searchParams.set('user', userParam);

		goto(url.toString(), { replace: true });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape" && showFilters) {
			showFilters = false;
		}
	}
	const cardDimensions = $derived(getCardDimensions(cardSize.current, clientWidth));
	const selectedSet = $derived(selectedSetName ? sets.find(set => set.name === selectedSetName) : undefined);

	const pokemonMap = $derived(new Map(pokemons.map(pokemon => [pokemon.id, pokemon])));

	/**
	 * Filter first, then narrow, then sort. "Most Expensive Only" must run after the set filter: run before it, it picks the
	 * priciest printing of each Pokémon across the whole catalogue, and Base Set shows the 4 Pokémon whose best card lives
	 * there instead of its 69. Sorting last also means a picked set sorts ~100 cards rather than all 23546.
	 */
	const matchingCards = $derived(filters.hasActive ? filterCards(cards, filters.active) : cards);
	const narrowedCards = $derived(filters.mostExpensiveOnly ? keepMostExpensivePerGroup(matchingCards) : matchingCards);
	const sortedCards = $derived(sortCards(narrowedCards, filters.sortBy, filters.sortOrder, pokemons, sets));
	/** Pokémon, then Trainer, then Energy, unless the user already looks at a single supertype. */
	const filteredCards = $derived(filters.supertype === "all" ? sortBySupertype(sortedCards) : sortedCards);

	const visibleCardsCount = $derived(filteredCards.length);
	/** 66 Pokémon cards have no dex id, and without the `pokemonNumber` guard they would collapse into one extra entry in the count. */
	const uniquePokemonCount = $derived(new Set(
		filteredCards.filter(card => card.supertype === "Pokémon" && card.pokemonNumber != null).map(card => card.pokemonNumber),
	).size);

</script>

<svelte:window bind:innerWidth={clientWidth} onkeydown={handleKeydown} />
<svelte:body style:overflow={showFilters ? "hidden" : "auto"} />

{#if showFilters}
	<div
		aria-hidden={!showFilters}
		class="filter-overlay fixed inset-0 z-50 bg-black/70 transition-all duration-300"
		transition:fade={{ duration: 200 }}
		onclick={() => (showFilters = false)}
		onkeydown={handleKeydown}
	></div>
	<div
		class="fixed top-0 h-screen w-full md:w-112.5 bg-gray-800 z-60 shadow-lg flex flex-col {showFilters
			? 'right-0'
			: '-right-95'} transition-all duration-300 z-50"
		transition:fly={{ x: 380, duration: 300 }}
	>
		<div
			class="flex justify-between items-center p-4 border-b border-white/10"
		>
			<h2 class="m-0 text-xl font-semibold text-gold-400">Filters</h2>
			<button
				class="focus-ring bg-transparent border-none text-white p-1 rounded-sm hover:bg-white/10 transition-colors flex items-center justify-center"
				onclick={() => (showFilters = false)}
				aria-label="Close filters"
				title="Close filters"
			>
				<XIcon size={20} />
			</button>
		</div>
		<div class="flex-1 overflow-y-auto p-6 pointer-events-auto">
			<Filters {rarities} {sets} {types} {artists} />
		</div>
	</div>
{/if}

<div class="flex min-h-0 flex-1 flex-col">
	<div class="flex flex-col items-center justify-between gap-1 px-4 pb-2 md:flex-row md:gap-0 lg:px-10">
		<div class="flex flex-col items-center md:flex-row">
			{#if pageTitle}
				<PageTitle title={pageTitle} />
			{/if}

			<span class={['text-xs text-gray-400 tabular-nums md:text-sm', pageTitle && 'mt-1 md:mt-0 md:ml-3']}>
				<span class="text-gold-400">{visibleCardsCount}</span> cards, <span class="text-gold-400">{uniquePokemonCount}</span> Pokémon
			</span>
			{#if note}
				<span class="text-xs text-gold-300 max-md:text-center md:ml-6">{note}</span>
			{/if}
			{#if selectedSetName || selectedArtistName}
				<div class="flex flex-wrap gap-2 items-center ml-3">
					{#if selectedSetName}
						{#if selectedSet}
							<SetLogo class="h-6 w-auto max-w-24 object-contain" set={selectedSet} />
						{/if}
						<span class="px-2 py-0.5 rounded-lg bg-gold-200 text-black font-normal text-xs">Set: {selectedSetName}</span>
					{/if}
					{#if selectedArtistName}
						<span class="px-2 py-0.5 rounded-lg bg-gold-200 text-black font-normal text-xs">Artist: {selectedArtistName}</span>
					{/if}
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<div class="mr-3 ml-1 hidden md:block">
				<SizeSlider />
			</div>

			<div class="w-48 hidden md:block">
				<TextInput
					id="name"
					label="Name"
					labelClass="sr-only"
					bind:value={searchName}
					placeholder="Search by name..."
					debounceFunction={setFilterName}
				/>
			</div>
			<div class="relative">
				<Button
					onClick={() => (showFilters = true)}
					isActive={filters.count > 0}
					class="px-4"
					title={filters.count > 0 ? `Open filters (${filters.count} active)` : 'Open filters'}
				>
					<SlidersHorizontalIcon size={16} /> Filters
				</Button>
				{#if filters.count > 0}
					<span
						class="absolute -bottom-1 -right-1 bg-gold-400 text-black text-xs font-bold flex items-center justify-center size-5 rounded-full pointer-events-none z-20"
						in:fade={{ delay: 400, duration: 200 }}
					>
						{filters.count}
					</span>
				{/if}
			</div>

			<Button
				onClick={localResetFilters}
				disabled={filters.count === 0}
				class="p-1.5"
				title="Reset every filter and the sort order"
			>
				<RotateCcwIcon size={16} />
			</Button>
		</div>
	</div>

	<div class="w-full">
		<ScrollProgress />
	</div>

	<div class="relative flex flex-1 flex-col">
		<VirtualGrid
			gapX={cardDimensions.gapX}
			gapY={cardDimensions.gapY}
			itemHeight={cardDimensions.height + infoContainerHeight}
			itemWidth={cardDimensions.width}
			forcedItemsPerRow={cardDimensions.cardsPerRow}
			items={filteredCards}
			marginTop={clientWidth ? 20 : 50}
		>
			{#snippet children({ item, index })}
				<CardComponent
					card={item}
					customHeight={cardDimensions.height}
					customWidth={cardDimensions.width}
					eager={index < eagerCards}
					{lowRes}
					{pokemonMap}
					{sets}
				/>
			{/snippet}
			{#snippet empty()}
				<p class="text-white text-center mt-32 text-2xl">No cards found</p>
			{/snippet}
		</VirtualGrid>
	</div>
</div>
