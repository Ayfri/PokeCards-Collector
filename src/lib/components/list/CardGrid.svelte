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
		isVisible,
		mostExpensiveOnly,
		sortBy,
		sortOrder,
		resetFilters,
		resetSort,
	} from "$lib/helpers/filters";
	import { getRarityLevel } from "$lib/helpers/rarity";
	import CardComponent from "@components/list/Card.svelte";
	import Filters from "@components/list/Filters.svelte";
	import VirtualGrid from "@components/list/VirtualGrid.svelte";
	import PageTitle from "@components/PageTitle.svelte";
	import ScrollProgress from "@components/list/ScrollProgress.svelte";
	import TextInput from "$lib/components/filters/TextInput.svelte";
	import { onMount } from "svelte";
	import type { FullCard, Set, Pokemon, PriceData } from "$lib/types";
	import { fade, fly } from "svelte/transition";
	import XIcon from "lucide-svelte/icons/x";
	import SlidersHorizontalIcon from "lucide-svelte/icons/sliders-horizontal";
	import RotateCcwIcon from "lucide-svelte/icons/rotate-ccw";
	import Button from "$lib/components/filters/Button.svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { findSetByCardCode } from "$helpers/set-utils";
	import { parseCardCode } from "$helpers/card-utils";
	import Loader from "$lib/components/Loader.svelte";
	import { cardSize, getCardDimensions } from "$lib/stores/gridStore";
	import SizeSlider from "$lib/components/filters/SizeSlider.svelte";
	import { debounce } from '$helpers/debounce';

	export let cards: FullCard[];
	export let sets: Set[];
	export let pokemons: Pokemon[];
	export let prices: Record<string, PriceData>;
	export let rarities: string[];
	export let types: string[];
	export let artists: string[] = [];
	export let pageTitle: string | null = "Card List";
	export let disableLoader: boolean = false;
	export let selectedSetName: string | null = null;
	export let selectedArtistName: string | null = null;
	export let lowRes: boolean = true;

	let clientWidth: number = 0;
	let showFilters = false;
	let searchName = "";
	let debounceTimeout: number;
	let showLoader = true;
	let mounted = false;
	let filterSetFromURL = false;

	// Référence vers le composant VirtualGrid
	let virtualGridComponent: VirtualGrid;

	// Fixed height for the info container in Card.svelte
	const infoContainerHeight = 70;

	// Use the store value directly; mobile logic is now in getCardDimensions
	let cardDimensions: ReturnType<typeof getCardDimensions>;
	let lastCardSizeKey = '';
	$: {
		const dimensionsStart = performance.now();
		const currentKey = `${$cardSize}-${clientWidth}`;
		if (currentKey !== lastCardSizeKey) {
			cardDimensions = getCardDimensions($cardSize, clientWidth);
			lastCardSizeKey = currentKey;
			console.log(`📐 CardGrid: Card dimensions calculated in ${performance.now() - dimensionsStart}ms:`, cardDimensions);
		} else {
			console.log(`📐 CardGrid: Card dimensions cached for key: ${currentKey}`);
		}
	}

	onMount(() => {
		const mountStart = performance.now();
		console.log('🏗️ CardGrid: Starting mount');

		// Initialize searchName from URL parameter or from store
		const urlParamsStart = performance.now();
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
				filterSetFromURL = true;
			} else {
				$filterSet = decodedSetName.toLowerCase(); // Ensure lowercase to match the option format
				filterSetFromURL = true;
			}
		}
		console.log(`⚡ CardGrid: URL params processed in ${performance.now() - urlParamsStart}ms`);

		// Set up a MutationObserver to watch for card-link elements
		const observerStart = performance.now();
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === "childList") {
					// Check for card-link or any card being rendered
					const firstCard = document.querySelector(".card-link") || document.querySelector("[data-card-code]");
					if (firstCard) {
						const loaderHideTime = performance.now();
						console.log(`🎯 CardGrid: First card rendered, hiding loader at ${loaderHideTime - mountStart}ms`);
						showLoader = false;
						observer.disconnect();
						break;
					}
				}
			}
		});

		// Start observing the document with the configured parameters
		observer.observe(document.body, { childList: true, subtree: true });

				// Fallback timeout to hide loader if MutationObserver doesn't catch it
		const fallbackTimeout = setTimeout(() => {
			if (showLoader) {
				console.log(`⏰ CardGrid: Fallback timeout hiding loader at ${performance.now() - mountStart}ms`);
				showLoader = false;
				observer.disconnect();
				clearTimeout(fallbackTimeout);
			}
		}, 2000);

		console.log(`👀 CardGrid: MutationObserver setup in ${performance.now() - observerStart}ms`);

		mounted = true;
		console.log(`✅ CardGrid: Mount completed in ${performance.now() - mountStart}ms`);
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
			// Force recalculation of VirtualGrid layout after filter and URL update
			if (virtualGridComponent) {
				setTimeout(() => {
					virtualGridComponent.recalculateLayout();

					// Restore focus to the input if it was active
					if (activeElementId === 'name') {
						const inputElement = document.getElementById('name') as HTMLInputElement;
						if (inputElement) {
							inputElement.focus();
							// Preserve cursor position if possible
							if (typeof inputElement.selectionStart === 'number') {
								const len = inputElement.value.length;
								inputElement.setSelectionRange(len, len);
							}
						}
					}
				}, 50); // Small delay to ensure filters have been applied
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
		goto(url.toString(), { replaceState: true }).then(() => {
			// Force recalculation of layout after filters have been reset
			if (virtualGridComponent) {
				setTimeout(() => {
					virtualGridComponent.recalculateLayout();
				}, 50); // Small delay to ensure all stores are updated
			}
		});
	}

		// Step 1: Apply most expensive filter
	let baseCards: FullCard[];
	$: if ($mostExpensiveOnly) {
		const expensiveStart = performance.now();
		console.log('💰 CardGrid: Processing most expensive only filter');

		// Group cards by appropriate ID based on supertype
		const cardGroups = new Map<string, FullCard>();

		cards.forEach((card) => {
			let groupKey = "";

			// Use different keys based on supertype
			if (card.supertype === "Pokémon" && card.pokemonNumber) {
				// For Pokémon cards, group by Pokémon ID
				groupKey = `pokemon_${card.pokemonNumber}`;
			} else if (card.supertype === "Trainer") {
				// For Trainer cards, group by name to keep different trainers separate
				groupKey = `trainer_${card.name.toLowerCase()}`;
			} else if (card.supertype === "Energy") {
				// For Energy cards, group by name to keep different energies separate
				groupKey = `energy_${card.name.toLowerCase()}`;
			} else {
				// Fallback for any other types
				groupKey = `other_${card.name.toLowerCase()}`;
			}

			const existingCard = cardGroups.get(groupKey);

			// Only keep the most expensive card in each group
			if (
				!existingCard ||
				(prices[card.cardCode]?.simple ?? 0) >
					(prices[existingCard.cardCode]?.simple ?? 0)
			) {
				cardGroups.set(groupKey, card);
			}
		});

		baseCards = Array.from(cardGroups.values());
		console.log(`💰 CardGrid: Most expensive filter completed in ${performance.now() - expensiveStart}ms, reduced from ${cards.length} to ${baseCards.length} cards`);
	} else {
		baseCards = cards;
		console.log(`📊 CardGrid: Using all ${cards.length} cards (no expensive filter)`);
	}

	// Step 2: Apply sorting - this reactive statement will trigger whenever $sortBy or $sortOrder changes
	let displayedCards: FullCard[] = [];
	$: {
		const sortStart = performance.now();
		console.log(`🔤 CardGrid: Starting sort by ${$sortBy} (${$sortOrder}) on ${baseCards?.length || 0} cards`);
		displayedCards = sortCards(baseCards || [], $sortBy, $sortOrder, prices, pokemons, sets);
		console.log(`🔤 CardGrid: Sort completed in ${performance.now() - sortStart}ms`);
	}

			// Global caches for expensive operations
	let globalCardSetCache = new Map<string, Set | null>();
	let lastSetsCacheKey = '';
	let sortValuesCache = new Map<string, any>();
	let lastSortValuesCacheKey = '';

	/** Very expensive and slow function, already optimized but still slow */
	function sortCards(cards: FullCard[], sortBy: string, sortOrder: string, prices: Record<string, PriceData>, pokemons: Pokemon[], sets: Set[]): FullCard[] {
		const sortFunctionStart = performance.now();
		console.log(`🔀 sortCards: Starting with ${cards.length} cards, sort: ${sortBy} ${sortOrder}`);

		// Pre-build lookup maps for performance
		const mapBuildStart = performance.now();
		const pokemonMap = new Map(pokemons.map(p => [p.id, p]));
		console.log(`🗺️ sortCards: Pokemon map built in ${performance.now() - mapBuildStart}ms`);

		// Use global cache for set lookups - rebuild only if sets changed
		const setLookupStart = performance.now();
		const currentSetsCacheKey = sets.map(s => s.name).join(',');
		if (currentSetsCacheKey !== lastSetsCacheKey) {
			console.log('🔄 sortCards: Rebuilding global set cache');
			globalCardSetCache.clear();
			lastSetsCacheKey = currentSetsCacheKey;
		}

		// Pre-compute set lookups only for missing cards
		let newLookups = 0;
		for (const card of cards) {
			if (!globalCardSetCache.has(card.cardCode)) {
				const set = findSetByCardCode(card.cardCode, sets) ?? null;
				globalCardSetCache.set(card.cardCode, set);
				newLookups++;
			}
		}
		console.log(`🗺️ sortCards: Set lookups completed in ${performance.now() - setLookupStart}ms (${newLookups} new, ${cards.length - newLookups} cached)`);

				// Pre-compute sort values for each card to avoid repeated calculations
		const precomputeStart = performance.now();
		const currentSortValuesCacheKey = `${cards.length}-${Object.keys(prices).length}-${pokemons.length}`;

		let sortValues: Map<string, any>;
		if (currentSortValuesCacheKey !== lastSortValuesCacheKey) {
			console.log('🔄 sortCards: Rebuilding sort values cache');
			sortValues = new Map();

			for (const card of cards) {
				const pokemon = pokemonMap.get(card.pokemonNumber ?? 0) ?? { name: card.name };
				const cardSet = globalCardSetCache.get(card.cardCode) ?? null;
				const parsedCard = parseCardCode(card.cardCode);
				const cardNumber = parsedCard.cardNumber || '';
				const cardNumberInt = parseInt(cardNumber);

				sortValues.set(card.cardCode, {
					price: prices[card.cardCode]?.simple ?? 0,
					name: pokemon.name,
					rarityLevel: getRarityLevel(card.rarity),
					releaseDate: cardSet?.releaseDate?.getTime() ?? 0,
					artist: card.artist || "",
					pokemonNumber: card.pokemonNumber ?? 0,
					supertype: card.supertype,
					cardNumber,
					cardNumberInt: isNaN(cardNumberInt) ? 0 : cardNumberInt,
					isPokemon: card.supertype === "Pokémon" && card.pokemonNumber != null
				});
			}

			sortValuesCache = sortValues;
			lastSortValuesCacheKey = currentSortValuesCacheKey;
			console.log(`⚡ sortCards: Sort values precomputed in ${performance.now() - precomputeStart}ms`);
		} else {
			sortValues = sortValuesCache;
			console.log(`⚡ sortCards: Sort values cached (${sortValues.size} entries)`);
		}

		const multiplier = sortOrder === "asc" ? 1 : -1;

		const actualSortStart = performance.now();
		// CRITICAL: Create a new array to ensure Svelte detects the change
		// Array.sort() modifies in place and returns the same reference!
		const result = [...cards].sort((a, b) => {
			const aValues = sortValues.get(a.cardCode)!;
			const bValues = sortValues.get(b.cardCode)!;

			if (sortBy === "sort-price") {
				return (aValues.price - bValues.price) * multiplier;
			} else if (sortBy === "sort-name") {
				return aValues.name.localeCompare(bValues.name) * multiplier;
			} else if (sortBy === "sort-id") {
				return a.cardCode.localeCompare(b.cardCode) * multiplier;
			} else if (sortBy === "sort-rarity") {
				return (aValues.rarityLevel - bValues.rarityLevel) * multiplier;
			} else if (sortBy === "sort-release-date") {
				return (aValues.releaseDate - bValues.releaseDate) * multiplier;
			} else if (sortBy === "sort-artist") {
				return aValues.artist.localeCompare(bValues.artist) * multiplier;
			}

			// Default sort is by Pokédex number
			if (aValues.isPokemon && !bValues.isPokemon) return -1;
			if (!aValues.isPokemon && bValues.isPokemon) return 1;

			if (!aValues.isPokemon && !bValues.isPokemon) {
				const supertypeOrder: Record<string, number> = { Pokémon: 1, Trainer: 2, Energy: 3 };
				const aOrder = supertypeOrder[aValues.supertype] || 99;
				const bOrder = supertypeOrder[bValues.supertype] || 99;
				if (aOrder !== bOrder) return aOrder - bOrder;
				return a.name.localeCompare(b.name);
			}

			const aNum = aValues.pokemonNumber!;
			const bNum = bValues.pokemonNumber!;

			if (aNum !== bNum) return (aNum - bNum) * multiplier;

			if (aValues.releaseDate !== bValues.releaseDate) {
				return (aValues.releaseDate - bValues.releaseDate) * multiplier;
			}

			if (aValues.cardNumberInt && bValues.cardNumberInt) {
				return (aValues.cardNumberInt - bValues.cardNumberInt) * multiplier;
			}

			return aValues.cardNumber.localeCompare(bValues.cardNumber) * multiplier;
		});

		console.log(`🔀 sortCards: Actual sort completed in ${performance.now() - actualSortStart}ms`);
		console.log(`🔀 sortCards: Total function time: ${performance.now() - sortFunctionStart}ms`);

		return result;
	}

	let filteredCards = displayedCards;

	// Pre-compute lookup maps for filtering performance
	let pokemonFilterMap: Map<number, Pokemon>;
	let cardSetFilterMap: Map<string, Set | null>;
	let fallbackSetCache: Map<string, Set>;

	$: {
		const cacheStart = performance.now();
		console.log('🔄 CardGrid: Rebuilding filter caches');

		// Rebuild maps when dependencies change
		pokemonFilterMap = new Map(pokemons.map(p => [p.id, p]));
		cardSetFilterMap = new Map();
		fallbackSetCache = new Map();

		console.log(`🔄 CardGrid: Filter caches rebuilt in ${performance.now() - cacheStart}ms`);
		console.log(`📊 CardGrid: Pokemon map size: ${pokemonFilterMap.size}, Sets: ${sets.length}`);
	}

		// Check if any filters are actually active
	$: hasActiveFilters = $filterName || $filterNumero || $filterRarity !== 'all' || $filterSet !== 'all' ||
		$filterType !== 'all' || $filterSupertype !== 'all' || $filterArtist !== 'all';

	$: if (
		$filterName ||
		$filterNumero ||
		$filterRarity ||
		$filterSet ||
		$filterType ||
		$filterSupertype ||
		$filterArtist ||
		$sortBy ||
		$sortOrder ||
		$mostExpensiveOnly
	) {
		const filterStart = performance.now();
		console.log(`🔍 CardGrid: Starting filter on ${displayedCards.length} cards`);
		console.log(`🔍 Active filters:`, {
			name: $filterName || 'none',
			numero: $filterNumero || 'none',
			rarity: $filterRarity,
			set: $filterSet,
			type: $filterType,
			supertype: $filterSupertype,
			artist: $filterArtist,
			sortBy: $sortBy,
			sortOrder: $sortOrder,
			mostExpensive: $mostExpensiveOnly
		});

		// Skip expensive filtering if no filters are active
		if (!hasActiveFilters) {
			console.log('⚡ CardGrid: No active filters, skipping filter process');
			filteredCards = displayedCards;
		} else {
			let cacheHits = 0;
			let cacheMisses = 0;

			filteredCards = displayedCards.filter((card) => {
				// Use global cache first, fallback to local cache
				let cardSet = globalCardSetCache.get(card.cardCode);
				if (cardSet === undefined) {
					cardSet = cardSetFilterMap.get(card.cardCode);
					if (cardSet === undefined) {
						cardSet = findSetByCardCode(card.cardCode, sets) ?? null;
						cardSetFilterMap.set(card.cardCode, cardSet);
						globalCardSetCache.set(card.cardCode, cardSet);
						cacheMisses++;
					} else {
						cacheHits++;
					}
				} else {
					cacheHits++;
				}

				let fallbackSet = fallbackSetCache.get(card.cardCode);
				if (!fallbackSet) {
					fallbackSet = {
						name: card.setName,
						logo: card.image?.replace(/\/[^\/]*$/, "/logo.png") ?? "",
						printedTotal: 0,
						releaseDate: new Date(),
					};
					fallbackSetCache.set(card.cardCode, fallbackSet);
				}

				const pokemon = pokemonFilterMap.get(card.pokemonNumber ?? 0);

				return isVisible(
					card,
					pokemon,
					cardSet ?? fallbackSet,
					selectedSet ?? null,
				);
			});

			console.log(`💾 CardGrid: Cache performance - Hits: ${cacheHits}, Misses: ${cacheMisses}`);
		}

		// Order cards by supertype (Pokémon, Trainer, Energy) when all supertypes are selected
		if ($filterSupertype === "all") {
			const supertypeSortStart = performance.now();
			const supertypeOrder: Record<string, number> = {
				Pokémon: 1,
				Trainer: 2,
				Energy: 3,
			};

			filteredCards = filteredCards.sort((a, b) => {
				const aOrder = supertypeOrder[a.supertype] || 99;
				const bOrder = supertypeOrder[b.supertype] || 99;

				if (aOrder !== bOrder) {
					return aOrder - bOrder;
				}

				// Keep existing sort order within same supertype
				return 0;
			});
			console.log(`🏷️ CardGrid: Supertype sort completed in ${performance.now() - supertypeSortStart}ms`);
		}

		const filterEnd = performance.now();
		console.log(`🔍 CardGrid: Filter completed in ${filterEnd - filterStart}ms`);
		console.log(`📊 CardGrid: Filtered from ${displayedCards.length} to ${filteredCards.length} cards`);
	}

	// Count active filters
	$: activeFiltersCount = [
		$filterName,
		$filterNumero,
		$filterRarity !== "all",
		$filterSet !== "all",
		$filterType !== "all",
		$filterSupertype !== "all",
		$filterArtist !== "all",
		$mostExpensiveOnly,
		$sortBy !== "sort-pokedex",
	].filter(Boolean).length;

	let visibleCardsCount = 0;
	let uniquePokemonCount = 0;
	let lastCountsKey = '';
	$: if (filteredCards) {
		const countStart = performance.now();
		const currentCountsKey = `${filteredCards.length}-${filteredCards.map(c => c.cardCode).slice(0,5).join(',')}`;
		if (currentCountsKey !== lastCountsKey) {
			visibleCardsCount = filteredCards.length;
			uniquePokemonCount = new Set(
				filteredCards
					.filter((card) => card.supertype === "Pokémon")
					.map((card) => card.pokemonNumber),
			).size;
			lastCountsKey = currentCountsKey;
			console.log(`🔢 CardGrid: Counts calculated in ${performance.now() - countStart}ms - Visible: ${visibleCardsCount}, Unique Pokémon: ${uniquePokemonCount}`);
		} else {
			console.log(`🔢 CardGrid: Counts cached for ${visibleCardsCount} cards`);
		}
	}

	// Find the selected set based on the filter and determine the correct total count to display
	$: selectedSet =
		$filterSet && $filterSet !== "all"
			? findSetByCardCode($filterSet, sets)
			: null;
	$: displayTotalCards = selectedSet
		? (selectedSet.printedTotal ?? 0)
		: visibleCardsCount; // Use ?? 0 as fallback

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape" && showFilters) {
			showFilters = false;
		}
	}
</script>

<svelte:window bind:innerWidth={clientWidth} on:keydown={handleKeydown} />
<svelte:body style:overflow={showFilters ? "hidden" : "auto"} />

{#if showFilters}
	<!-- Overlay -->
	<div
		aria-hidden={!showFilters}
		class="filter-overlay fixed inset-0 z-50 bg-black/70 transition-all duration-300"
		transition:fade={{ duration: 200 }}
		on:click={() => (showFilters = false)}
		on:keydown={handleKeydown}
	></div>
	<!-- Drawer -->
	<div
		class="fixed top-0 h-screen w-full md:w-[450px] bg-gray-800 z-60 shadow-lg flex flex-col {showFilters
			? 'right-0'
			: '-right-[380px]'} transition-all duration-300 z-50"
		transition:fly={{ x: 380, duration: 300 }}
	>
		<div
			class="flex justify-between items-center p-4 border-b border-white/10"
		>
			<h2 class="m-0 text-xl text-[#FFB700] font-semibold">Filters</h2>
			<button
				class="bg-transparent border-none text-white p-1 rounded hover:bg-white/10 transition-colors flex items-center justify-center"
				on:click={() => (showFilters = false)}
			>
				<XIcon size={20} />
			</button>
		</div>
		<div class="flex-1 overflow-y-auto p-6 pointer-events-auto">
			<Filters {rarities} {sets} {types} {artists} onUpdate={() => virtualGridComponent.recalculateLayout()} />
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
						<div class="bg-yellow-200 text-yellow-900 border-l-4 border-yellow-500 p-2 rounded shadow max-w-xl mx-auto mt-2 text-center text-xs">
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
		bind:this={virtualGridComponent}
		gapX={cardDimensions.gapX}
		gapY={cardDimensions.gapY}
		itemHeight={cardDimensions.height + infoContainerHeight}
		itemWidth={cardDimensions.width}
		forcedItemsPerRow={cardDimensions.cardsPerRow}
		items={filteredCards}
		let:item
		marginTop={clientWidth ? 20 : 50}
	>
		<CardComponent
			card={item}
			{pokemons}
			{sets}
			prices={prices[item.cardCode]}
			customWidth={cardDimensions.width}
			customHeight={cardDimensions.height}
			{lowRes}
		/>

		<div slot="empty">
			<p class="text-white text-center mt-32 text-2xl">No cards found</p>
		</div>
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
