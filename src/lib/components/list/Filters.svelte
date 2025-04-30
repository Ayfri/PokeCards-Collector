<script lang="ts">
	import { filterArtist, filterName, filterNumero, filterRarity, filterSet, filterSupertype, filterType, mostExpensiveOnly, sortBy, sortOrder } from '$helpers/filters';
	import type { Set } from '$lib/types';
	import { afterUpdate, onMount } from 'svelte';
	import { filterStates } from '$stores/filterStates';
	import Button from '@components/filters/Button.svelte';
	import Section from '@components/filters/Section.svelte';
	import Select from '@components/filters/Select.svelte';
	import SortControl from '@components/filters/SortControl.svelte';
	import TextInput from '@components/filters/TextInput.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import ArrowUp from 'lucide-svelte/icons/arrow-up';
	import ArrowDown from 'lucide-svelte/icons/arrow-down';

	export let artists: string[] = [];
	export let rarities: string[];
	export let sets: Set[];
	export let types: string[];
	export let onUpdate: () => void = () => {};

	// Inputs text variables
	let debounceTimeout: number;
	let searchNumero = '';
	let searchName = '';
	let supertypeValue = 'all';
	let pokemonTypeValue = 'all';
	let sortDirectionValue: 'asc' | 'desc' = 'asc';
	let sortValueValue: string = 'sort-pokedex';

	// Initialize search values from stores when component is loaded
	onMount(() => {
		searchNumero = $filterNumero;
		supertypeValue = $filterSupertype;
		pokemonTypeValue = $filterType;
		sortDirectionValue = $sortOrder;
		sortValueValue = $sortBy;
	});

	afterUpdate(onUpdate);

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

	const debouncedSetFilterName = debounce((value: string) => {
		$filterName = value;
	}, 300);

	// Handle changes to the supertype filter with URL updates
	function handleSupertypeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;
		
		// Update the store value
		$filterSupertype = value;
		supertypeValue = value;
		
		// Update URL with type parameter
		const url = new URL(page.url);
		
		// Map the internal value to the URL parameter value
		const typeMap: Record<string, string> = {
			'pokémon': 'pokemon',
			'trainer': 'trainer',
			'energy': 'energy'
		};
		
		if (value !== 'all') {
			url.searchParams.set('type', typeMap[value] || value);
		} else {
			url.searchParams.delete('type');
		}
		
		// Keep existing parameters
		const preserveParams = ['set', 'artist', 'name', 'pokemontype', 'sortby', 'sortorder'];
		preserveParams.forEach(param => {
			const paramValue = page.url.searchParams.get(param);
			if (paramValue) {
				url.searchParams.set(param, paramValue);
			}
		});

		// Save active element to restore focus
		const activeElement = document.activeElement as HTMLElement;
		const activeElementId = activeElement?.id;
		
		goto(url.toString(), { replaceState: true }).then(() => {
			// Restore focus after navigation
			if (activeElementId === 'supertype') {
				const selectElement = document.getElementById('supertype') as HTMLSelectElement;
				if (selectElement) {
					selectElement.focus();
				}
			}
			
			// Trigger layout update if necessary
			onUpdate();
		});
	}

	// Handle changes to the Pokémon Type filter with URL updates
	function handlePokemonTypeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;
		
		// Update the store value
		$filterType = value;
		pokemonTypeValue = value;
		
		// Update URL with pokemontype parameter
		const url = new URL(page.url);
		
		if (value !== 'all') {
			url.searchParams.set('pokemontype', value);
		} else {
			url.searchParams.delete('pokemontype');
		}
		
		// Keep existing parameters
		const preserveParams = ['set', 'artist', 'name', 'type', 'sortby', 'sortorder'];
		preserveParams.forEach(param => {
			const paramValue = page.url.searchParams.get(param);
			if (paramValue) {
				url.searchParams.set(param, paramValue);
			}
		});

		// Save active element to restore focus
		const activeElement = document.activeElement as HTMLElement;
		const activeElementId = activeElement?.id;
		
		goto(url.toString(), { replaceState: true }).then(() => {
			// Restore focus after navigation
			if (activeElementId === 'pokemontype') {
				const selectElement = document.getElementById('pokemontype') as HTMLSelectElement;
				if (selectElement) {
					selectElement.focus();
				}
			}
			
			// Trigger layout update if necessary
			onUpdate();
		});
	}

	// Handle sort value change
	function handleSortValueChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;
		
		// Update the store value
		$sortBy = value;
		sortValueValue = value;
		
		// Update URL with sortby parameter
		const url = new URL(page.url);
		url.searchParams.set('sortby', value);
		
		// Keep existing parameters
		const preserveParams = ['set', 'artist', 'name', 'type', 'pokemontype', 'sortorder'];
		preserveParams.forEach(param => {
			const paramValue = page.url.searchParams.get(param);
			if (paramValue) {
				url.searchParams.set(param, paramValue);
			}
		});

		// Save active element to restore focus
		const activeElement = document.activeElement as HTMLElement;
		const activeElementId = activeElement?.id;
		
		goto(url.toString(), { replaceState: true }).then(() => {
			// Restore focus after navigation
			if (activeElementId === 'sort') {
				const selectElement = document.getElementById('sort') as HTMLSelectElement;
				if (selectElement) {
					selectElement.focus();
				}
			}
			
			// Trigger layout update if necessary
			onUpdate();
		});
	}

	// Handle sort direction change
	function toggleSortDirection() {
		// Toggle the sort direction
		const newDirection = sortDirectionValue === 'asc' ? 'desc' : 'asc';
		$sortOrder = newDirection;
		sortDirectionValue = newDirection;
		
		// Update URL with sortorder parameter
		const url = new URL(page.url);
		url.searchParams.set('sortorder', newDirection);
		
		// Keep existing parameters
		const preserveParams = ['set', 'artist', 'name', 'type', 'pokemontype', 'sortby'];
		preserveParams.forEach(param => {
			const paramValue = page.url.searchParams.get(param);
			if (paramValue) {
				url.searchParams.set(param, paramValue);
			}
		});
		
		goto(url.toString(), { replaceState: true }).then(() => {
			// Trigger layout update if necessary
			onUpdate();
		});
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
	
	// Handle rarity change with URL update
	let rarityValue = 'all';
	let artistValue = 'all';
	let setValue = 'all';
	
	onMount(() => {
		rarityValue = $filterRarity;
		artistValue = $filterArtist;
		setValue = $filterSet;
	});
	
	function handleRarityChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;
		
		// Update the store value
		$filterRarity = value;
		rarityValue = value;
		
		// Update URL with rarity parameter
		const url = new URL(page.url);
		
		if (value !== 'all') {
			url.searchParams.set('rarity', value);
		} else {
			url.searchParams.delete('rarity');
		}
		
		// Keep existing parameters
		const preserveParams = ['set', 'artist', 'name', 'type', 'pokemontype', 'sortby', 'sortorder', 'mostexpensive'];
		preserveParams.forEach(param => {
			const paramValue = page.url.searchParams.get(param);
			if (paramValue) {
				url.searchParams.set(param, paramValue);
			}
		});

		// Save active element to restore focus
		const activeElement = document.activeElement as HTMLElement;
		const activeElementId = activeElement?.id;
		
		goto(url.toString(), { replaceState: true }).then(() => {
			// Restore focus after navigation
			if (activeElementId === 'rarity') {
				const selectElement = document.getElementById('rarity') as HTMLSelectElement;
				if (selectElement) {
					selectElement.focus();
				}
			}
			
			// Trigger layout update if necessary
			onUpdate();
		});
	}

	// Handle artist change with URL update
	function handleArtistChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;
		
		// Update the store value
		$filterArtist = value;
		artistValue = value;
		
		// Update URL with artist parameter
		const url = new URL(page.url);
		
		if (value !== 'all') {
			url.searchParams.set('artist', value);
		} else {
			url.searchParams.delete('artist');
		}
		
		// Keep existing parameters
		const preserveParams = ['set', 'name', 'type', 'pokemontype', 'sortby', 'sortorder', 'mostexpensive', 'rarity'];
		preserveParams.forEach(param => {
			const paramValue = page.url.searchParams.get(param);
			if (paramValue) {
				url.searchParams.set(param, paramValue);
			}
		});

		// Save active element to restore focus
		const activeElement = document.activeElement as HTMLElement;
		const activeElementId = activeElement?.id;
		
		goto(url.toString(), { replaceState: true }).then(() => {
			// Restore focus after navigation
			if (activeElementId === 'artist') {
				const selectElement = document.getElementById('artist') as HTMLSelectElement;
				if (selectElement) {
					selectElement.focus();
				}
			}
			
			// Trigger layout update if necessary
			onUpdate();
		});
	}

	// Handle set change with URL update
	function handleSetChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;
		
		// Update the store value
		$filterSet = value;
		setValue = value;
		
		// Update URL with set parameter
		const url = new URL(page.url);
		
		if (value !== 'all') {
			url.searchParams.set('set', value);
		} else {
			url.searchParams.delete('set');
		}
		
		// Keep existing parameters
		const preserveParams = ['artist', 'name', 'type', 'pokemontype', 'sortby', 'sortorder', 'mostexpensive', 'rarity'];
		preserveParams.forEach(param => {
			const paramValue = page.url.searchParams.get(param);
			if (paramValue) {
				url.searchParams.set(param, paramValue);
			}
		});

		// Save active element to restore focus
		const activeElement = document.activeElement as HTMLElement;
		const activeElementId = activeElement?.id;
		
		goto(url.toString(), { replaceState: true }).then(() => {
			// Restore focus after navigation
			if (activeElementId === 'set') {
				const selectElement = document.getElementById('set') as HTMLSelectElement;
				if (selectElement) {
					selectElement.focus();
				}
			}
			
			// Trigger layout update if necessary
			onUpdate();
		});
	}
	
	// Handle toggle for "Most Expensive Only" with URL update
	function toggleMostExpensiveOnly() {
		// Toggle the value
		const newValue = !$mostExpensiveOnly;
		$mostExpensiveOnly = newValue;
		
		// Update URL
		const url = new URL(page.url);
		
		if (newValue) {
			url.searchParams.set('mostexpensive', 'true');
		} else {
			url.searchParams.delete('mostexpensive');
		}
		
		// Keep existing parameters
		const preserveParams = ['set', 'artist', 'name', 'type', 'pokemontype', 'sortby', 'sortorder', 'rarity'];
		preserveParams.forEach(param => {
			const paramValue = page.url.searchParams.get(param);
			if (paramValue) {
				url.searchParams.set(param, paramValue);
			}
		});
		
		goto(url.toString(), { replaceState: true }).then(() => {
			// Trigger layout update if necessary
			onUpdate();
		});
	}
</script>

<div class="w-full">
	<Section title="Basic Filters" bind:isOpen={$filterStates.basicFilters}>
		<div class="flex flex-col gap-2 md:gap-4">
			<div class="flex flex-wrap gap-4">
				<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
					<label for="sort" class="text-xs text-gray-300">Sort by</label>
					<div class="flex items-center gap-2">
						<Button
							class="animated-hover-button relative overflow-hidden flex items-center justify-center bg-transparent border-2 border-white text-white rounded text-sm h-8 w-10 min-w-10 transition-all duration-300 z-0"
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
							on:change={handleSortValueChange}
							value={sortValueValue}
							class="bg-transparent border-2 cursor-pointer rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 border-white"
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
					debounceFunction={debouncedSetFilterName}
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
					onClick={toggleMostExpensiveOnly}
				>
					{$mostExpensiveOnly ? 'Show All Cards' : 'Most Expensive Only'}
				</Button>
			</div>
		</div>
	</Section>

	<Section title="Type Filters" bind:isOpen={$filterStates.typeFilters}>
		<div class="flex flex-wrap gap-2 md:gap-4 sm:flex-row flex-col">
			<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
				<label for="supertype" class="text-xs text-gray-300">Card Type</label>
				<select
					id="supertype"
					on:change={handleSupertypeChange}
					value={supertypeValue}
					class="bg-transparent border-2 cursor-pointer rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {supertypeValue !== 'all' ? 'border-amber-400 text-amber-400' : 'border-white'}"
				>
					{#each supertypeOptions as option}
						<option class="bg-black text-white" value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
				<label for="pokemontype" class="text-xs text-gray-300">Pokémon Type</label>
				<select
					id="pokemontype"
					on:change={handlePokemonTypeChange}
					value={pokemonTypeValue}
					class="bg-transparent border-2 cursor-pointer rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {pokemonTypeValue !== 'all' ? 'border-amber-400 text-amber-400' : 'border-white'}"
				>
					{#each typeOptions as option}
						<option class="bg-black text-white" value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
				<label for="rarity" class="text-xs text-gray-300">Rarity</label>
				<select
					id="rarity"
					on:change={handleRarityChange}
					value={rarityValue}
					class="bg-transparent border-2 cursor-pointer rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {rarityValue !== 'all' ? 'border-amber-400 text-amber-400' : 'border-white'}"
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
			<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
				<label for="set" class="text-xs text-gray-300">Set</label>
				<select
					id="set"
					on:change={handleSetChange}
					value={setValue}
					class="bg-transparent border-2 cursor-pointer rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {setValue !== 'all' ? 'border-amber-400 text-amber-400' : 'border-white'}"
				>
					{#each setOptions as option}
						<option class="bg-black text-white" value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div class="flex flex-col gap-1 min-w-[8rem] flex-1">
				<label for="artist" class="text-xs text-gray-300">Illustrator</label>
				<select
					id="artist"
					on:change={handleArtistChange}
					value={artistValue}
					class="bg-transparent border-2 cursor-pointer rounded text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-none focus:border-amber-400 {artistValue !== 'all' ? 'border-amber-400 text-amber-400' : 'border-white'}"
				>
					{#each artistOptions as option}
						<option class="bg-black text-white" value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>
	</Section>
</div>
