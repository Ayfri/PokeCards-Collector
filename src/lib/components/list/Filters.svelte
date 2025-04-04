<script lang="ts">
	import {displayAll, filterName, filterNumero, filterRarity, filterSet, filterSupertype, filterType, isVisible, mostExpensiveOnly, sortBy, sortOrder} from '$helpers/filters';
	import type {FullCard, Set} from '~/lib/types';
	import { ArrowUpDown } from 'lucide-svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	export let cards: FullCard[];
	export let sets: Set[];
	export let rarities: string[];
	export let types: string[];

	let searchName = '';
	let searchNumero = '';
	let debounceTimeout: number;

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
		const _ = [$filterName, $filterNumero, $filterRarity, $filterSet, $filterType, $filterSupertype, $displayAll, $sortBy, $sortOrder, $mostExpensiveOnly];
		
		if (cards) {
			const visibleCards = cards.filter(isVisible);
			visibleCardsCount = visibleCards.length;
			uniquePokemonCount = new Set(visibleCards.filter(card => card.supertype === 'Pokémon').map(card => card.numero)).size;
			
			// Count by supertype
			pokemonCardsCount = visibleCards.filter(card => card.supertype === 'Pokémon').length;
			trainerCardsCount = visibleCards.filter(card => card.supertype === 'Trainer').length;
			energyCardsCount = visibleCards.filter(card => card.supertype === 'Energy').length;
		}
	}

	const stats = page.data.stats;
</script>

<div class="flex items-center gap-4 max-lg:flex-col max-lg:gap-1.5">
	<button class="sort-order-btn fill-white !w-8 flex justify-center items-center hover:fill-black" on:click={() => $sortOrder = $sortOrder === 'asc' ? 'desc' : 'asc'}>
		<ArrowUpDown class={$sortOrder === 'asc' ? 'rotate-180' : ''} size={16} />
	</button>
	<button class="reset-btn" on:click={resetFilters}>Reset filters</button>
	<button class="filter-btn {$mostExpensiveOnly ? 'active' : ''}" on:click={toggleMostExpensiveOnly}>
		Expensive Only
	</button>
	<input
		bind:value={searchNumero}
		on:input={(e) => debouncedSetFilterNumero(e.currentTarget.value)}
		class="filter"
		id="numero"
		name="numero"
		placeholder="ID"
		type="text"
	>
	<input
		bind:value={searchName}
		on:input={(e) => debouncedSetFilterName(e.currentTarget.value)}
		class="filter"
		id="name"
		name="name"
		placeholder="Name"
		type="text"
	>
</div>

<div class="flex items-center gap-4 max-lg:flex-col max-lg:gap-1.5">
	<div class="flex flex-col">
		<div class="text-gold-400 text-[1rem] font-semibold lg:mr-2 max-lg:-mb-2 max-sm:text-sm">Pokémon: <span>{uniquePokemonCount}</span></div>
		<div class="text-gold-400 text-[1rem] font-semibold lg:mr-2 max-lg:-mb-2 max-sm:text-sm">Cards: <span>{visibleCardsCount}</span></div>
		<div class="text-gold-400 text-[0.8rem] font-semibold lg:mr-2 max-lg:-mb-2 max-sm:text-sm">(Pokémon: {pokemonCardsCount}, Trainer: {trainerCardsCount}, Energy: {energyCardsCount})</div>
	</div>

	<select bind:value={$sortBy} class="filter" id="sort" name="sort">
		<option selected value="sort-numero">Sort by pokédex</option>
		<option value="sort-price">Sort by price</option>
		<option value="sort-name">Sort by name</option>
		<option value="sort-id">Sort by id</option>
		<option value="sort-rarity">Sort by rarity</option>
	</select>

	<select bind:value={$filterSupertype} class="filter" id="supertype" name="supertype">
		<option selected value="all">All supertypes</option>
		<option value="pokémon">Pokémon</option>
		<option value="trainer">Trainer</option>
		<option value="energy">Energy</option>
	</select>
	
	<select bind:value={$filterSet} class="filter" id="set" name="set">
		<option selected value="all">All sets</option>
		{#each sets as set}
			<option value={set.name.toLowerCase()}>{set.name}</option>
		{/each}
	</select>

	<select bind:value={$filterType} class="filter" id="type" name="type">
		<option selected value="all">All types</option>
		{#each types as type}
			<option value={type.toLowerCase()}>{type}</option>
		{/each}
	</select>

	<select bind:value={$filterRarity} class="filter" id="rarity" name="rarity">
		<option selected value="all">All rarities</option>
		{#each rarities as rarity}
			<option value={rarity.toLowerCase()}>{rarity}</option>
		{/each}
	</select>
</div>

<style>
	select:hover {
		cursor: pointer;
	}

	input::placeholder {
		color: white;
		opacity: 1;
	}

	input, select, button {
		font-size: 0.8rem;
	}

	input, select {
		background: transparent;
		border: 3px solid #FFF;
		border-radius: 4px;
		box-sizing: content-box;
		color: white;
		font-family: "Clash Display", serif;
		font-weight: 500;
		height: 1rem;
		padding: 0.2rem 0.4rem;
		width: 10rem;
	}

	select option {
		background-color: black;
	}

	input:focus {
		outline: none;
	}

	.reset-btn, .sort-order-btn, .filter-btn {
		background-color: transparent;
		background-image: linear-gradient(to right, #FFF, #FFF);
		background-position: 0 100%;
		background-repeat: no-repeat;
		background-size: 100% 0;
		border: 3px solid #FFF;
		border-radius: 4px;
		box-sizing: content-box;
		color: white;
		font-weight: 500;
		height: 1rem;
		padding: 0.2rem 0.4rem;
		transition: background-size 0.4s cubic-bezier(0.22, 1, 0.36, 1), color 0.4s cubic-bezier(0.22, 1, 0.36, 1);
		width: 10rem;
	}

	.filter-btn.active {
		background-size: 100% 100%;
		color: #000;
	}

	@media (max-width: 1024px) {
		input, select, .reset-btn, .sort-order-btn, .filter-btn {
			border-width: 2px;
			font-size: 0.8rem;
		}
	}

	@media (max-width: 420px) {
		input, select, .reset-btn, .sort-order-btn, .filter-btn {
			font-size: 0.7rem;
			height: 0.8rem;
			line-height: 0;
			padding: 0.1rem 0.2rem;
			width: 8rem;
		}
	}

	.reset-btn:hover, .sort-order-btn:hover, .filter-btn:hover {
		background-size: 100% 100%;
		color: #000;
		cursor: pointer;
		font-weight: 500;
	}
</style>
