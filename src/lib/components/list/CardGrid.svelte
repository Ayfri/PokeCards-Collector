<script lang="ts">
	import "~/styles/colors.css";
	import {displayAll, filterName, filterNumero, filterRarity, filterSet, filterSupertype, filterType, filterArtist, isVisible, mostExpensiveOnly, sortBy, sortOrder} from '$helpers/filters';
	import {getRarityLevel} from '$helpers/rarity';
	import CardComponent from '@components/list/Card.svelte';
	import Filters from '@components/list/Filters.svelte';
	import VirtualGrid from '@components/list/VirtualGrid.svelte';
	import PageTitle from '@components/PageTitle.svelte';
	import ScrollProgress from '@components/list/ScrollProgress.svelte';
	import type {FullCard, Set, Pokemon} from '$lib/types';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import XIcon from 'lucide-svelte/icons/x';
	import SlidersHorizontalIcon from 'lucide-svelte/icons/sliders-horizontal';

	export let cards: FullCard[];
	export let sets: Set[];
	export let pokemons: Pokemon[];
	export let rarities: string[];
	export let types: string[];
	export let artists: string[] = [];

	let clientWidth: number = 0;
	let showFilters = false;
	let filterOverlay = false;

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

{#if showFilters}
	<!-- Overlay -->
	<div
		class="filter-overlay {filterOverlay ? 'active' : ''}"
		on:click={handleClickOutside}
	></div>

	<!-- Drawer -->
	<div class="filter-drawer {showFilters ? 'open' : ''}" transition:fly={{ x: 380, duration: 300 }}>
		<div class="drawer-header">
			<h2>Filters</h2>
			<button class="close-btn" on:click={toggleFilters}>
				<XIcon size={20} />
			</button>
		</div>
		<div class="drawer-content">
			<Filters cards={filteredCards} {rarities} {sets} {types} {artists} {pokemons} />
		</div>
	</div>
{/if}

<div class="main-content">
	<div class="filter-header">
		<div class="flex items-center gap-3">
			<PageTitle title="Card List"/>
			<span class="text-gold-400 text-sm">
				({uniquePokemonCount} Pokémon, {visibleCardsCount} cards)
			</span>
		</div>

		<div class="flex items-center gap-2">
			{#if activeFiltersCount > 0}
				<span class="filter-badge">{activeFiltersCount}</span>
			{/if}
			<button class="filter-toggle-btn" on:click={toggleFilters}>
				<SlidersHorizontalIcon size={16} class="mr-1"/> Filters
			</button>
		</div>
	</div>

	<div class="progress-wrapper">
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
	.main-content {
		min-height: calc(100vh - 130px);
		display: flex;
		flex-direction: column;
	}

	.filter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 2rem;
		margin-bottom: 0;
		border-bottom: none;
	}

	.filter-toggle-btn {
		background-color: transparent;
		border: 2px solid #FFB700;
		color: #FFB700;
		font-size: 0.8rem;
		font-weight: 500;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
	}

	.filter-toggle-btn:hover {
		background-color: #FFB700;
		color: black;
	}

	.filter-badge {
		background-color: #FFB700;
		color: black;
		font-size: 0.7rem;
		font-weight: bold;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
	}

	.filter-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0);
		z-index: 50;
		visibility: hidden;
		transition: background-color 0.3s ease, visibility 0.3s ease;
	}

	.filter-overlay.active {
		background-color: rgba(0, 0, 0, 0.7);
		visibility: visible;
	}

	.filter-drawer {
		position: fixed;
		top: 0;
		right: -380px;
		width: 380px;
		height: 100vh;
		background-color: rgb(20, 20, 20);
		z-index: 60;
		box-shadow: -2px 0 10px rgba(0, 0, 0, 0.5);
		transition: right 0.3s ease;
		display: flex;
		flex-direction: column;
	}

	.filter-drawer.open {
		right: 0;
	}

	.drawer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.drawer-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: #FFB700;
		font-weight: 600;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: #fff;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background-color 0.2s ease;
	}

	.close-btn:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	@media (max-width: 640px) {
		.filter-drawer {
			width: 320px;
			right: -320px;
		}
	}

	.progress-wrapper {
		width: 100%;
	}
</style>
