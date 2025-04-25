<script lang="ts">
	import { type Writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import Button from '$lib/components/filters/Button.svelte';
	import TrashIcon from 'lucide-svelte/icons/trash';
	import SearchIcon from 'lucide-svelte/icons/search';
	import ArrowUpDownIcon from 'lucide-svelte/icons/arrow-up-down';
	import FilterIcon from 'lucide-svelte/icons/filter';
	import XIcon from 'lucide-svelte/icons/x';
	
	export let cards: Writable<Array<{id: string; url: string}>>;
	
	// Search and filter state
	let searchTerm = '';
	let sortBy = 'number'; // Default will be overwritten if localStorage value exists
	let sortOrder = 'asc'; // Default will be overwritten if localStorage value exists
	let filteredCards: Array<{id: string; url: string}> = [];
	let showFilters = false;
	
	// Card metadata cache for more efficient sorting
	const cardMetaCache = new Map<string, { identifier: string, set: string, number: number }>();
	
	// Load saved preferences on mount
	onMount(() => {
		// Load sort preferences from localStorage if available
		const savedSortBy = localStorage.getItem('binderStorageSortBy');
		const savedSortOrder = localStorage.getItem('binderStorageSortOrder');
		const savedShowFilters = localStorage.getItem('binderStorageShowFilters');
		
		if (savedSortBy) {
			sortBy = savedSortBy;
		}
		
		if (savedSortOrder) {
			sortOrder = savedSortOrder;
		}
		
		if (savedShowFilters === 'true') {
			showFilters = true;
		}
	});
	
	// Update filtered cards when original cards or filters change
	$: {
		// Apply search filter
		let filtered = [...$cards];
		
		// Apply search term if present
		if (searchTerm.trim()) {
			const term = searchTerm.toLowerCase();
			filtered = filtered.filter(card => {
				// Extract metadata if not already cached
				if (!cardMetaCache.has(card.id)) {
					cardMetaCache.set(card.id, extractCardMetadata(card.url));
				}
				const meta = cardMetaCache.get(card.id)!;
				
				// Search in identifier, set and URL
				return meta.identifier.toLowerCase().includes(term) || 
					meta.set.toLowerCase().includes(term) ||
					card.url.toLowerCase().includes(term) ||
					meta.number.toString().includes(term);
			});
		}
		
		// Always apply sorting
		filtered.sort((a, b) => {
			// Extract metadata if not already cached
			if (!cardMetaCache.has(a.id)) {
				cardMetaCache.set(a.id, extractCardMetadata(a.url));
			}
			if (!cardMetaCache.has(b.id)) {
				cardMetaCache.set(b.id, extractCardMetadata(b.url));
			}
			
			const metaA = cardMetaCache.get(a.id)!;
			const metaB = cardMetaCache.get(b.id)!;
			
			let comparison = 0;
			if (sortBy === 'number') {
				// Sort primarily by set
				comparison = metaA.set.localeCompare(metaB.set);
				// Then by number within the same set
				if (comparison === 0) {
					comparison = metaA.number - metaB.number;
				}
			} else if (sortBy === 'set') {
				// Sort by set only
				comparison = metaA.set.localeCompare(metaB.set);
			}
			
			// Apply sort order
			return sortOrder === 'asc' ? comparison : -comparison;
		});
		
		filteredCards = filtered;
	}
	
	// Helper function to extract card metadata from URL
	function extractCardMetadata(url: string): { identifier: string, set: string, number: number } {
		// Default values
		let identifier = "Unknown";
		let set = "Unknown";
		let number = 0;
		
		try {
			// Check for Pokemon TCG API URLs
			const ptcgRegex = /images\.pokemontcg\.io\/([^\/]+)\/([^_\.]+)(?:_([^.]+))?/;
			const ptcgMatch = url.match(ptcgRegex);
			
			if (ptcgMatch) {
				// This is a Pokemon TCG API URL
				set = ptcgMatch[1].toUpperCase(); // The set code
				const cardId = ptcgMatch[2]; // The card ID (could be a number or prefix+number)
				
				// Extract number from card ID
				const numRegex = /(\d+)$/;
				const numMatch = cardId.match(numRegex);
				
				if (numMatch) {
					number = parseInt(numMatch[1], 10);
					// Use the full card ID as the identifier
					identifier = cardId;
				} else {
					// Fallback if we can't parse a number
					identifier = cardId;
				}
				
				return { identifier, set, number };
			}
			
			// If not a PTCG API URL, fall back to regular extraction logic
			const parts = url.split('/');
			const filename = parts[parts.length - 1];
			
			// Try to extract set information from path segments
			for (let i = 0; i < parts.length; i++) {
				const part = parts[i].toLowerCase();
				if (part.match(/^[a-z]{2,4}\d{1,3}$/i)) {
					set = part.toUpperCase();
					break;
				}
			}
			
			// Try to extract card identifier and number from filename
			const filenameParts = filename.split(/[_\-\.]/);
			for (const part of filenameParts) {
				const numMatch = part.match(/^(\D*)(\d+)$/);
				if (numMatch) {
					const prefix = numMatch[1] || '';
					number = parseInt(numMatch[2], 10);
					identifier = prefix + number;
					break;
				}
			}
			
			// Fallback - just use the filename without extension
			if (identifier === "Unknown") {
				identifier = filename.replace(/\.(jpg|png|gif|webp)$/i, '');
			}
		} catch (error) {
			console.error("Error extracting metadata:", error);
		}
		
		return { identifier, set, number };
	}
	
	// Helper function to capitalize words
	function capitalizeWords(str: string): string {
		return str
			.split(' ')
			.map(word => {
				if (word.length === 0) return '';
				return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
			})
			.join(' ');
	}
	
	// Handle drag start for stored cards
	function onDragStart(e: DragEvent, card: {id: string; url: string}) {
		if (!e.dataTransfer) return;
		
		e.dataTransfer.setData('text/plain', card.id);
		e.dataTransfer.setData('source-type', 'storage');
		e.dataTransfer.effectAllowed = 'copy';
	}
	
	// Remove card from storage
	function removeCard(id: string) {
		$cards = $cards.filter(card => card.id !== id);
		// Clean up cache
		cardMetaCache.delete(id);
	}
	
	// Clear all stored cards
	function clearStorage() {
		if (confirm('Are you sure you want to remove all stored cards?')) {
			$cards = [];
			cardMetaCache.clear();
		}
	}
	
	// Clear search term
	function clearSearch() {
		searchTerm = '';
	}
	
	// Toggle filters visibility
	function toggleFilters() {
		showFilters = !showFilters;
		// Save preference to localStorage
		localStorage.setItem('binderStorageShowFilters', showFilters.toString());
	}
	
	// Set sort field
	function setSortBy(field: string) {
		if (sortBy === field) {
			// Toggle sort order if clicking on the same field
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
			// Save preference to localStorage
			localStorage.setItem('binderStorageSortOrder', sortOrder);
		} else {
			// Set new field and reset to ascending order
			sortBy = field;
			sortOrder = 'asc';
			// Save preferences to localStorage
			localStorage.setItem('binderStorageSortBy', sortBy);
			localStorage.setItem('binderStorageSortOrder', sortOrder);
		}
	}
	
	// Toggle sort order
	function toggleSortOrder() {
		sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		// Save preference to localStorage
		localStorage.setItem('binderStorageSortOrder', sortOrder);
	}
	
	// Get card identifier for display
	function getCardIdentifier(card: {id: string; url: string}): string {
		if (!cardMetaCache.has(card.id)) {
			cardMetaCache.set(card.id, extractCardMetadata(card.url));
		}
		return cardMetaCache.get(card.id)!.identifier;
	}
	
	// Get card set for display
	function getCardSet(card: {id: string; url: string}): string {
		if (!cardMetaCache.has(card.id)) {
			cardMetaCache.set(card.id, extractCardMetadata(card.url));
		}
		return cardMetaCache.get(card.id)!.set;
	}
	
	// Get card number for display
	function getCardNumber(card: {id: string; url: string}): number {
		if (!cardMetaCache.has(card.id)) {
			cardMetaCache.set(card.id, extractCardMetadata(card.url));
		}
		return cardMetaCache.get(card.id)!.number;
	}
</script>

<div class="bg-gray-800 rounded-lg p-4 flex flex-col h-[calc(100%-88px)]">
	<div class="flex justify-between items-center mb-1">
		<h3 class="text-gold-400 text-lg">Storage ({$cards.length})</h3>
		
		<div class="flex gap-1">
			{#if $cards.length > 0}
				<Button onClick={clearStorage} class="p-1">
					<TrashIcon size={14} />
				</Button>
			{/if}
		</div>
	</div>
	
	<p class="text-xs text-gray-400 mb-2">
		Drag cards from here to position them in your binder grid.
	</p>
	
	{#if $cards.length > 0}
		<div class="relative mb-2">
			<div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
				<SearchIcon size={14} class="text-gray-400" />
			</div>
			
			<input 
				type="text" 
				bind:value={searchTerm}
				placeholder="Search cards..." 
				class="w-full bg-gray-700 border border-gray-600 rounded pl-8 pr-8 py-1 text-sm text-white"
			/>
			
			{#if searchTerm}
				<button 
					class="absolute inset-y-0 right-8 pr-1 flex items-center text-gray-400 hover:text-white"
					on:click={clearSearch}
				>
					<XIcon size={14} />
				</button>
			{/if}
			
			<button 
				class="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-white"
				on:click={toggleFilters}
			>
				<FilterIcon size={14} />
			</button>
		</div>
		
		{#if showFilters}
			<div class="mb-2 p-2 bg-gray-700 rounded text-sm">
				<div class="flex justify-between items-center mb-1">
					<span class="text-gray-300">Sort by:</span>
					<Button 
						onClick={toggleSortOrder} 
						class="px-2 py-1 text-xs h-auto"
					>
						{sortOrder === 'asc' ? 'Ascending' : 'Descending'}
						<ArrowUpDownIcon size={12} class="ml-1" />
					</Button>
				</div>
				<div class="grid grid-cols-2 gap-1">
					<Button 
						onClick={() => setSortBy('number')} 
						isActive={sortBy === 'number'}
						class="px-2 py-1 text-xs h-auto"
					>
						Card #
					</Button>
					<Button 
						onClick={() => setSortBy('set')} 
						isActive={sortBy === 'set'}
						class="px-2 py-1 text-xs h-auto"
					>
						Set
					</Button>
				</div>
			</div>
		{/if}
	{/if}
	
	<div class="overflow-y-auto flex-1 pr-1 -mr-1">
		{#if $cards.length === 0}
			<p class="text-gray-500 text-center py-4 text-sm">
				No cards in storage. Use the search bar at the top or the "Add set" button to add cards.
			</p>
		{:else if filteredCards.length === 0}
			<p class="text-gray-500 text-center py-4 text-sm">
				No cards match your search.
			</p>
		{:else}
			<div class="grid grid-cols-2 gap-2">
				{#each filteredCards as card}
					<div 
						class="relative aspect-[2/3] border-2 border-gray-700 rounded group transition-all duration-200 hover:border-gold-400"
						draggable="true"
						on:dragstart={(e) => onDragStart(e, card)}
					>
						<img 
							src={card.url} 
							alt="Pokémon card" 
							class="w-full h-full object-contain p-1"
							loading="lazy"
						/>
						<div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-xs text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity truncate text-center">
							<div class="font-semibold">{getCardIdentifier(card)}</div>
							<div class="flex justify-center items-center gap-1 mt-0.5">
								<span class="px-1 text-xxs">{getCardSet(card)}</span>
							</div>
						</div>
						<button 
							class="absolute top-1 right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
							on:click={() => removeCard(card.id)}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
								<path d="M18 6 6 18"></path>
								<path d="m6 6 12 12"></path>
							</svg>
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Custom scrollbar */
	.overflow-y-auto::-webkit-scrollbar {
		width: 6px;
	}
	
	.overflow-y-auto::-webkit-scrollbar-track {
		background: transparent;
	}
	
	.overflow-y-auto::-webkit-scrollbar-thumb {
		background-color: #4a4a4a;
		border-radius: 20px;
	}
	
	.overflow-y-auto::-webkit-scrollbar-thumb:hover {
		background-color: #FFB700;
	}
	
	/* Extra small text size */
	.text-xxs {
		font-size: 0.65rem;
	}
</style> 