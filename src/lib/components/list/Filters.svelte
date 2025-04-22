<script lang="ts">
	import { filterArtist, filterNumero, filterRarity, filterSet, filterSupertype, filterType, mostExpensiveOnly, sortBy, sortOrder } from '$helpers/filters';
	import type { Set } from '$lib/types';
	import { onMount } from 'svelte';
	import { filterStates } from '$stores/filterStates';

	import Button from '$lib/components/filters/Button.svelte';
	import Section from '$lib/components/filters/Section.svelte';
	import Select from '$lib/components/filters/Select.svelte';
	import SortControl from '$lib/components/filters/SortControl.svelte';
	import TextInput from '$lib/components/filters/TextInput.svelte';

	// Log the initial store value when the script runs
	console.log('[Filters.svelte] Initial $sortBy:', $sortBy);

	export let artists: string[] = [];
	export let rarities: string[];
	export let sets: Set[];
	export let types: string[];

	// Inputs text variables
	let debounceTimeout: number;
	let searchNumero = '';

	// Initialize search values from stores when component is loaded
	onMount(() => {
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

	const debouncedSetFilterNumero = debounce((value: string) => {
		$filterNumero = value;
	}, 300);

	// Options for sorting
	const sortOptions = [
		{ value: 'sort-artist', label: 'Illustrator' },
		{ value: 'sort-id', label: 'ID' },
		{ value: 'sort-name', label: 'Name' },
		{ value: 'sort-pokedex', label: 'Pokédex' },
		{ value: 'sort-price', label: 'Price' },
		{ value: 'sort-rarity', label: 'Rarity' },
		{ value: 'sort-release-date', label: 'Release Date' }
	];

	// Options for card types
	const supertypeOptions = [
		{ value: 'all', label: 'All supertypes' },
		{ value: 'energy', label: 'Energy' },
		{ value: 'pokémon', label: 'Pokémon' },
		{ value: 'trainer', label: 'Trainer' }
	];

	// Prepare options for types, rarities, sets and illustrators
	$: artistOptions = [
		{ value: 'all', label: 'All illustrators' },
		...artists.map(artist => ({ value: artist.toLowerCase(), label: artist }))
	];

	$: rarityOptions = [
		{ value: 'all', label: 'All rarities' },
		...rarities.map(rarity => ({ value: rarity.toLowerCase(), label: rarity }))
	];

	$: setOptions = [
		{ value: 'all', label: 'All sets' },
		...sets.map(set => ({ value: set.name.toLowerCase(), label: set.name }))
	];

	$: typeOptions = [
		{ value: 'all', label: 'All types' },
		...types.map(type => ({ value: type.toLowerCase(), label: type }))
	];
</script>

<div class="w-full">
	<Section title="Basic Filters" bind:isOpen={$filterStates.basicFilters}>
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
					class="w-full"
					isActive={$mostExpensiveOnly}
					onClick={() => $mostExpensiveOnly = !$mostExpensiveOnly}
				>
					{$mostExpensiveOnly ? 'Show All Cards' : 'Most Expensive Only'}
				</Button>
			</div>
		</div>
	</Section>

	<Section title="Type Filters" bind:isOpen={$filterStates.typeFilters}>
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

	<Section title="Collection Filters" bind:isOpen={$filterStates.collectionFilters}>
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
