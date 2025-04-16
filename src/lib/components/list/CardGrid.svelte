<script lang="ts">
	import "~/styles/colors.css";
	import {displayAll, filterName, filterNumero, filterRarity, filterSet, filterSupertype, filterType, filterArtist, isVisible, mostExpensiveOnly, sortBy, sortOrder, resetFilters} from '$helpers/filters';
	import {getRarityLevel} from '$helpers/rarity';
	import CardComponent from '@components/list/Card.svelte';
	import Filters from '@components/list/Filters.svelte';
	import VirtualGrid from '@components/list/VirtualGrid.svelte';
	import PageTitle from '@components/PageTitle.svelte';
	import ScrollProgress from '@components/list/ScrollProgress.svelte';
	import TextInput from '$lib/components/filters/TextInput.svelte';
	import { onMount } from 'svelte';
	import type {FullCard, Set, Pokemon} from '$lib/types';
	import { fly } from 'svelte/transition';
	import XIcon from 'lucide-svelte/icons/x';
	import SlidersHorizontalIcon from 'lucide-svelte/icons/sliders-horizontal';
	import RotateCcwIcon from 'lucide-svelte/icons/rotate-ccw';

	export let cards: FullCard[];
	export let sets: Set[];
	export let pokemons: Pokemon[];
	export let rarities: string[];
	export let types: string[];
	export let artists: string[] = [];

	let clientWidth: number = 0;
	let showFilters = false;
	let filterOverlay = false;
	let searchName = '';
	let debounceTimeout: number;

	onMount(() => {
		searchName = $filterName;
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

	let displayedCards = cards;
	$: {
		if ($mostExpensiveOnly) {
			// Group cards by appropriate ID based on supertype
			const cardGroups = new Map<string, FullCard>();

			cards.forEach(card => {
				let groupKey = '';

				// Use different keys based on supertype
				if (card.supertype === 'Pokémon' && card.pokemonNumber) {
					// For Pokémon cards, group by Pokémon ID
					groupKey = `pokemon_${card.pokemonNumber}`;
				} else if (card.supertype === 'Trainer') {
					// For Trainer cards, group by name to keep different trainers separate
					groupKey = `trainer_${card.name.toLowerCase()}`;
				} else if (card.supertype === 'Energy') {
					// For Energy cards, group by name to keep different energies separate
					groupKey = `energy_${card.name.toLowerCase()}`;
				} else {
					// Fallback for any other types
					groupKey = `other_${card.name.toLowerCase()}`;
				}

				const existingCard = cardGroups.get(groupKey);

				// Only keep the most expensive card in each group
				if (!existingCard || (card.price ?? 0) > (existingCard.price ?? 0)) {
					cardGroups.set(groupKey, card);
				}
			});

			displayedCards = Array.from(cardGroups.values());
		} else {
			displayedCards = $displayAll ? cards : cards.filter((card, index, self) =>
				card.supertype === 'Pokémon' &&
				card.pokemonNumber &&
				self.findIndex(c => c.pokemonNumber === card.pokemonNumber) === index
			);
		}
	}

	$: if ($sortOrder || $sortBy) {
		displayedCards = displayedCards.sort((a, b) => {
			const aNumero = a.pokemonNumber ?? 0;
			const bNumero = b.pokemonNumber ?? 0;
			// Extraire le cardCode des images
			const aCardCode = parseInt(a.image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1') || '0');
			const bCardCode = parseInt(b.image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1') || '0');

			if ($sortBy === 'sort-price') {
				return $sortOrder === 'asc' ? (a.price ?? -1) - (b.price ?? 0) : (b.price ?? 0) - (a.price ?? -1);
			} else if ($sortBy === 'sort-name') {
				const aPokemon = pokemons.find(p => p.id === a.pokemonNumber) ?? {name: ''};
				const bPokemon = pokemons.find(p => p.id === b.pokemonNumber) ?? {name: ''};
				return $sortOrder === 'asc' ? aPokemon.name.localeCompare(bPokemon.name) : bPokemon.name.localeCompare(aPokemon.name);
			} else if ($sortBy === 'sort-id') {
				return $sortOrder === 'asc' ? aCardCode - bCardCode : bCardCode - aCardCode;
			} else if ($sortBy === 'sort-rarity') {
				const aLevel = getRarityLevel(a.rarity);
				const bLevel = getRarityLevel(b.rarity);
				return $sortOrder === 'asc' ? aLevel - bLevel : bLevel - aLevel;
			} else if ($sortBy === 'sort-release-date') {
				const aSet = sets.find(s => s.name === a.setName);
				const bSet = sets.find(s => s.name === b.setName);
				const aReleaseDate = aSet?.releaseDate.getTime() ?? 0;
				const bReleaseDate = bSet?.releaseDate.getTime() ?? 0;
				return $sortOrder === 'asc' ? aReleaseDate - bReleaseDate : bReleaseDate - aReleaseDate;
			} else if ($sortBy === 'sort-artist') {
				const aArtist = a.artist || '';
				const bArtist = b.artist || '';
				return $sortOrder === 'asc' ? aArtist.localeCompare(bArtist) : bArtist.localeCompare(aArtist);
			}

			return $sortOrder === 'asc' ? aNumero - bNumero : bNumero - aNumero;
		});
	}

	let filteredCards = displayedCards;
	$: if ($filterName || $filterNumero || $filterRarity || $filterSet || $filterType || $filterSupertype || $filterArtist || $displayAll || $sortBy || $sortOrder || $mostExpensiveOnly) {
		filteredCards = displayedCards.filter(card => isVisible(card, pokemons.find(p => p.id === card.pokemonNumber)!!, sets.find(s => s.name === card.setName)!!));
	}

	// Count active filters
	$: activeFiltersCount = [
		$filterName,
		$filterNumero,
		$filterRarity !== 'all',
		$filterSet !== 'all',
		$filterType !== 'all',
		$filterSupertype !== 'all',
		$filterArtist !== 'all',
		$mostExpensiveOnly
	].filter(Boolean).length;

	let visibleCardsCount = 0;
	let uniquePokemonCount = 0;
	$: {
		if (filteredCards) {
			visibleCardsCount = filteredCards.length;
			uniquePokemonCount = new Set(filteredCards.filter(card => card.supertype === 'Pokémon').map(card => card.pokemonNumber)).size;
		}
	}

	function toggleFilters() {
		showFilters = !showFilters;
		if (showFilters) {
			setTimeout(() => {
				filterOverlay = true;
			}, 10);
			// Prevent scrolling when filter is open
			document.body.style.overflow = 'hidden';
		} else {
			filterOverlay = false;
			// Restore scrolling when filter is closed
			document.body.style.overflow = '';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showFilters) {
			toggleFilters();
		}
	}

	// Close filters when clicking outside
	function handleClickOutside(e: MouseEvent) {
		if (showFilters && e.target && e.target instanceof HTMLElement) {
			if (e.target.classList.contains('filter-overlay')) {
				toggleFilters();
			}
		}
	}
</script>

<svelte:window bind:innerWidth={clientWidth} on:keydown={handleKeydown}/>

<!-- Overlay -->
<div
	class="filter-overlay fixed inset-0 z-50 {filterOverlay ? 'bg-black/70' : 'bg-black/0 pointer-events-none'} transition-all duration-300"
	on:click={handleClickOutside}
></div>

{#if showFilters}
	<!-- Drawer -->
	<div class="fixed top-0 h-screen w-full md:w-[450px] bg-gray-800 z-60 shadow-lg flex flex-col {showFilters ? 'right-0' : '-right-[380px]'} transition-all duration-300 z-50" transition:fly={{ x: 380, duration: 300 }}>
		<div class="flex justify-between items-center p-4 border-b border-white/10">
			<h2 class="m-0 text-xl text-[#FFB700] font-semibold">Filters</h2>
			<button class="bg-transparent border-none text-white p-1 rounded hover:bg-white/10 transition-colors flex items-center justify-center" on:click={toggleFilters}>
				<XIcon size={20} />
			</button>
		</div>
		<div class="flex-1 overflow-y-auto p-6 pointer-events-auto">
			<Filters cards={filteredCards} {rarities} {sets} {types} {artists} {pokemons} />
		</div>
	</div>
{/if}

<div class="min-h-[calc(100vh)] flex flex-col">
	<div class="flex flex-col md:flex-row justify-between items-center pb-3 px-10 mb-0">
		<div class="flex flex-col md:flex-row items-center gap-3 md:ml-14">
			<PageTitle title="Card List"/>
			<span class="text-gold-400 text-sm ml-4 hidden md:block">
				({uniquePokemonCount} Pokémon, {visibleCardsCount} cards)
			</span>
		</div>

		<div class="flex items-end gap-2">
			<span class="text-gold-400 text-sm ml-4 md:hidden">
				({uniquePokemonCount} Pokémon, {visibleCardsCount} cards)
			</span>

			<div class="w-48">
				<TextInput
					id="name"
					label="Name"
					bind:value={searchName}
					placeholder="Search by name..."
					debounceFunction={debouncedSetFilterName}
				/>
			</div>

			<div class="relative">
				<button
					class="animated-hover-button filters-button relative overflow-hidden bg-transparent border-2 text-sm font-medium py-1.5 px-4 rounded flex items-center transition-all duration-300 h-8 z-0
						   {activeFiltersCount > 0
								? 'border-[#FFB700] text-[#FFB700]'
								: 'border-white text-white'}"
					on:click={toggleFilters}
				>
					<span class="relative z-10 flex items-center">
						<SlidersHorizontalIcon size={16} class="mr-1"/> Filters
					</span>
				</button>
				{#if activeFiltersCount > 0}
					<span class="absolute -bottom-1 -right-1 bg-[#FFB700] text-black text-xs font-bold flex items-center justify-center w-5 h-5 rounded-full pointer-events-none z-20">
						{activeFiltersCount}
					</span>
				{/if}
			</div>

			<!-- Reset Button -->
			<button
				class="animated-hover-button reset-button relative overflow-hidden flex items-center justify-center bg-transparent border-2 border-white text-white rounded text-sm p-1.5 h-8 transition-all duration-300 z-0
					   disabled:border-gray-600 disabled:text-gray-600 disabled:cursor-not-allowed"
				on:click={resetFilters}
				aria-label="Reset filters"
				disabled={activeFiltersCount === 0}
			>
				<span class="relative z-10 flex items-center">
					<RotateCcwIcon size={16}/>
				</span>
			</button>
		</div>
	</div>

	<div class="w-full">
		<ScrollProgress />
	</div>

	<VirtualGrid
		gapX={100 + clientWidth * 0.035}
		gapY={50}
		itemHeight={clientWidth > 350 ? 480 : 402}
		itemWidth={clientWidth > 350 ? 300 : 245}
		items={filteredCards}
		let:item
		marginTop={clientWidth ? 15 + clientWidth * 0.025 : 50}
	>
		<CardComponent card={item} {pokemons} {sets}/>

		<div slot="empty">
			<p class="text-white text-center mt-32 text-2xl">No cards found</p>
		</div>
	</VirtualGrid>
</div>

<style>
	@media (max-width: 640px) {
		:global(.filter-drawer) {
			width: 320px;
			right: -320px;
		}
	}

	/* Base styles for animated buttons */
	.animated-hover-button {
		transition: color 0.3s ease-in-out, border-color 0.3s ease-in-out;
	}

	.animated-hover-button::before {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 0;
		transition: height 0.3s ease-in-out;
		z-index: -1;
	}

	.animated-hover-button:not(:disabled):hover::before {
		height: 100%;
	}

	.animated-hover-button:not(:disabled):hover {
		color: black;
		border-color: #FFB700;
	}

	/* Specific background colors for each button */
	.filters-button::before {
		background-color: #FFB700;
	}

	.reset-button::before {
		background-color: #FFB700;
	}

	/* Ensure disabled button does not show hover effects */
	.animated-hover-button:disabled {
		border-color: #4B5563;
		color: #4B5563;
		pointer-events: none;
	}

	.animated-hover-button:disabled::before {
		display: none;
	}
</style>
