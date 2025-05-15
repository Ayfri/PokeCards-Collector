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
	import FilterIcon from "lucide-svelte/icons/filter";

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
	$: cardDimensions = getCardDimensions($cardSize, clientWidth);

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
				filterSetFromURL = true;
			} else {
				$filterSet = decodedSetName.toLowerCase(); // Ensure lowercase to match the option format
				filterSetFromURL = true;
			}
		}

		// Set up a MutationObserver to watch for card-link elements
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === "childList") {
					if (document.querySelector(".card-link")) {
						showLoader = false;
						observer.disconnect();
						break;
					}
				}
			}
		});

		// Start observing the document with the configured parameters
		observer.observe(document.body, { childList: true, subtree: true });

		mounted = true;
	});

	function debounce(fn: Function, delay: number) {
		return (...args: any[]) => {
			clearTimeout(debounceTimeout);
			debounceTimeout = window.setTimeout(() => {
				fn(...args);
			}, delay);
		};
	}

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

	let displayedCards = cards;
	$: if ($mostExpensiveOnly) {
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

		displayedCards = Array.from(cardGroups.values());
	} else {
		displayedCards = cards;
	}

	$: if ($sortOrder || $sortBy) {
		displayedCards = displayedCards.sort((a, b) => {
			const aCardCode = a.cardCode;
			const bCardCode = b.cardCode;

			if ($sortBy === "sort-price") {
				const aPrice = prices[a.cardCode]?.simple ?? 0;
				const bPrice = prices[b.cardCode]?.simple ?? 0;
				return $sortOrder === "asc" ? aPrice - bPrice : bPrice - aPrice;
			} else if ($sortBy === "sort-name") {
				const aPokemon = pokemons.find(
					(p) => p.id === a.pokemonNumber,
				) ?? { name: a.name };
				const bPokemon = pokemons.find(
					(p) => p.id === b.pokemonNumber,
				) ?? { name: b.name };
				return $sortOrder === "asc"
					? aPokemon.name.localeCompare(bPokemon.name)
					: bPokemon.name.localeCompare(aPokemon.name);
			} else if ($sortBy === "sort-id") {
				return $sortOrder === "asc"
					? aCardCode.localeCompare(bCardCode)
					: bCardCode.localeCompare(aCardCode);
			} else if ($sortBy === "sort-rarity") {
				const aLevel = getRarityLevel(a.rarity);
				const bLevel = getRarityLevel(b.rarity);
				return $sortOrder === "asc" ? aLevel - bLevel : bLevel - aLevel;
			} else if ($sortBy === "sort-release-date") {
				const aSet = findSetByCardCode(a.cardCode, sets);
				const bSet = findSetByCardCode(b.cardCode, sets);
				const aReleaseDate = aSet?.releaseDate.getTime() ?? 0;
				const bReleaseDate = bSet?.releaseDate.getTime() ?? 0;
				return $sortOrder === "asc"
					? aReleaseDate - bReleaseDate
					: bReleaseDate - aReleaseDate;
			} else if ($sortBy === "sort-artist") {
				const aArtist = a.artist || "";
				const bArtist = b.artist || "";
				return $sortOrder === "asc"
					? aArtist.localeCompare(bArtist)
					: bArtist.localeCompare(aArtist);
			}

			// Default sort is by Pokédex number
			
			// First check if either card is not a Pokémon or has no pokemonNumber
			// These cards should be sorted after Pokémon cards
			const aPokemonCard = a.supertype === "Pokémon" && a.pokemonNumber != null;
			const bPokemonCard = b.supertype === "Pokémon" && b.pokemonNumber != null;
			
			// If one is a Pokémon card and the other isn't, the non-Pokémon card goes last
			if (aPokemonCard && !bPokemonCard) return -1; // a before b
			if (!aPokemonCard && bPokemonCard) return 1;  // b before a
			
			// If neither are Pokémon cards, sort by supertype then name
			if (!aPokemonCard && !bPokemonCard) {
				// Sort by supertype first
				const supertypeOrder: Record<string, number> = {
					Pokémon: 1, // For cards with supertype Pokémon but no number
					Trainer: 2,
					Energy: 3,
				};
				const aOrder = supertypeOrder[a.supertype] || 99;
				const bOrder = supertypeOrder[b.supertype] || 99;

				if (aOrder !== bOrder) {
					return aOrder - bOrder;
				}
				
				// If same supertype, sort by name
				return a.name.localeCompare(b.name);
			}
			
			// Both are Pokémon cards with valid numbers
			const aNum = a.pokemonNumber!;
			const bNum = b.pokemonNumber!;
			
			// Different Pokémon - sort by Pokédex number
			if (aNum !== bNum) {
				return $sortOrder === "asc" ? aNum - bNum : bNum - aNum;
			}
			
			// Same Pokémon - need to sort further
			
			// Next, sort by set release date (newer sets first by default)
			const aSet = findSetByCardCode(a.cardCode, sets);
			const bSet = findSetByCardCode(b.cardCode, sets);
			const aReleaseDate = aSet?.releaseDate?.getTime() ?? 0;
			const bReleaseDate = bSet?.releaseDate?.getTime() ?? 0;
			
			if (aReleaseDate !== bReleaseDate) {
				// Default to newest first, but respect sort order
				return $sortOrder === "asc" 
					? aReleaseDate - bReleaseDate 
					: bReleaseDate - aReleaseDate;
			}
			
			// Same Pokémon and same set release date - sort by card number
			const aCardNum = parseCardCode(a.cardCode).cardNumber || '';
			const bCardNum = parseCardCode(b.cardCode).cardNumber || '';
			
			// Try to parse as numbers if possible
			const aCardNumInt = parseInt(aCardNum);
			const bCardNumInt = parseInt(bCardNum);
			
			if (!isNaN(aCardNumInt) && !isNaN(bCardNumInt)) {
				return $sortOrder === "asc"
					? aCardNumInt - bCardNumInt
					: bCardNumInt - aCardNumInt;
			}
			
			// Fall back to string comparison if not numeric
			return $sortOrder === "asc"
				? aCardNum.localeCompare(bCardNum)
				: bCardNum.localeCompare(aCardNum);
		});
	}

	let filteredCards = displayedCards;
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
		filteredCards = displayedCards.filter((card) => {
			const cardSet = findSetByCardCode(card.cardCode, sets);
			const fallbackSet: Set = {
				name: card.setName,
				logo: card.image?.replace(/\/[^\/]*$/, "/logo.png") ?? "", // Attempt to guess logo path for fallback
				printedTotal: 0,
				releaseDate: new Date(),
			};
			return isVisible(
				card,
				pokemons.find((p) => p.id === card.pokemonNumber),
				cardSet ?? fallbackSet,
				selectedSet ?? null,
			);
		});

		// Order cards by supertype (Pokémon, Trainer, Energy) when all supertypes are selected
		if ($filterSupertype === "all") {
			filteredCards = filteredCards.sort((a, b) => {
				// Priority ordering: 1-Pokémon, 2-Trainer, 3-Energy
				const supertypeOrder: Record<string, number> = {
					Pokémon: 1,
					Trainer: 2,
					Energy: 3,
				};
				const aOrder = supertypeOrder[a.supertype] || 99;
				const bOrder = supertypeOrder[b.supertype] || 99;

				if (aOrder !== bOrder) {
					return aOrder - bOrder;
				}

				// Keep existing sort order within same supertype
				return 0;
			});
		}
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
	$: {
		if (filteredCards) {
			visibleCardsCount = filteredCards.length;
			uniquePokemonCount = new Set(
				filteredCards
					.filter((card) => card.supertype === "Pokémon")
					.map((card) => card.pokemonNumber),
			).size;
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
