<script lang="ts">
	import {displayAll, filterName, filterNumero, filterRarity, filterSet, filterSupertype, filterType, filterArtist, isVisible, mostExpensiveOnly, sortBy, sortOrder} from '$helpers/filters';
	import type {FullCard, Set, Pokemon} from '$lib/types';
	import ArrowUpDown from 'lucide-svelte/icons/arrow-up-down';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	export let cards: FullCard[];
	export let sets: Set[];
	export let pokemons: Pokemon[];
	export let rarities: string[];
	export let types: string[];
	export let artists: string[] = [];

	let searchName = '';
	let searchNumero = '';
	let debounceTimeout: number;

	// Sections collapsibles
	let showBasicFilters = true;
	let showTypeFilters = false;
	let showCollectionFilters = false;

	// Initialiser les valeurs de recherche à partir des stores lors du chargement du composant
	onMount(() => {
		searchName = $filterName;
		searchNumero = $filterNumero;
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

	const debouncedSetFilterNumero = debounce((value: string) => {
		$filterNumero = value;
	}, 300);

	function resetFilters() {
		$filterNumero = '';
		$filterName = '';
		$filterSet = 'all';
		$filterType = 'all';
		$filterRarity = 'all';
		$filterSupertype = 'all';
		$filterArtist = 'all';
		$displayAll = true;
		$mostExpensiveOnly = false;

		// Mettre à jour les variables locales pour qu'elles soient synchronisées avec les stores
		searchNumero = '';
		searchName = '';
	}

	function toggleMostExpensiveOnly() {
		$mostExpensiveOnly = !$mostExpensiveOnly;
	}

	let visibleCardsCount = 0;
	let uniquePokemonCount = 0;
	let pokemonCardsCount = 0;
	let trainerCardsCount = 0;
	let energyCardsCount = 0;

	// Mettre à jour les compteurs quand les cartes ou les filtres changent
	$: {
		// Cette instruction garantit que ce bloc se déclenchera quand n'importe quel filtre change
		const _ = [$filterName, $filterNumero, $filterRarity, $filterSet, $filterType, $filterSupertype, $filterArtist, $displayAll, $sortBy, $sortOrder, $mostExpensiveOnly];

		if (cards) {
			const visibleCards = cards.filter(card => isVisible(card, pokemons.find(p => p.id === card.pokemonNumber)!!, sets.find(s => s.name === card.setName)!!));
			visibleCardsCount = visibleCards.length;
			uniquePokemonCount = new Set(visibleCards.filter(card => card.supertype === 'Pokémon').map(card => card.pokemonNumber)).size;

			// Count by supertype
			pokemonCardsCount = visibleCards.filter(card => card.supertype === 'Pokémon').length;
			trainerCardsCount = visibleCards.filter(card => card.supertype === 'Trainer').length;
			energyCardsCount = visibleCards.filter(card => card.supertype === 'Energy').length;
		}
	}

	const stats = page.data.stats;
</script>

<div class="filters-layout">
	<!-- Primary Filters Section -->
	<div class="filter-section">
		<div class="filter-section-header" on:click={() => showBasicFilters = !showBasicFilters}>
			<h3>Basic Filters</h3>
			{#if showBasicFilters}
				<ChevronUp size={16} />
			{:else}
				<ChevronDown size={16} />
			{/if}
		</div>

		{#if showBasicFilters}
			<div class="filter-section-content">
				<div class="filter-row">
					<div class="form-group sort-container">
						<label for="sort">Sort by</label>
						<div class="sort-controls">
							<button class="sort-order-btn" on:click={() => $sortOrder = $sortOrder === 'asc' ? 'desc' : 'asc'}>
								<ArrowUpDown class={$sortOrder === 'asc' ? 'rotate-180' : ''} size={16} />
							</button>
							<select bind:value={$sortBy} class="filter-select {$sortBy !== 'sort-numero' ? 'filter-active' : ''}" id="sort">
								<option value="sort-numero">Pokédex</option>
								<option value="sort-price">Price</option>
								<option value="sort-name">Name</option>
								<option value="sort-id">ID</option>
								<option value="sort-rarity">Rarity</option>
								<option value="sort-release-date">Release Date</option>
								<option value="sort-artist">Illustrator</option>
							</select>
						</div>
					</div>
				</div>

				<div class="filter-row">
					<div class="form-group">
						<label for="numero">ID</label>
						<input
							bind:value={searchNumero}
							on:input={(e) => debouncedSetFilterNumero(e.currentTarget.value)}
							class="filter-input {searchNumero ? 'filter-active' : ''}"
							id="numero"
							type="text"
							placeholder="Enter card ID..."
						>
					</div>

					<div class="form-group">
						<label for="name">Name</label>
						<input
							bind:value={searchName}
							on:input={(e) => debouncedSetFilterName(e.currentTarget.value)}
							class="filter-input {searchName ? 'filter-active' : ''}"
							id="name"
							type="text"
							placeholder="Search by name..."
						>
					</div>
				</div>

				<div class="filter-row">
					<button class="action-button" on:click={resetFilters}>Reset All</button>
					<button class="action-button {$mostExpensiveOnly ? 'active' : ''}" on:click={toggleMostExpensiveOnly}>
						{$mostExpensiveOnly ? 'Show All Cards' : 'Most Expensive Only'}
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Type Filters Section -->
	<div class="filter-section">
		<div class="filter-section-header" on:click={() => showTypeFilters = !showTypeFilters}>
			<h3>Type Filters</h3>
			{#if showTypeFilters}
				<ChevronUp size={16} />
			{:else}
				<ChevronDown size={16} />
			{/if}
		</div>

		{#if showTypeFilters}
			<div class="filter-section-content">
				<div class="filter-row">
					<div class="form-group">
						<label for="supertype">Card Type</label>
						<select bind:value={$filterSupertype} class="filter-select {$filterSupertype !== 'all' ? 'filter-active' : ''}" id="supertype">
							<option value="all">All supertypes</option>
							<option value="pokémon">Pokémon</option>
							<option value="trainer">Trainer</option>
							<option value="energy">Energy</option>
						</select>
					</div>

					<div class="form-group">
						<label for="type">Pokémon Type</label>
						<select bind:value={$filterType} class="filter-select {$filterType !== 'all' ? 'filter-active' : ''}" id="type">
							<option value="all">All types</option>
							{#each types as type}
								<option value={type.toLowerCase()}>{type}</option>
							{/each}
						</select>
					</div>

					<div class="form-group">
						<label for="rarity">Rarity</label>
						<select bind:value={$filterRarity} class="filter-select {$filterRarity !== 'all' ? 'filter-active' : ''}" id="rarity">
							<option value="all">All rarities</option>
							{#each rarities as rarity}
								<option value={rarity.toLowerCase()}>{rarity}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Collection Filters Section -->
	<div class="filter-section">
		<div class="filter-section-header" on:click={() => showCollectionFilters = !showCollectionFilters}>
			<h3>Collection Filters</h3>
			{#if showCollectionFilters}
				<ChevronUp size={16} />
			{:else}
				<ChevronDown size={16} />
			{/if}
		</div>

		{#if showCollectionFilters}
			<div class="filter-section-content">
				<div class="filter-row">
					<div class="form-group">
						<label for="set">Set</label>
						<select bind:value={$filterSet} class="filter-select {$filterSet !== 'all' ? 'filter-active' : ''}" id="set">
							<option value="all">All sets</option>
							{#each sets as set}
								<option value={set.name.toLowerCase()}>{set.name}</option>
							{/each}
						</select>
					</div>

					<div class="form-group">
						<label for="artist">Illustrator</label>
						<select bind:value={$filterArtist} class="filter-select {$filterArtist !== 'all' ? 'filter-active' : ''}" id="artist">
							<option value="all">All illustrators</option>
							{#each artists as artist}
								<option value={artist.toLowerCase()}>{artist}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.filters-layout {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.filter-section {
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}

	.filter-section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		cursor: pointer;
		background: rgba(0, 0, 0, 0.3);
	}

	.filter-section-header:hover {
		background: rgba(0, 0, 0, 0.4);
	}

	.filter-section-header h3 {
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0;
		color: #FFB700;
	}

	.filter-section-content {
		padding: 0.75rem;
	}

	.filter-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.filter-row:last-child {
		margin-bottom: 0;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 8rem;
		flex: 1;
	}

	.sort-container {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sort-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sort-controls select {
		flex: 1;
	}

	label {
		font-size: 0.75rem;
		color: #ccc;
	}

	.filter-input, .filter-select {
		background: transparent;
		border: 2px solid #FFF;
		border-radius: 4px;
		color: white;
		font-size: 0.8rem;
		height: 2rem;
		padding: 0 0.5rem;
		width: 100%;
		transition: all 0.2s ease;
	}

	.filter-input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	.filter-input:focus, .filter-select:focus {
		outline: none;
		border-color: #FFB700;
	}

	.filter-active {
		border-color: #FFB700;
		color: #FFB700;
	}

	.action-button {
		background: transparent;
		border: 2px solid #FFF;
		border-radius: 4px;
		color: white;
		font-size: 0.8rem;
		padding: 0.25rem 0.75rem;
		height: 2rem;
		flex: 1;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action-button:hover {
		background: rgba(255, 183, 0, 0.2);
		border-color: #FFB700;
		cursor: pointer;
	}

	.action-button.active {
		background: #FFB700;
		border-color: #FFB700;
		color: black;
	}

	.sort-order-btn {
		background: transparent;
		border: 2px solid #FFF;
		border-radius: 4px;
		height: 2rem;
		width: 2.5rem;
		min-width: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		color: white;
	}

	.sort-order-btn:hover {
		border-color: #FFB700;
		cursor: pointer;
	}

	select option {
		background-color: black;
		color: white;
	}

	@media (max-width: 640px) {
		.filter-row {
			flex-direction: column;
			gap: 0.5rem;
		}

		.form-group {
			width: 100%;
		}
	}
</style>
