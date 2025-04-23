<script lang="ts">
	import "~/styles/colors.css";
	import {displayAll, filterName, filterNumero, filterRarity, filterSet, filterSupertype, filterType, filterArtist, isVisible, mostExpensiveOnly, sortBy, sortOrder, resetFilters} from '$lib/helpers/filters';
	import { getRarityLevel } from '$lib/helpers/rarity';
	import CardComponent from '@components/list/Card.svelte';
	import Filters from '@components/list/Filters.svelte';
	import VirtualGrid from '@components/list/VirtualGrid.svelte';
	import PageTitle from '@components/PageTitle.svelte';
	import ScrollProgress from '@components/list/ScrollProgress.svelte';
	import TextInput from '$lib/components/filters/TextInput.svelte';
	import { onMount } from 'svelte';
	import type {FullCard, Set, Pokemon} from '$lib/types';
	import { fade, fly } from 'svelte/transition';
	import XIcon from 'lucide-svelte/icons/x';
	import SlidersHorizontalIcon from 'lucide-svelte/icons/sliders-horizontal';
	import RotateCcwIcon from 'lucide-svelte/icons/rotate-ccw';
	import Button from '$lib/components/filters/Button.svelte';
	export let cards: FullCard[];
	export let sets: Set[];
	export let pokemons: Pokemon[];
	export let rarities: string[];
	export let types: string[];
	export let artists: string[] = [];
	export let pageTitle: string | null = "Card List";

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

	// Local reset function to clear both store and local state
	function localResetFilters() {
		resetFilters(); // Call the imported helper to reset stores
		searchName = ''; // Reset the local searchName bound to the TextInput
	}

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
			const aCardCode = parseInt(a.image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1') || '0');
			const bCardCode = parseInt(b.image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1') || '0');

			if ($sortBy === 'sort-price') {
				return $sortOrder === 'asc' ? (a.price ?? -1) - (b.price ?? 0) : (b.price ?? 0) - (a.price ?? -1);
			} else if ($sortBy === 'sort-name') {
				const aPokemon = pokemons.find(p => p.id === a.pokemonNumber) ?? {name: a.name};
				const bPokemon = pokemons.find(p => p.id === b.pokemonNumber) ?? {name: b.name};
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
			} else if ($sortBy === 'sort-pokedex') {
				const aNum = a.pokemonNumber;
				const bNum = b.pokemonNumber;

				if (aNum === null && bNum !== null) {
					return 1;
				}
				if (bNum === null && aNum !== null) {
					return -1;
				}
				if (aNum === null && bNum === null) {
					return a.name.localeCompare(b.name);
				}

				return $sortOrder === 'asc' ? aNum! - bNum! : bNum! - aNum!;
			}

			const aNumDefault = a.pokemonNumber;
			const bNumDefault = b.pokemonNumber;
			if (aNumDefault === null && bNumDefault !== null) return 1;
			if (bNumDefault === null && aNumDefault !== null) return -1;
			if (aNumDefault === null && bNumDefault === null) return a.name.localeCompare(b.name);
			return aNumDefault! - bNumDefault!;
		});
	}

	let filteredCards = displayedCards;
	$: if ($filterName || $filterNumero || $filterRarity || $filterSet || $filterType || $filterSupertype || $filterArtist || $displayAll || $sortBy || $sortOrder || $mostExpensiveOnly) {
		filteredCards = displayedCards.filter(card => {
			const cardSet = sets.find(s => s.name === card.setName);
			// Si le set de la carte n'est pas trouvé, créons un set factice
			const fallbackSet: Set = cardSet || {
				name: card.setName,
				logo: '',
				printedTotal: 0,
				releaseDate: new Date()
			};
			return isVisible(card, pokemons.find(p => p.id === card.pokemonNumber), fallbackSet);
		});
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
		$mostExpensiveOnly,
		$sortBy !== 'sort-pokedex'
	].filter(Boolean).length;

	let visibleCardsCount = 0;
	let uniquePokemonCount = 0;
	$: {
		if (filteredCards) {
			visibleCardsCount = filteredCards.length;
			uniquePokemonCount = new Set(filteredCards.filter(card => card.supertype === 'Pokémon').map(card => card.pokemonNumber)).size;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showFilters) {
			showFilters = false;
		}
	}
</script>

<svelte:window bind:innerWidth={clientWidth} on:keydown={handleKeydown}/>
<svelte:body style:overflow={showFilters ? 'hidden' : 'auto'}/>

{#if showFilters}
	<!-- Overlay -->
	<div
		aria-hidden={!showFilters}
		class="filter-overlay fixed inset-0 z-50 bg-black/70 transition-all duration-300"
		transition:fade={{ duration: 200 }}
		on:click={() => showFilters = false}
		on:keydown={handleKeydown}
	></div>
	<!-- Drawer -->
	<div class="fixed top-0 h-screen w-full md:w-[450px] bg-gray-800 z-60 shadow-lg flex flex-col {showFilters ? 'right-0' : '-right-[380px]'} transition-all duration-300 z-50" transition:fly={{ x: 380, duration: 300 }}>
		<div class="flex justify-between items-center p-4 border-b border-white/10">
			<h2 class="m-0 text-xl text-[#FFB700] font-semibold">Filters</h2>
			<button class="bg-transparent border-none text-white p-1 rounded hover:bg-white/10 transition-colors flex items-center justify-center" on:click={() => showFilters = false}>
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
	<div class="flex flex-col md:flex-row justify-between items-center pb-3 px-10 mb-0">
		<!-- Left Side (Title conditional based on prop, Counts always present) -->
		<div class="flex items-center gap-3 md:ml-14">
			{#if pageTitle}
				<PageTitle title={pageTitle}/>
			{/if}
			<!-- Desktop Counts (always rendered in this position) -->
			<span class:ml-4={!!pageTitle} class="text-gold-400 text-sm hidden md:block">
				({uniquePokemonCount} Pokémon, {visibleCardsCount} cards)
			</span>
		</div>

		<!-- Right Side (Controls) -->
		<div class="flex items-end gap-2">
			<!-- Mobile Count -->
			<span class="text-gold-400 text-sm ml-4 md:hidden">
				({uniquePokemonCount} Pokémon, {visibleCardsCount} cards)
			</span>
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
					onClick={() => showFilters = true}
					isActive={activeFiltersCount > 0}
					class="px-4"
				>
					<SlidersHorizontalIcon size={16}/> Filters
				</Button>
				{#if activeFiltersCount > 0}
					<span class="absolute -bottom-1 -right-1 bg-[#FFB700] text-black text-xs font-bold flex items-center justify-center w-5 h-5 rounded-full pointer-events-none z-20">
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
				<RotateCcwIcon size={16}/>
			</Button>
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
		<CardComponent card={item} {pokemons} {sets} />

		<div slot="empty">
			<p class="text-white text-center mt-32 text-2xl">No cards found</p>
		</div>
	</VirtualGrid>
</div>
