<script lang="ts">
	import {displayAll, filterName, filterNumero, filterRarity, filterSet, filterType, isVisible, sortBy, sortOrder} from '$helpers/filters.js';
	import type {Card, Set} from '~/types.js';

	export let cards: Card[];
	export let sets: Set[];
	export let rarities: string[];
	export let types: string[];

	let searchName = '';
	let searchNumero = '';
	let debounceTimeout: number;

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
		searchNumero = '';
		searchName = '';
		$filterNumero = '';
		$filterName = '';
		$filterSet = 'all';
		$filterType = 'all';
		$filterRarity = 'all';
		$displayAll = true;
	}

	let visibleCardsCount = 0;
	let uniquePokemonCount = 0;
	$: if ($filterName || $filterNumero || $filterRarity || $filterSet || $filterType || $displayAll) {
		const visibleCards = cards.filter(isVisible);
		visibleCardsCount = visibleCards.length;
		uniquePokemonCount = new Set(visibleCards.map(card => card.pokemon.id)).size;
	}

</script>

<div class="flex items-center gap-4 max-lg:flex-col max-lg:gap-1.5">
	<button class="sort-order-btn fill-white !w-8 hover:fill-black" on:click={() => $sortOrder = $sortOrder === 'asc' ? 'desc' : 'asc'}>
		<svg class="inline align-text-top" height="1em" viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg">
			{#if $sortOrder === 'asc'}
				<path d="M151.6 42.4C145.5 35.8 137 32 128 32s-17.5 3.8-23.6 10.4l-88 96c-11.9 13-11.1 33.3 2 45.2s33.3 11.1 45.2-2L96 146.3V448c0 17.7 14.3 32 32 32s32-14.3 32-32V146.3l32.4 35.4c11.9 13 32.2 13.9 45.2 2s13.9-32.2 2-45.2l-88-96zM320 480h32c17.7 0 32-14.3 32-32s-14.3-32-32-32H320c-17.7 0-32 14.3-32 32s14.3 32 32 32zm0-128h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H320c-17.7 0-32 14.3-32 32s14.3 32 32 32zm0-128H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H320c-17.7 0-32 14.3-32 32s14.3 32 32 32zm0-128H544c17.7 0 32-14.3 32-32s-14.3-32-32-32H320c-17.7 0-32 14.3-32 32s14.3 32 32 32z"/>
			{:else}
				<path d="M151.6 469.6C145.5 476.2 137 480 128 480s-17.5-3.8-23.6-10.4l-88-96c-11.9-13-11.1-33.3 2-45.2s33.3-11.1 45.2 2L96 365.7V64c0-17.7 14.3-32 32-32s32 14.3 32 32V365.7l32.4-35.4c11.9-13 32.2-13.9 45.2-2s13.9 32.2 2 45.2l-88 96zM320 480c-17.7 0-32-14.3-32-32s14.3-32 32-32h32c17.7 0 32 14.3 32 32s-14.3 32-32 32H320zm0-128c-17.7 0-32-14.3-32-32s14.3-32 32-32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H320zm0-128c-17.7 0-32-14.3-32-32s14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H320zm0-128c-17.7 0-32-14.3-32-32s14.3-32 32-32H544c17.7 0 32 14.3 32 32s-14.3 32-32 32H320z"/>
			{/if}
		</svg>
	</button>
	<button class="reset-btn" on:click={resetFilters}>Reset filters</button>
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
	</div>

	<select bind:value={$sortBy} class="filter" id="sort" name="sort">
		<option selected value="sort-numero">Sort by pokédex</option>
		<option value="sort-price">Sort by price</option>
		<option value="sort-name">Sort by name</option>
		<option value="sort-id">Sort by id</option>
		<option value="sort-rarity">Sort by rarity</option>
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

	.reset-btn, .sort-order-btn {
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

	@media (max-width: 1024px) {
		input, select, .reset-btn, .sort-order-btn {
			border-width: 2px;
			font-size: 0.8rem;
		}
	}

	@media (max-width: 420px) {
		input, select, .reset-btn, .sort-order-btn {
			font-size: 0.7rem;
			height: 0.8rem;
			line-height: 0;
			padding: 0.1rem 0.2rem;
			width: 8rem;
		}
	}

	.reset-btn:hover, .sort-order-btn:hover {
		background-size: 100% 100%;
		color: #000;
		cursor: pointer;
		font-weight: 500;
	}
</style>
