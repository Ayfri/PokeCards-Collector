<script lang="ts">
	import "~/styles/colors.css";
	import {
		filterName,
		filterNumero,
		filterRarity,
		filterSet,
		filterSupertype,
		filterType,
		filterArtist,
		mostExpensiveOnly,
		sortBy,
		sortOrder,
		resetFilters,
		resetSort,
	} from "$lib/helpers/filters";
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
	import { findSetByCardCode } from "$helpers/set-utils";
	import { filterCards, keepMostExpensivePerGroup, sortCards } from "$helpers/card-grid";
	import Loader from "$lib/components/Loader.svelte";
	import { cardSize, getCardDimensions } from "$lib/stores/gridStore";
	import SizeSlider from "$lib/components/filters/SizeSlider.svelte";
	import { debounce } from '$helpers/debounce';

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
	let mounted = $state(false);
	/** Cards above the fold skip lazy loading so the LCP candidate is requested with the document, not after layout. */
	const eagerCards = 12;

	// Fixed height for the info container in Card.svelte
	const infoContainerHeight = 70;

	onMount(() => {
		// Initialize searchName from URL parameter or from store
		const nameParam = page.url.searchParams.get('name');
		if (nameParam) {
			searchName = decodeURIComponent(nameParam);
		} else {
			searchName = $filterName;
		}

		// Initialize set filter from URL parameter
		const setParam = page.url.searchParams.get('set');
		if (setParam) {
			const decodedSetName = decodeURIComponent(setParam);
			// Find the set in our list of sets - use case-insensitive comparison for matching
			const matchingSet = sets.find(set => set.name.toLowerCase() === decodedSetName.toLowerCase());
			if (matchingSet) {
				$filterSet = matchingSet.name.toLowerCase(); // Use the correct case from set options format
			} else {
				$filterSet = decodedSetName.toLowerCase(); // Ensure lowercase to match the option format
			}
		}

		mounted = true;
	});

	const debouncedSetFilterName = debounce((value: string) => {
		$filterName = value;

		// Update URL with name parameter when search is used
		const url = new URL(page.url);
		if (value) {
			url.searchParams.set('name', value);
		} else {
			url.searchParams.delete('name');
		}

		// Keep existing parameters
		const preserveParams = ['set', 'artist', 'type', 'user'];
		preserveParams.forEach(param => {
			const paramValue = page.url.searchParams.get(param);
			if (paramValue) {
				url.searchParams.set(param, paramValue);
			}
		});

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
	}, 300);

	// Local reset function to clear both store and local state
	function localResetFilters() {
		resetFilters(); // Call the imported helper to reset stores
		resetSort();
		searchName = ""; // Reset the local searchName bound to the TextInput

		// Create URL that preserves the user parameter if present
		const url = new URL(page.url);
		const userParam = url.searchParams.get('user');

		// Clear all search parameters
		url.search = '';

		// But preserve the user parameter if it exists
		if (userParam) {
			url.searchParams.set('user', userParam);
		}

		// Navigate to the cleaned URL
		goto(url.toString(), { replaceState: true });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape" && showFilters) {
			showFilters = false;
		}
	}
	// Use the store value directly; mobile logic is now in getCardDimensions
	const cardDimensions = $derived(getCardDimensions($cardSize, clientWidth));

	const pokemonMap = $derived(new Map(pokemons.map(pokemon => [pokemon.id, pokemon])));

	// Step 1: keep only the priciest card of each group when the filter is on.
	const baseCards = $derived($mostExpensiveOnly ? keepMostExpensivePerGroup(cards, prices) : cards);

	// Step 2: sort, then filter. Both are expensive, so they stay separate $derived so each only reruns on its own inputs.
	const displayedCards = $derived(sortCards(baseCards, $sortBy, $sortOrder, prices, pokemons, sets));

	// Check if any filters are actually active
	const hasActiveFilters = $derived($filterName || $filterNumero || $filterRarity !== 'all' || $filterSet !== 'all' ||
		$filterType !== 'all' || $filterSupertype !== 'all' || $filterArtist !== 'all');
	// Find the selected set based on the filter and determine the correct total count to display
	const selectedSet = $derived($filterSet && $filterSet !== "all" ? findSetByCardCode($filterSet, sets) : null);

	const filteredCards = $derived(filterCards(displayedCards, pokemons, sets, selectedSet ?? null, {
		applyFilters: Boolean(hasActiveFilters),
		groupBySupertype: $filterSupertype === "all",
	}));

	const visibleCardsCount = $derived(filteredCards.length);
	const uniquePokemonCount = $derived(new Set(
		filteredCards.filter(card => card.supertype === "Pokémon").map(card => card.pokemonNumber),
	).size);

	// Count active filters
	const activeFiltersCount = $derived([
		$filterName,
		$filterNumero,
		$filterRarity !== "all",
		$filterSet !== "all",
		$filterType !== "all",
		$filterSupertype !== "all",
		$filterArtist !== "all",
		$mostExpensiveOnly,
		$sortBy !== "sort-pokedex",
	].filter(Boolean).length);
	const displayTotalCards = $derived(selectedSet
		? (selectedSet.printedTotal ?? 0)
		: visibleCardsCount); // Use ?? 0 as fallback
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
		class="fixed top-0 h-screen w-full md:w-[450px] bg-gray-800 z-60 shadow-lg flex flex-col {showFilters
			? 'right-0'
			: 'right-[-380px]'} transition-all duration-300 z-50"
		transition:fly={{ x: 380, duration: 300 }}
	>
		<div
			class="flex justify-between items-center p-4 border-b border-white/10"
		>
			<h2 class="m-0 text-xl text-[#FFB700] font-semibold">Filters</h2>
			<button
				class="bg-transparent border-none text-white p-1 rounded-sm hover:bg-white/10 transition-colors flex items-center justify-center"
				onclick={() => (showFilters = false)}
			>
				<XIcon size={20} />
			</button>
		</div>
		<div class="flex-1 overflow-y-auto p-6 pointer-events-auto">
			<Filters {rarities} {sets} {types} {artists} />
		</div>
	</div>
{/if}

{#if mounted}
<div class="min-h-[calc(100svh-100px)] flex flex-col">
	<!-- Header Row -->
	<div class="flex flex-col md:flex-row justify-between items-center pb-3 px-4 lg:px-10 gap-1 md:gap-0 mb-0" in:fade={{ delay: 150, duration: 300 }}>
		<!-- Left Side (Title conditional based on prop, Counts always present) -->
		<div class="flex flex-col md:flex-row items-center md:ml-14">
			{#if pageTitle}
				<div in:fly={{ y: -10, delay: 200, duration: 300 }}>
					<PageTitle title={pageTitle} />
					{#if pageTitle === 'Japanese Cards'}
						<div class="bg-yellow-200 text-yellow-900 border-l-4 border-yellow-500 p-2 rounded-sm shadow-sm max-w-xl mx-auto mt-2 text-center text-xs">
							⚠️ Some features may be missing because Japanese data is not yet complete.
						</div>
					{/if}
				</div>
			{/if}

			<!-- Counts (on same line for desktop, below for mobile) -->
			<span
				class="text-gold-400 text-xs md:text-sm mt-1 md:mt-0 md:ml-3"
				in:fade={{ delay: 250, duration: 300 }}
			>
				({uniquePokemonCount} Pokémon, {displayTotalCards} cards)
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
		<div class="flex items-end gap-2" in:fly={{ y: -10, delay: 300, duration: 300 }}>
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
					debounceFunction={debouncedSetFilterName}
				/>
			</div>
			<!-- Filters Button (Always Visible) -->
			<div class="relative">
				<Button
					onClick={() => (showFilters = true)}
					isActive={activeFiltersCount > 0}
					class="px-4"
				>
					<SlidersHorizontalIcon size={16} /> Filters
				</Button>
				{#if activeFiltersCount > 0}
					<span
						class="absolute -bottom-1 -right-1 bg-[#FFB700] text-black text-xs font-bold flex items-center justify-center w-5 h-5 rounded-full pointer-events-none z-20"
						in:fade={{ delay: 400, duration: 200 }}
					>
						{activeFiltersCount}
					</span>
				{/if}
			</div>

			<!-- Reset Button (Should be always visible) -->
			<Button
				onClick={localResetFilters}
				disabled={activeFiltersCount === 0}
				class="p-1.5"
			>
				<RotateCcwIcon size={16} />
			</Button>
		</div>
	</div>

	<div class="w-full" in:fade={{ delay: 150, duration: 300 }}>
		<ScrollProgress />
	</div>

	{#if showLoader && !disableLoader}
		<Loader message="Loading cards..." />
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
{/if}

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
</style>
