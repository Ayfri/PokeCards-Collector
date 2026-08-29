<script lang="ts">
	import { filterArtist, filterName, filterNumero, filterRarity, filterSet, filterSupertype, filterType, mostExpensiveOnly, sortBy, sortOrder } from '$helpers/filters';
	import type { Set } from '$lib/types';
	import { onMount } from 'svelte';
	import { filterStates } from '$stores/filterStates';
	import Button from '@components/filters/Button.svelte';
	import Section from '@components/filters/Section.svelte';
	import TextInput from '@components/filters/TextInput.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';

	interface Props {
		artists?: string[];
		rarities: string[];
		sets: Set[];
		types: string[];
	}

	let {
		artists = [],
		rarities,
		sets,
		types,
	}: Props = $props();

	// Inputs text variables
	let searchNumero = $state('');
	let searchName = $state('');
	let supertypeValue = $state('all');
	let pokemonTypeValue = $state('all');
	let sortDirectionValue: 'asc' | 'desc' = $state('asc');
	let sortValueValue: string = $state('sort-pokedex');
	let rarityValue = $state('all');
	let artistValue = $state('all');
	let setValue = $state('all');

	// Initialize search values from stores when component is loaded
	onMount(() => {
		searchNumero = $filterNumero;
		supertypeValue = $filterSupertype;
		pokemonTypeValue = $filterType;
		sortDirectionValue = $sortOrder;
		sortValueValue = $sortBy;
		rarityValue = $filterRarity;
		artistValue = $filterArtist;
		setValue = $filterSet;
		
		// Check URL parameters to properly set initial values for set filter
		const setParam = page.url.searchParams.get('set');
		if (setParam) {
			const decodedSetParam = decodeURIComponent(setParam);
			// Find the matching set with case-insensitive comparison
			const matchingSet = sets.find(set => set.name.toLowerCase() === decodedSetParam.toLowerCase());
			if (matchingSet) {
				setValue = matchingSet.name.toLowerCase();
			} else {
				setValue = decodedSetParam.toLowerCase();
			}
		}
	});

	function setFilterNumero(value: string) {
		$filterNumero = value;
	}

	function setFilterName(value: string) {
		$filterName = value;
	}

	/**
	 * Writes one filter param to the URL and navigates without a reload, keeping the focused control focused.
	 * A falsy `param` value (or `all`) drops the parameter instead of setting it.
	 */
	function applyFilterParam(param: string, value: string | null) {
		const url = new URL(page.url);
		if (value) {
			url.searchParams.set(param, value);
		} else {
			url.searchParams.delete(param);
		}

		const focusedId = (document.activeElement as HTMLElement | null)?.id;

		goto(url.toString(), { replaceState: true }).then(() => {
			if (focusedId) document.querySelector<HTMLElement>(`#${focusedId}`)?.focus();
		});
	}

	// Maps the internal supertype value to the shorter URL parameter value.
	const SUPERTYPE_URL_VALUES: Record<string, string> = {
		'pokémon': 'pokemon',
		trainer: 'trainer',
		energy: 'energy'
	};

	function handleSupertypeChange(event: Event) {
		const value = (event.target as HTMLSelectElement).value;
		$filterSupertype = value;
		supertypeValue = value;
		applyFilterParam('type', value === 'all' ? null : SUPERTYPE_URL_VALUES[value] || value);
	}

	function handlePokemonTypeChange(event: Event) {
		const value = (event.target as HTMLSelectElement).value;
		$filterType = value;
		pokemonTypeValue = value;
		applyFilterParam('pokemontype', value === 'all' ? null : value);
	}

	function handleSortValueChange(event: Event) {
		const value = (event.target as HTMLSelectElement).value;
		$sortBy = value;
		sortValueValue = value;
		applyFilterParam('sortby', value);
	}

	function toggleSortDirection() {
		const newDirection = sortDirectionValue === 'asc' ? 'desc' : 'asc';
		$sortOrder = newDirection;
		sortDirectionValue = newDirection;
		applyFilterParam('sortorder', newDirection);
	}

	function handleRarityChange(event: Event) {
		const value = (event.target as HTMLSelectElement).value;
		$filterRarity = value;
		rarityValue = value;
		applyFilterParam('rarity', value === 'all' ? null : value);
	}

	function handleArtistChange(event: Event) {
		const value = (event.target as HTMLSelectElement).value;
		$filterArtist = value;
		artistValue = value;
		applyFilterParam('artist', value === 'all' ? null : value);
	}

	function handleSetChange(event: Event) {
		const value = (event.target as HTMLSelectElement).value;
		$filterSet = value;
		setValue = value;
		applyFilterParam('set', value === 'all' ? null : value);
	}

	function toggleMostExpensiveOnly() {
		$mostExpensiveOnly = !$mostExpensiveOnly;
		applyFilterParam('mostexpensive', $mostExpensiveOnly ? 'true' : null);
	}

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
		{ value: 'pokémon', label: 'Pokémon' },
		{ value: 'trainer', label: 'Trainer' },
		{ value: 'energy', label: 'Energy' }
	];

	// Prepare options for types, rarities, sets and illustrators
	const artistOptions = $derived([
		{ value: 'all', label: 'All illustrators' },
		...artists.map(artist => ({ value: artist.toLowerCase(), label: artist }))
	]);

	const rarityOptions = $derived([
		{ value: 'all', label: 'All rarities' },
		...rarities.map(rarity => ({ value: rarity.toLowerCase(), label: rarity }))
	]);

	const setOptions = $derived([
		{ value: 'all', label: 'All sets' },
		...sets.map(set => ({ value: set.name.toLowerCase(), label: set.name }))
	]);

	const typeOptions = $derived([
		{ value: 'all', label: 'All types' },
		...types.map(type => ({ value: type.toLowerCase(), label: type }))
	]);
	
</script>

<div class="w-full">
	<Section title="Basic Filters" bind:isOpen={$filterStates.basicFilters}>
		<div class="flex flex-col gap-2 md:gap-4">
			<div class="flex flex-wrap gap-4">
				<div class="flex flex-col gap-1 min-w-32 flex-1">
					<label for="sort" class="text-xs text-gray-300">Sort by</label>
					<div class="flex items-center gap-2">
						<Button
							class="animated-hover-button relative overflow-hidden flex items-center justify-center bg-transparent border-2 border-white text-white rounded-sm text-sm h-8 w-10 min-w-10 transition-all duration-300 z-0"
							onClick={toggleSortDirection}
						>
							<span class="relative z-10">
								{#if sortDirectionValue === 'asc'}
									<ArrowUp size={16} />
								{:else}
									<ArrowDown size={16} />
								{/if}
							</span>
						</Button>
						<select
							id="sort"
							onchange={handleSortValueChange}
							value={sortValueValue}
							class="bg-transparent border-2 cursor-pointer rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 border-white"
						>
							{#each sortOptions as option}
								<option class="bg-black text-white" value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>

			<!-- Name Search (Mobile Only) -->
			<div class="flex flex-wrap gap-4 sm:flex-row flex-col md:hidden">
				<TextInput
					id="name"
					label="Name"
					bind:value={searchName}
					placeholder="Search by name..."
					debounceFunction={setFilterName}
				/>
			</div>

			<div class="flex flex-wrap gap-4 sm:flex-row flex-col">
				<TextInput
					id="numero"
					label="Pokémon ID"
					bind:value={searchNumero}
					placeholder="Enter Pokémon ID..."
					debounceFunction={setFilterNumero}
				/>
			</div>

			<div class="flex flex-wrap gap-4 sm:flex-row flex-col">
				<Button
					class="w-full"
					isActive={$mostExpensiveOnly}
					onClick={toggleMostExpensiveOnly}
				>
					{$mostExpensiveOnly ? 'Show All Cards' : 'Most Expensive Only'}
				</Button>
			</div>
		</div>
	</Section>

	<Section title="Type Filters" bind:isOpen={$filterStates.typeFilters}>
		<div class="flex flex-wrap gap-2 md:gap-4 sm:flex-row flex-col">
			<div class="flex flex-col gap-1 min-w-32 flex-1">
				<label for="supertype" class="text-xs text-gray-300">Card Type</label>
				<select
					id="supertype"
					onchange={handleSupertypeChange}
					value={supertypeValue}
					class="bg-transparent border-2 cursor-pointer rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 {supertypeValue !== 'all' ? 'border-amber-400 text-amber-400' : 'border-white'}"
				>
					{#each supertypeOptions as option}
						<option class="bg-black text-white" value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div class="flex flex-col gap-1 min-w-32 flex-1">
				<label for="pokemontype" class="text-xs text-gray-300">Pokémon Type</label>
				<select
					id="pokemontype"
					onchange={handlePokemonTypeChange}
					value={pokemonTypeValue}
					class="bg-transparent border-2 cursor-pointer rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 {pokemonTypeValue !== 'all' ? 'border-amber-400 text-amber-400' : 'border-white'}"
				>
					{#each typeOptions as option}
						<option class="bg-black text-white" value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div class="flex flex-col gap-1 min-w-32 flex-1">
				<label for="rarity" class="text-xs text-gray-300">Rarity</label>
				<select
					id="rarity"
					onchange={handleRarityChange}
					value={rarityValue}
					class="bg-transparent border-2 cursor-pointer rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 {rarityValue !== 'all' ? 'border-amber-400 text-amber-400' : 'border-white'}"
				>
					{#each rarityOptions as option}
						<option class="bg-black text-white" value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>
	</Section>

	<Section title="Collection Filters" bind:isOpen={$filterStates.collectionFilters}>
		<div class="flex flex-wrap gap-2 md:gap-4 sm:flex-row flex-col">
			<div class="flex flex-col gap-1 min-w-32 flex-1">
				<label for="set" class="text-xs text-gray-300">Set</label>
				<select
					id="set"
					onchange={handleSetChange}
					value={setValue}
					class="bg-transparent border-2 cursor-pointer rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 {setValue !== 'all' ? 'border-amber-400 text-amber-400' : 'border-white'}"
				>
					{#each setOptions as option}
						<option class="bg-black text-white" value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div class="flex flex-col gap-1 min-w-32 flex-1">
				<label for="artist" class="text-xs text-gray-300">Illustrator</label>
				<select
					id="artist"
					onchange={handleArtistChange}
					value={artistValue}
					class="bg-transparent border-2 cursor-pointer rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-amber-400 {artistValue !== 'all' ? 'border-amber-400 text-amber-400' : 'border-white'}"
				>
					{#each artistOptions as option}
						<option class="bg-black text-white" value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>
	</Section>
</div>
