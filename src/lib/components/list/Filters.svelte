<script lang="ts">
	import { displayAll, filterName, filterNumero, filterRarity, filterSet, filterSupertype, filterType, filterArtist, isVisible, mostExpensiveOnly, sortBy, sortOrder } from '$helpers/filters';
	import type { FullCard, Set, Pokemon } from '$lib/types';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import Section from '$lib/components/filters/Section.svelte';
	import Select from '$lib/components/filters/Select.svelte';
	import TextInput from '$lib/components/filters/TextInput.svelte';
	import Button from '$lib/components/filters/Button.svelte';
	import SortControl from '$lib/components/filters/SortControl.svelte';

	export let cards: FullCard[];
	export let sets: Set[];
	export let pokemons: Pokemon[];
	export let rarities: string[];
	export let types: string[];
	export let artists: string[] = [];

	// Collapsibles sections
	let showBasicFilters = true;
	let showTypeFilters = false;
	let showCollectionFilters = false;

	// Inputs text variables
	let searchName = '';
	let searchNumero = '';
	let debounceTimeout: number;

	// Initialize search values from stores when component is loaded
	onMount(() => {
		searchName = $filterName;
		searchNumero = $filterNumero;
	});

	// Debounce functions
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

		// Update local variables
		searchName = '';
		searchNumero = '';
	}

	// Options for sorting
	const sortOptions = [
		{ value: 'sort-numero', label: 'Pokédex' },
		{ value: 'sort-price', label: 'Price' },
		{ value: 'sort-name', label: 'Name' },
		{ value: 'sort-id', label: 'ID' },
		{ value: 'sort-rarity', label: 'Rarity' },
		{ value: 'sort-release-date', label: 'Release Date' },
		{ value: 'sort-artist', label: 'Illustrator' }
	];

	// Options for card types
	const supertypeOptions = [
		{ value: 'all', label: 'All supertypes' },
		{ value: 'pokémon', label: 'Pokémon' },
		{ value: 'trainer', label: 'Trainer' },
		{ value: 'energy', label: 'Energy' }
	];

	// Prepare options for types, rarities, sets and illustrators
	$: typeOptions = [
		{ value: 'all', label: 'All types' },
		...types.map(type => ({ value: type.toLowerCase(), label: type }))
	];

	$: rarityOptions = [
		{ value: 'all', label: 'All rarities' },
		...rarities.map(rarity => ({ value: rarity.toLowerCase(), label: rarity }))
	];

	$: setOptions = [
		{ value: 'all', label: 'All sets' },
		...sets.map(set => ({ value: set.name.toLowerCase(), label: set.name }))
	];

	$: artistOptions = [
		{ value: 'all', label: 'All illustrators' },
		...artists.map(artist => ({ value: artist.toLowerCase(), label: artist }))
	];

	let visibleCardsCount = 0;
	let uniquePokemonCount = 0;
	let pokemonCardsCount = 0;
	let trainerCardsCount = 0;
	let energyCardsCount = 0;

	// Update counters when cards or filters change
	$: {
		// This instruction ensures that this block will trigger when any filter changes
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

<div class="w-full">
	<Section title="Basic Filters" bind:isOpen={showBasicFilters}>
		<div class="flex flex-col gap-4">
			<div class="flex flex-wrap gap-4">
				<SortControl
					bind:sortDirection={$sortOrder}
					bind:sortValue={$sortBy}
					options={sortOptions}
				/>
			</div>

			<div class="flex flex-wrap gap-4 sm:flex-row flex-col">
				<TextInput
					id="numero"
					label="ID"
					bind:value={searchNumero}
					placeholder="Enter card ID..."
					debounceFunction={debouncedSetFilterNumero}
				/>
			</div>

			<div class="flex flex-wrap gap-4 sm:flex-row flex-col">
				<Button
					isActive={$mostExpensiveOnly}
					onClick={() => $mostExpensiveOnly = !$mostExpensiveOnly}
				>
					{$mostExpensiveOnly ? 'Show All Cards' : 'Most Expensive Only'}
				</Button>
			</div>
		</div>
	</Section>

	<Section title="Type Filters" bind:isOpen={showTypeFilters}>
		<div class="flex flex-wrap gap-4 sm:flex-row flex-col">
			<Select
				id="supertype"
				label="Card Type"
				bind:value={$filterSupertype}
				options={supertypeOptions}
			/>

			<Select
				id="type"
				label="Pokémon Type"
				bind:value={$filterType}
				options={typeOptions}
			/>

			<Select
				id="rarity"
				label="Rarity"
				bind:value={$filterRarity}
				options={rarityOptions}
			/>
		</div>
	</Section>

	<Section title="Collection Filters" bind:isOpen={showCollectionFilters}>
		<div class="flex flex-wrap gap-4 sm:flex-row flex-col">
			<Select
				id="set"
				label="Set"
				bind:value={$filterSet}
				options={setOptions}
			/>

			<Select
				id="artist"
				label="Illustrator"
				bind:value={$filterArtist}
				options={artistOptions}
			/>
		</div>
	</Section>
</div>
