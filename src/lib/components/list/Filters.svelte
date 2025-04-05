<script lang="ts">
	import {displayAll, filterName, filterNumero, filterRarity, filterSet, filterSupertype, filterType, filterArtist, isVisible, mostExpensiveOnly, sortBy, sortOrder} from '$helpers/filters';
	import type {FullCard, Set} from '~/lib/types';
	import { ArrowUpDown } from 'lucide-svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	export let cards: FullCard[];
	export let sets: Set[];
	export let rarities: string[];
	export let types: string[];
	export let artists: string[] = [];

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
	<div class="form-element-container">
		<button class="sort-order-btn fill-white !w-8 flex justify-center items-center hover:fill-black {$sortOrder !== 'asc' ? 'sort-active' : ''}" on:click={() => $sortOrder = $sortOrder === 'asc' ? 'desc' : 'asc'}>
			<ArrowUpDown class={$sortOrder === 'asc' ? 'rotate-180' : ''} size={16} />
		</button>
	</div>
	<div class="form-element-container">
		<button class="reset-btn" on:click={resetFilters}>Reset filters</button>
	</div>
	<div class="form-element-container">
		<button class="filter-btn {$mostExpensiveOnly ? 'active' : ''}" on:click={toggleMostExpensiveOnly}>
			Expensive Only
		</button>
	</div>
	<div class="form-element-container">
		<input
			bind:value={searchNumero}
			on:input={(e) => debouncedSetFilterNumero(e.currentTarget.value)}
			class="filter {searchNumero ? 'filter-active' : ''}"
			id="numero"
			name="numero"
			placeholder="ID"
			type="text"
		>
	</div>
	<div class="form-element-container">
		<input
			bind:value={searchName}
			on:input={(e) => debouncedSetFilterName(e.currentTarget.value)}
			class="filter {searchName ? 'filter-active' : ''}"
			id="name"
			name="name"
			placeholder="Name"
			type="text"
		>
	</div>
</div>

<div class="flex items-center gap-4 max-lg:flex-col max-lg:gap-1.5">
	<div class="flex flex-col">
		<div class="text-gold-400 text-[1rem] font-semibold lg:mr-2 max-lg:-mb-2 max-sm:text-sm">Pokémon: <span>{uniquePokemonCount}</span></div>
		<div class="text-gold-400 text-[1rem] font-semibold lg:mr-2 max-lg:-mb-2 max-sm:text-sm">Cards: <span>{visibleCardsCount}</span></div>
		<div class="text-gold-400 text-[0.8rem] font-semibold lg:mr-2 max-lg:-mb-2 max-sm:text-sm">(Pokémon: {pokemonCardsCount}, Trainer: {trainerCardsCount}, Energy: {energyCardsCount})</div>
	</div>

	<div class="form-element-container">
		<select bind:value={$sortBy} class="filter {$sortBy !== 'sort-numero' ? 'filter-active' : ''}" id="sort" name="sort">
			<option selected value="sort-numero">Sort by pokédex</option>
			<option value="sort-price">Sort by price</option>
			<option value="sort-name">Sort by name</option>
			<option value="sort-id">Sort by id</option>
			<option value="sort-rarity">Sort by rarity</option>
			<option value="sort-artist">Sort by illustrator</option>
		</select>
	</div>

	<div class="form-element-container">
		<select bind:value={$filterSupertype} class="filter {$filterSupertype !== 'all' ? 'filter-active' : ''}" id="supertype" name="supertype">
			<option selected value="all">All supertypes</option>
			<option value="pokémon">Pokémon</option>
			<option value="trainer">Trainer</option>
			<option value="energy">Energy</option>
		</select>
	</div>
	
	<div class="form-element-container">
		<select bind:value={$filterSet} class="filter {$filterSet !== 'all' ? 'filter-active' : ''}" id="set" name="set">
			<option selected value="all">All sets</option>
			{#each sets as set}
				<option value={set.name.toLowerCase()}>{set.name}</option>
			{/each}
		</select>
	</div>

	<div class="form-element-container">
		<select bind:value={$filterType} class="filter {$filterType !== 'all' ? 'filter-active' : ''}" id="type" name="type">
			<option selected value="all">All types</option>
			{#each types as type}
				<option value={type.toLowerCase()}>{type}</option>
			{/each}
		</select>
	</div>

	<div class="form-element-container">
		<select bind:value={$filterRarity} class="filter {$filterRarity !== 'all' ? 'filter-active' : ''}" id="rarity" name="rarity">
			<option selected value="all">All rarities</option>
			{#each rarities as rarity}
				<option value={rarity.toLowerCase()}>{rarity}</option>
			{/each}
		</select>
	</div>

	<div class="form-element-container">
		<select bind:value={$filterArtist} class="filter {$filterArtist !== 'all' ? 'filter-active' : ''}" id="artist" name="artist">
			<option selected value="all">All illustrators</option>
			{#each artists as artist}
				<option value={artist.toLowerCase()}>{artist}</option>
			{/each}
		</select>
	</div>
</div>

<style>
	.form-element-container {
		height: 42px; /* Augmenté davantage */
		display: flex;
		align-items: center;
	}

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
		box-sizing: border-box;
		color: white;
		font-family: "Clash Display", serif;
		font-weight: 500;
		height: 1.8rem;
		line-height: 1.4rem;
		padding: 0.2rem 0.4rem;
		width: 10rem;
		transition: border-color 0.2s ease, color 0.2s ease;
	}

	.filter-active {
		border-color: #FFB700;
		color: #FFB700;
	}

	.sort-active {
		fill: #FFB700;
	}

	select option {
		background-color: black;
		color: white;
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
		box-sizing: border-box;
		color: white;
		font-weight: 500;
		height: 1.8rem;
		line-height: 1.4rem;
		padding: 0.2rem 0.4rem;
		transition: background-size 0.4s cubic-bezier(0.22, 1, 0.36, 1), color 0.4s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.2s ease;
		width: 10rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.filter-btn.active {
		background-size: 100% 100%;
		background-image: linear-gradient(to right, #FFB700, #FFB700);
		color: #000;
		border-color: #FFB700;
	}

	@media (max-width: 1024px) {
		.form-element-container {
			height: 36px; /* Augmenté pour contenir l'élément */
		}

		input, select, .reset-btn, .sort-order-btn, .filter-btn {
			border-width: 2px;
			font-size: 0.8rem;
			height: 1.6rem;
		}
	}

	@media (max-width: 420px) {
		.form-element-container {
			height: 32px; /* Augmenté pour contenir l'élément */
		}

		input, select, .reset-btn, .sort-order-btn, .filter-btn {
			font-size: 0.7rem;
			height: 1.4rem;
			line-height: normal;
			padding: 0.1rem 0.2rem;
			width: 8rem;
		}
	}

	.reset-btn:hover, .sort-order-btn:hover, .filter-btn:hover {
		background-size: 100% 100%;
		background-image: linear-gradient(to right, #FFB700, #FFB700);
		color: #000;
		cursor: pointer;
		font-weight: 500;
		border-color: #FFB700;
	}
</style>
