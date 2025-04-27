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
	import Grid2x2Icon from "lucide-svelte/icons/grid-2x2";

	export let cards: FullCard[];
	export let sets: Set[];
	export let pokemons: Pokemon[];
	export let prices: Record<string, PriceData>;
	export let rarities: string[];
	export let types: string[];
	export let artists: string[] = [];
	export let pageTitle: string | null = "Card List";
	export let disableLoader: boolean = false;

	let clientWidth: number = 0;
	let showFilters = false;
	let searchName = "";
	let debounceTimeout: number;
	let showLoader = true;

	// Référence vers le composant VirtualGrid
	let virtualGridComponent: VirtualGrid;
	let isSliderChanging = false;

	onMount(() => {
		searchName = $filterName;

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
	}, 300);

	// Local reset function to clear both store and local state
	function localResetFilters() {
		resetFilters(); // Call the imported helper to reset stores
		resetSort();
		searchName = ""; // Reset the local searchName bound to the TextInput

		// Also clear URL parameters to match the UI state
		const currentPath = page.url.pathname;
		goto(currentPath, { replaceState: true });
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

			// Order by supertype first (Pokémon, Trainer, Energy)
			if ($filterSupertype === "all") {
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
			}

			const aNumDefault = parseCardCode(a.cardCode).pokemonNumber;
			const bNumDefault = parseCardCode(b.cardCode).pokemonNumber;
			if (aNumDefault === null && bNumDefault !== null) return 1;
			if (bNumDefault === null && aNumDefault !== null) return -1;
			if (aNumDefault === null && bNumDefault === null)
				return a.name.localeCompare(b.name);
			return $sortOrder === "asc"
				? aNumDefault! - bNumDefault!
				: bNumDefault! - aNumDefault!;
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

	// Force une mise à jour complète lorsque le slider change, avec debounce
	function handleSizeChange() {
		// Indiquer que le slider est en train de changer
		isSliderChanging = true;
		
		// Annuler le timeout précédent s'il existe
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}
		
		// Définir un nouveau timeout pour limiter les mises à jour
		debounceTimeout = window.setTimeout(() => {
			isSliderChanging = false;
			
			// Appliquer le changement une fois le slider stabilisé
			if (virtualGridComponent) {
				virtualGridComponent.reinitializeGrid();
			}
		}, 150); // Attendre 150ms après le dernier mouvement
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
			<Filters {rarities} {sets} {types} {artists} />
		</div>
	</div>
{/if}

<div class="min-h-[calc(100vh)] flex flex-col">
	<!-- Header Row -->
	<div
		class="flex flex-col md:flex-row justify-between items-center pb-3 px-10 mb-0"
	>
		<!-- Left Side (Title conditional based on prop, Counts always present) -->
		<div class="flex items-center gap-3 md:ml-14">
			{#if pageTitle}
				<PageTitle title={pageTitle} />
			{/if}
			<!-- Desktop Counts (always rendered in this position) -->
			<span
				class:ml-4={!!pageTitle}
				class="text-gold-400 text-sm hidden md:block"
			>
				({uniquePokemonCount} Pokémon, {displayTotalCards} cards)
			</span>
		</div>

		<!-- Right Side (Controls) -->
		<div class="flex items-end gap-2">
			<!-- Mobile Count -->
			<span class="texalGold-400 text-sm ml-4 md:hidden">
				({uniquePokemonCount} Pokémon, {displayTotalCards} cards)
			</span>
			<!-- Grid Size Slider -->
			<div
				class="grid-size-slider flex items-center gap-3 mr-3 px-1 ml-1"
			>
				<div class="slider-container relative w-24">
					<input
						type="range"
						min="1"
						max="3"
						step="1"
						bind:value={$cardSize}
						on:input={handleSizeChange}
						class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
						aria-label="Adjust card size"
					/>
					{#if isSliderChanging}
						<div class="absolute -right-6 top-0">
							<div class="animate-spin h-4 w-4 border-2 border-gold-400 rounded-full border-t-transparent"></div>
						</div>
					{/if}
				</div>
				<div class="text-white/80 flex items-center">
					<Grid2x2Icon size={18} />
				</div>
			</div>
			<!-- Name Search (Should be always visible) -->
			<div class="w-48">
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

	<div class="w-full">
		<ScrollProgress />
	</div>

	{#if showLoader && !disableLoader}
		<Loader message="Loading cards..." />
	{/if}

	<VirtualGrid
		bind:this={virtualGridComponent}
		gapX={getCardDimensions($cardSize, clientWidth).gapX}
		gapY={getCardDimensions($cardSize, clientWidth).gapY}
		itemHeight={getCardDimensions($cardSize, clientWidth).height}
		itemWidth={getCardDimensions($cardSize, clientWidth).width}
		forcedItemsPerRow={getCardDimensions($cardSize, clientWidth)
			.cardsPerRow}
		items={filteredCards}
		let:item
		marginTop={clientWidth ? 20 : 50}
	>
		<CardComponent
			card={item}
			{pokemons}
			{sets}
			prices={prices[item.cardCode]}
			customWidth={getCardDimensions($cardSize, clientWidth).width}
			customHeight={getCardDimensions($cardSize, clientWidth).height}
		/>

		<div slot="empty">
			<p class="text-white text-center mt-32 text-2xl">No cards found</p>
		</div>
	</VirtualGrid>
</div>

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	/* Slider custom styles */
	input[type="range"] {
		-webkit-appearance: none;
		appearance: none;
		height: 6px;
		background: #374151;
		border-radius: 999px;
		overflow: hidden;
	}

	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #ffb700;
		cursor: pointer;
		border: 2px solid #1f2937;
		box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
	}

	input[type="range"]::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #ffb700;
		cursor: pointer;
		border: 2px solid #1f2937;
		box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
	}

	/* Progress fill */
	input[type="range"]::-webkit-slider-runnable-track {
		height: 6px;
		border-radius: 999px;
	}

	input[type="range"]::-moz-range-track {
		height: 6px;
		border-radius: 999px;
	}
</style>
