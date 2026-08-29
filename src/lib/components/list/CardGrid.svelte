<script lang="ts">
	import "~/styles/colors.css";
	import { filters } from "$stores/filters.svelte";
	import CardComponent from "@components/list/Card.svelte";
	import Filters from "@components/list/Filters.svelte";
	import VirtualGrid from "@components/list/VirtualGrid.svelte";
	import PageTitle from "@components/PageTitle.svelte";
	import ScrollProgress from "@components/list/ScrollProgress.svelte";
	import TextInput from "$lib/components/filters/TextInput.svelte";
	import { onMount } from "svelte";
	import type { FullCard, Set, Pokemon, PriceData } from "$lib/types";
	import { fade, fly } from "svelte/transition";
	import XIcon from "@lucide/svelte/icons/x";
	import SlidersHorizontalIcon from "@lucide/svelte/icons/sliders-horizontal";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import Button from "$lib/components/filters/Button.svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { filterCards, getCardDimensions, keepMostExpensivePerGroup, sortBySupertype, sortCards } from "$helpers/card-grid";
	import Loader from "$lib/components/Loader.svelte";
	import { cardSize } from "$stores/grid.svelte";
	import SizeSlider from "$lib/components/filters/SizeSlider.svelte";

	interface Props {
		cards: FullCard[];
		sets: Set[];
		pokemons: Pokemon[];
		prices: Record<string, PriceData>;
		rarities: string[];
		types: string[];
		artists?: string[];
		pageTitle?: string | null;
		disableLoader?: boolean;
		selectedSetName?: string | null;
		selectedArtistName?: string | null;
		lowRes?: boolean;
	}

	let {
		cards,
		sets,
		pokemons,
		prices,
		rarities,
		types,
		artists = [],
		pageTitle = "Card List",
		disableLoader = false,
		selectedSetName = null,
		selectedArtistName = null,
		lowRes = true
	}: Props = $props();

	let clientWidth: number = $state(0);
	let showFilters = $state(false);
	let searchName = $state("");
	let showLoader = $state(true);
	/** Cards above the fold skip lazy loading so the LCP candidate is requested with the document, not after layout. */
	const eagerCards = 12;

	// Fixed height for the info container in Card.svelte
	const infoContainerHeight = 70;

	// A link into the grid names the filters it wants, so the URL wins over whatever the visitor last picked.
	onMount(() => {
		filters.applyFromUrl(page.url, sets);
		searchName = filters.name;
	});

	function setFilterName(value: string) {
		filters.name = value;

		// Update URL with name parameter when search is used
		const url = new URL(page.url);
		if (value) {
			url.searchParams.set('name', value);
		} else {
			url.searchParams.delete('name');
		}

		// Save current active element to restore focus later
		const activeElement = document.activeElement as HTMLElement;
		const activeElementId = activeElement?.id;

		goto(url.toString(), { replaceState: true }).then(() => {
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

		const url = new URL(page.url);
		const userParam = url.searchParams.get('user');
		url.search = '';
		if (userParam) url.searchParams.set('user', userParam);

		goto(url.toString(), { replaceState: true });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape" && showFilters) {
			showFilters = false;
		}
	}
	const cardDimensions = $derived(getCardDimensions(cardSize.current, clientWidth));

	const pokemonMap = $derived(new Map(pokemons.map(pokemon => [pokemon.id, pokemon])));

	// The filter holds the set *name*, so the set is looked up by name; `findSetByCardCode` parsed it as a card code,
	// found no `_` separators and always returned undefined, leaving the set branch of `isVisible` unreachable.
	const selectedSet = $derived(filters.set !== "all"
		? (sets.find(set => set.name.toLowerCase() === filters.set) ?? null)
		: null);

	// Filter first, then narrow, then sort: "Most Expensive Only" used to pick the priciest printing of each Pokémon
	// across the whole catalogue before the set filter ran, so Base Set showed the 4 Pokémon whose best card happens to
	// live there instead of its 69. Sorting last also means a picked set sorts ~100 cards rather than all 23546.
	const matchingCards = $derived(filters.hasActive ? filterCards(cards, sets, selectedSet, filters.active) : cards);
	const narrowedCards = $derived(filters.mostExpensiveOnly ? keepMostExpensivePerGroup(matchingCards, prices) : matchingCards);
	const sortedCards = $derived(sortCards(narrowedCards, filters.sortBy, filters.sortOrder, prices, pokemons, sets));
	// Pokémon before Trainer before Energy, unless the user is already looking at a single supertype.
	const filteredCards = $derived(filters.supertype === "all" ? sortBySupertype(sortedCards) : sortedCards);

	const visibleCardsCount = $derived(filteredCards.length);
	// 66 Pokémon cards carry no dex id; without the guard they all collapse into one extra entry in the count.
	const uniquePokemonCount = $derived(new Set(
		filteredCards.filter(card => card.supertype === "Pokémon" && card.pokemonNumber != null).map(card => card.pokemonNumber),
	).size);

</script>

<svelte:window bind:innerWidth={clientWidth} onkeydown={handleKeydown} />
<svelte:body style:overflow={showFilters ? "hidden" : "auto"} />

{#if showFilters}
	<!-- Overlay -->
	<div
		aria-hidden={!showFilters}
		class="filter-overlay fixed inset-0 z-50 bg-black/70 transition-all duration-300"
		transition:fade={{ duration: 200 }}
		onclick={() => (showFilters = false)}
		onkeydown={handleKeydown}
	></div>
	<!-- Drawer -->
	<div
		class="fixed top-0 h-screen w-full md:w-112.5 bg-gray-800 z-60 shadow-lg flex flex-col {showFilters
			? 'right-0'
			: '-right-95'} transition-all duration-300 z-50"
		transition:fly={{ x: 380, duration: 300 }}
	>
		<div
			class="flex justify-between items-center p-4 border-b border-white/10"
		>
			<h2 class="m-0 text-xl text-[#FFB700] font-semibold">Filters</h2>
			<button
				class="bg-transparent border-none text-white p-1 rounded-sm hover:bg-white/10 transition-colors flex items-center justify-center"
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

<div class="min-h-[calc(100svh-100px)] flex flex-col">
	<!-- Header Row -->
	<div class="flex flex-col md:flex-row justify-between items-center pb-3 px-4 lg:px-10 gap-1 md:gap-0 mb-0">
		<!-- Left Side (Title conditional based on prop, Counts always present) -->
		<div class="flex flex-col md:flex-row items-center md:ml-14">
			{#if pageTitle}
				<PageTitle title={pageTitle} />
			{/if}

			<!-- Counts (on same line for desktop, below for mobile) -->
			<span class="text-gold-400 text-xs md:text-sm mt-1 md:mt-0 md:ml-3">
				({uniquePokemonCount} Pokémon, {visibleCardsCount} cards)
			</span>
			{#if selectedSetName || selectedArtistName}
				<div class="flex flex-wrap gap-2 items-center ml-3">
					{#if selectedSetName}
						<span class="px-2 py-0.5 rounded-lg bg-gold-200 text-white font-normal text-xs">Set: {selectedSetName}</span>
					{/if}
					{#if selectedArtistName}
						<span class="px-2 py-0.5 rounded-lg bg-gold-200 text-white font-normal text-xs">Artist: {selectedArtistName}</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Right Side (Controls) -->
		<div class="flex items-end gap-2">
			<!-- Grid Size Slider -->
			<div class="mr-3 ml-1 hidden md:block">
				<SizeSlider />
			</div>

			<!-- Name Search -->
			<div class="w-48 hidden md:block">
				<TextInput
					id="name"
					label="Name"
					bind:value={searchName}
					placeholder="Search by name..."
					debounceFunction={setFilterName}
				/>
			</div>
			<!-- Filters Button (Always Visible) -->
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
						class="absolute -bottom-1 -right-1 bg-[#FFB700] text-black text-xs font-bold flex items-center justify-center w-5 h-5 rounded-full pointer-events-none z-20"
						in:fade={{ delay: 400, duration: 200 }}
					>
						{filters.count}
					</span>
				{/if}
			</div>

			<!-- Reset Button (Should be always visible) -->
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
		{#if showLoader && !disableLoader}
			<div class="absolute inset-x-0 top-16 z-10 flex justify-center">
				<Loader message="Loading cards..." />
			</div>
		{/if}

		<VirtualGrid
			gapX={cardDimensions.gapX}
			gapY={cardDimensions.gapY}
			itemHeight={cardDimensions.height + infoContainerHeight}
			itemWidth={cardDimensions.width}
			forcedItemsPerRow={cardDimensions.cardsPerRow}
			items={filteredCards}
			marginTop={clientWidth ? 20 : 50}
			onready={() => (showLoader = false)}
		>
			{#snippet children({ item, index })}
				<CardComponent
					card={item}
					customHeight={cardDimensions.height}
					customWidth={cardDimensions.width}
					eager={index < eagerCards}
					{lowRes}
					{pokemonMap}
					prices={prices[item.cardCode]}
					{sets}
				/>
			{/snippet}
			{#snippet empty()}
				<p class="text-white text-center mt-32 text-2xl">No cards found</p>
			{/snippet}
		</VirtualGrid>
	</div>
</div>
