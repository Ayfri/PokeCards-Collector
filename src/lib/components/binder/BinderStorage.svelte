<script lang="ts">
	import { type Writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import Button from '@components/filters/Button.svelte';
	import TrashIcon from 'lucide-svelte/icons/trash';
	import FilterIcon from 'lucide-svelte/icons/filter';
	import X from 'lucide-svelte/icons/x';
	import CardImage from '@components/card/CardImage.svelte';
	import TextInput from '@components/filters/TextInput.svelte';
	import type { FullCard, Set } from '$lib/types';
	import { slide } from 'svelte/transition';
	import ArrowUp from 'lucide-svelte/icons/arrow-up';
	import ArrowDown from 'lucide-svelte/icons/arrow-down';
	import { parseCardCode, isCardCode } from '$helpers/card-utils';

	export let cards: Writable<string[]>;
	export let allCards: FullCard[];
	export let sets: Set[];
	
	$: cardDataMap = new Map(allCards.map(card => [card.cardCode, card]));
	
	// Search and filter state
	let searchTerm = '';
	let sortBy = 'type'; // Default sort: card codes first, then URLs
	let sortOrder = 'asc';
	let filteredCardCodes: string[] = [];
	let showFilters = false;
	
	// Load saved preferences on mount
	onMount(() => {
		const savedSortBy = localStorage.getItem('binderStorageSortBy');
		const savedSortOrder = localStorage.getItem('binderStorageSortOrder');
		const savedShowFilters = localStorage.getItem('binderStorageShowFilters');
		
		if (savedSortBy) sortBy = savedSortBy;
		if (savedSortOrder) sortOrder = savedSortOrder;
		if (savedShowFilters === 'true') showFilters = true;
	});

	// Update filtered cards when original cards or filters change
	$: {
		let filtered = [...$cards];
		
		if (searchTerm.trim()) {
			const term = searchTerm.toLowerCase();
			filtered = filtered.filter(item => {
				if (isCardCode(item)) {
					const fullCard = cardDataMap.get(item);
					return item.toLowerCase().includes(term) || 
						fullCard?.name.toLowerCase().includes(term) || 
						fullCard?.setName.toLowerCase().includes(term);
				} else { // It's a URL
					return item.toLowerCase().includes(term);
				}
			});
		}
		
		filtered.sort((itemA, itemB) => {
			const isCodeA = isCardCode(itemA);
			const isCodeB = isCardCode(itemB);

			// Group card codes before URLs
			if (isCodeA && !isCodeB) return -1;
			if (!isCodeA && isCodeB) return 1;

			let comparison = 0;
			if (isCodeA && isCodeB) { // Both are card codes
				const {cardNumber: cardNumberA = "0", pokemonNumber: pokemonNumberA = 0, setCode: setCodeA = ''} = parseCardCode(itemA);
				const {cardNumber: cardNumberB = "0", pokemonNumber: pokemonNumberB = 0, setCode: setCodeB = ''} = parseCardCode(itemB);
				if (sortBy === 'number') {
					comparison = parseInt(cardNumberA) - parseInt(cardNumberB);
					if (comparison === 0) comparison = pokemonNumberA - pokemonNumberB;
				} else if (sortBy === 'set') {
					comparison = setCodeA.localeCompare(setCodeB);
				} else { // Default type sort already handled grouping
					comparison = 0; // Keep original relative order within codes if not sorting by number/set
				}
			} else if (!isCodeA && !isCodeB) { // Both are URLs
				comparison = itemA.localeCompare(itemB); // Sort URLs alphabetically
			}

			return sortOrder === 'asc' ? comparison : -comparison;
		});
		
		filteredCardCodes = filtered;
	}
	
	// Handle drag start for stored cards
	function onDragStart(e: DragEvent, item: string) {
		if (!e.dataTransfer) return;
		
		if (isCardCode(item)) {
			const fullCard = cardDataMap.get(item);
			if (!fullCard) {
				console.error(`Cannot start drag, card details not found for code: ${item}`);
				e.preventDefault();
				return;
			}
			e.dataTransfer.setData('text/plain', crypto.randomUUID()); // For Firefox compatibility
			e.dataTransfer.setData('cardCode', item);
			e.dataTransfer.setData('cardUrl', fullCard.image);
			e.dataTransfer.setData('source-type', 'storage');
			e.dataTransfer.effectAllowed = 'copy';
		} else { // It's a URL
			e.dataTransfer.setData('text/plain', crypto.randomUUID());
			e.dataTransfer.setData('cardUrl', item);
			e.dataTransfer.setData('source-type', 'storage-url'); // Distinguish URL source
			e.dataTransfer.effectAllowed = 'copy';
		}
	}
	
	function removeItem(itemToRemove: string) { $cards = $cards.filter(item => item !== itemToRemove); }
	function clearStorage() { if (confirm('Are you sure you want to remove all stored cards?')) { $cards = []; } }
	function toggleFilters() { showFilters = !showFilters; localStorage.setItem('binderStorageShowFilters', showFilters.toString()); }
	function setSortBy(field: string) {
		if (sortBy === field) { sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; } 
		else { 
			sortBy = field; 
			sortOrder = 'asc'; // Reset to asc when changing sort field
			localStorage.setItem('binderStorageSortBy', sortBy); 
		}
		localStorage.setItem('binderStorageSortOrder', sortOrder);
	}
	function toggleSortOrder() { sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; localStorage.setItem('binderStorageSortOrder', sortOrder); }

</script>

<div class="bg-gray-800 rounded-lg p-4 flex flex-col h-full">
	<!-- Header -->
	<div class="flex justify-between items-center mb-1">
		<h3 class="text-gold-400 text-lg">Storage ({$cards.length})</h3>
		<div class="flex gap-1"> {#if $cards.length > 0}<Button onClick={clearStorage} class="p-1"><TrashIcon size={14} /></Button>{/if} </div>
	</div>
	<p class="text-xs text-gray-400 mb-2">Drag cards from here to position them in your binder grid.</p>
	
	<!-- Filters -->
	{#if $cards.length > 0}
		<div class="relative mb-2 flex gap-1 items-end">
			<TextInput id="search-storage" label="Search storage:" bind:value={searchTerm} placeholder="Search by code, name, set..." />
			<Button onClick={toggleFilters} ><FilterIcon size={14} /></Button>
		</div>
		{#if showFilters}
			<div class="mb-2 p-2 rounded text-sm" transition:slide={{ duration: 200 }}>
				<div class="flex justify-between items-center mb-1">
					<span class="text-gray-300">Sort by:</span>
					<Button onClick={toggleSortOrder} class="px-2 py-1 text-xs h-auto"> {#if sortOrder === 'asc'}<ArrowUp size={12} />{:else}<ArrowDown size={12} />{/if} </Button>
				</div>
				<div class="grid grid-cols-2 gap-1">
					<Button onClick={() => setSortBy('number')} isActive={sortBy === 'number'} class="px-2 py-1 text-xs h-auto"> Card # </Button>
					<Button onClick={() => setSortBy('set')} isActive={sortBy === 'set'} class="px-2 py-1 text-xs h-auto"> Set </Button>
				</div>
			</div>
		{/if}
	{/if}
	
	<!-- Card List -->
	<div class="overflow-y-auto flex-1 pr-1 -mr-1 min-h-0">
		{#if $cards.length === 0}
			<p class="text-gray-500 text-center py-4 text-sm">No cards in storage...</p>
		{:else if filteredCardCodes.length === 0}
			<p class="text-gray-500 text-center py-4 text-sm">No items match your search/filters.</p>
		{:else}
			<div class="grid grid-cols-2 gap-2">
				{#each filteredCardCodes as item (item)}
					{#if isCardCode(item)}
						{@const fullCard = cardDataMap.get(item)}
						{@const set = sets.find(s => s.name === fullCard?.setName)}
						{@const setIndex = parseCardCode(item).cardNumber}
						{#if fullCard}
							<div 
								class="relative aspect-[2/3] border-2 border-gray-700 rounded group transition-all duration-200 hover:border-gold-400"
								draggable="true"
								on:dragstart={(e) => onDragStart(e, item)}
							>
								<CardImage imageUrl={fullCard.image} alt={fullCard.name} class="w-full h-full object-contain p-1" lazy={true} highRes={false} />
								<div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-[0.6rem] leading-tight text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity text-center">
									<div class="font-semibold truncate">{fullCard.name}</div>
									<div class="truncate">#{setIndex}/{set?.printedTotal}</div>
									<div class="truncate text-gray-300">{fullCard.rarity}</div>
								</div>
								<button class="absolute top-1 right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" on:click={() => removeItem(item)} > <X size={14} /> </button>
							</div>
						{:else}
							<div class="relative aspect-[2/3] border-2 border-dashed border-red-700 rounded flex items-center justify-center text-center p-1">
								<span class="text-red-400 text-xs">Data missing for {item}</span>
								<button class="absolute top-1 right-1 bg-red-500 rounded-full p-0.5" on:click={() => removeItem(item)} > <X size={14} /> </button>
							</div>
						{/if}
					{:else} 
						<!-- Handle URL item -->
						<div 
							class="relative aspect-[2/3] border-2 border-gray-700 rounded group transition-all duration-200 hover:border-gold-400"
							draggable="true"
							on:dragstart={(e) => onDragStart(e, item)}
						>
							<CardImage imageUrl={item} alt="Imported from URL" class="w-full h-full object-contain p-1" lazy={true} highRes={false} />
							<div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-[0.6rem] leading-tight text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity text-center">
								<div class="font-semibold truncate">Imported from URL</div>
								<div class="truncate text-gray-300 break-all">{item}</div> 
							</div>
							<button class="absolute top-1 right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" on:click={() => removeItem(item)} > <X size={14} /> </button>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Custom scrollbar */
	.overflow-y-auto::-webkit-scrollbar { width: 6px; }
	.overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
	.overflow-y-auto::-webkit-scrollbar-thumb { background-color: #4a4a4a; border-radius: 20px; }
	.overflow-y-auto::-webkit-scrollbar-thumb:hover { background-color: #FFB700; }
</style> 