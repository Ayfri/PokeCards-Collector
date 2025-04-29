<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onDestroy, onMount } from 'svelte';
	import Search from 'lucide-svelte/icons/search';
	import X from 'lucide-svelte/icons/x';
	import PlusCircle from 'lucide-svelte/icons/plus-circle';
	import Check from 'lucide-svelte/icons/check';
	import { processCardImage } from '$helpers/card-images';
	import type { FullCard, Set, PriceData } from '$lib/types';
	import { browser } from '$app/environment';
	import { findSetByCardCode } from '$helpers/set-utils';
	import { page } from '$app/stores';
	import { getContext } from 'svelte';

	// --- Props ---
	export let prices: Record<string, PriceData>;
	export let allCards: FullCard[];
	export let autoFocus: boolean = false;
	export let mobileMode: boolean = false;
	export let onToggleModal: (() => void) | undefined = undefined;
	export let sets: Set[];

	// --- State ---
	let inputElement: HTMLInputElement;
	let searchQuery = '';
	let searchResults: FullCard[] = [];
	let showResults = false;
	let isBinderPage = false;
	let addedCards = new Set<string>(); // Pour stocker les IDs des cartes ajoutées
	let platformModifierKey = ''; // Will be 'Ctrl' or 'Cmd'
	let inputFocused = false; // Track input focus state

	// Check if we're on the Binder page
	$: isBinderPage = $page.url.pathname === '/binder';

	// Try to get the storedCards store from context if on binder page
	let binderStoredCards: any = null;
	onMount(() => {
		if (isBinderPage) {
			try {
				binderStoredCards = getContext('storedCards');
			} catch (e) {
				console.error('Failed to get storedCards from context:', e);
			}
		}
	});

	// Function to add a card to the binder storage
	function addToBinderStorage(card: FullCard) {
		if (!binderStoredCards) {
			// Dispatch a custom event if we couldn't get the store directly
			const event = new CustomEvent('add-to-binder', { 
				detail: { cardUrl: card.image },
				bubbles: true 
			});
			document.dispatchEvent(event);
		} else {
			// Add directly to the store
			binderStoredCards.update((cards: any[]) => [
				...cards, 
				{ 
					id: crypto.randomUUID(), 
					url: card.image 
				}
			]);
		}
		
		// Marquer la carte comme ajoutée pour l'effet visuel
		addedCards.add(card.cardCode);
		
		// Réinitialiser l'état après un délai
		setTimeout(() => {
			addedCards.delete(card.cardCode);
			addedCards = addedCards; // Force la réactivité en Svelte
		}, 1500);
	}

	// Helper to extract card number from cardCode (preferred)
	function extractCardNumberFromCode(cardCode: string): string {
		// Assuming format: supertype_pokemonId_setCode_cardNumber
		return cardCode?.split('_')[3] || '';
	}

	// Debounce function
	function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
		let timeout: number | undefined;
		return (...args: Parameters<T>) => {
			clearTimeout(timeout);
			if (browser) {
				timeout = window.setTimeout(() => func(...args), wait);
			}
		};
	}

	const performSearch = () => {
		const query = searchQuery.toLowerCase().trim();

		if (!query) {
			searchResults = [];
			showResults = false;
			return;
		}

		searchResults = allCards.filter(card => {
			const set = findSetByCardCode(card.cardCode, sets)!!;
			const cardName = card.name.toLowerCase();
			const cardNumber = extractCardNumberFromCode(card.cardCode).toLowerCase();
			const setName = set?.name.toLowerCase() || '';
			const setCode = set?.ptcgoCode?.toLowerCase() || '';

			// --- Search Logic (Order matters for relevance) ---

			// 1. Exact Card Number match
			if (cardNumber === query) return true;

			// 2. Exact Set Code match
			if (setCode === query) return true;

			// 3. Card Name includes query
			if (cardName.includes(query)) return true;

			// 4. Set Name includes query
			if (setName.includes(query)) return true;

			// 5. Card Number / Set Total match (X/Y or X/ format)
			if (query.includes('/')) {
				const parts = query.split('/');
				const queryNumber = parts[0];
				const queryTotal = parts[1]; // Might be undefined or ""

				// Check if the extracted card number matches the part before the slash
				if (cardNumber === queryNumber) {
					// Case 1: Query is like "25/" (queryTotal is empty/undefined and query ends with /)
					if (!queryTotal && query.endsWith('/')) {
						return true;
					}
					// Case 2: Query is like "25/156" (queryTotal exists and matches set's printedTotal)
					else if (queryTotal && set?.printedTotal?.toString() === queryTotal) {
						return true;
					}
				}
			}

			// 6. Combined formats with space
			if (query.includes(' ')) {
				// 6a. Set Code + Card Number (e.g., "SV01 123")
				if (/^[a-zA-Z]+[0-9]*\s+\d+$/.test(query)) {
					const [querySetCode, queryCardNumber] = query.split(' ');
					if (setCode === querySetCode.toLowerCase() && cardNumber === queryCardNumber) {
						return true;
					}
				}

				// 6b. Card Name + Card Number (e.g., "Pikachu 104")
				if (/\s+\d+$/.test(query)) { // Ends with space + number
					const parts = query.split(' ');
					const searchNumber = parts.pop(); // Known to be a number due to regex
					const searchName = parts.join(' ');
					if (cardName.includes(searchName) && cardNumber === searchNumber) {
						return true;
					}
				}

				// 6c. Card Name + Set Name (e.g., "Pikachu Base Set") - Try splitting
				const queryParts = query.split(' ');
				for (let i = 1; i < queryParts.length; i++) {
					const potentialName = queryParts.slice(0, i).join(' ');
					const potentialSet = queryParts.slice(i).join(' ');
					if (cardName.includes(potentialName) && setName.includes(potentialSet)) {
						return true;
					}
				}
			}

			return false;
		})
		.slice(0, 10); // Limit to 10 search results for all devices

		showResults = searchResults.length > 0;
	};

	// Debounced search function
	const debouncedSearch = debounce(performSearch, 300);

	// --- Event Handlers ---
	const handleClickOutside = (event: MouseEvent) => {
		if (mobileMode) return;
		const target = event.target as Node;
		if (showResults && inputElement && !inputElement.contains(target) && !document.querySelector('.search-results')?.contains(target)) {
			showResults = false;
		}
	};

	const handleInputFocus = () => {
		if (searchQuery.trim() !== '') {
			performSearch();
			showResults = true;
		}
		inputFocused = true; // Set focus state
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			if (mobileMode && onToggleModal) {
				onToggleModal();
			} else {
				showResults = false;
			}
		}
	};

	const handleClearSearch = () => {
		searchQuery = '';
		searchResults = [];
		showResults = false;
		inputElement?.focus();
	};

	// --- Lifecycle ---
	onMount(() => {
		if (browser) {
			platformModifierKey = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl';
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('keydown', handleGlobalKeydown); // Use the new global handler

			if (autoFocus && inputElement) {
				setTimeout(() => {
					inputElement.focus();
				}, 100);
			}
		}
	});

	onDestroy(() => {
		if (browser) {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleGlobalKeydown); // Clean up global handler
		}
	});

	// Global keydown handler for Ctrl+K
	const handleGlobalKeydown = (event: KeyboardEvent) => {
		// Handle Escape key for closing results/modal
		if (event.key === 'Escape') {
			if (mobileMode && onToggleModal) {
				onToggleModal();
			} else {
				showResults = false;
			}
		}

		// Handle Ctrl+K / Cmd+K for focusing search
		if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
			event.preventDefault(); // Prevent browser's default Ctrl+K action
			inputElement?.focus();
		}
	};

	// --- Reactive Statements ---
	// Trigger search only when query changes (and is not undefined/null)
	$: if (typeof searchQuery === 'string') {
		if (searchQuery.trim()) {
			debouncedSearch();
		} else {
			// Clear results immediately when query is emptied
			searchResults = [];
			showResults = false;
		}
	}
</script>

<div class="relative {mobileMode ? 'flex flex-col w-full' : ''}">
	<div class="search-container relative">
		<div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
			<Search size={18} />
		</div>
		<input
			bind:this={inputElement}
			bind:value={searchQuery}
			class="bg-black border text-white px-4 py-2 rounded-full w-full outline-0 pl-10 pr-10 {mobileMode ? '' : 'pr-24'} transition-all duration-300 ease-in-out {inputFocused ? 'ring-2 ring-gold-400 shadow-lg shadow-gold-400/20 border-transparent' : 'border border-gray-700 hover:border-gray-500'}"
			on:focus={handleInputFocus}
			on:blur={() => inputFocused = false}
			placeholder="Search cards..."
			type="text"
		/>
		{#if searchQuery.length > 0}
			<button
				class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white z-10"
				on:click={handleClearSearch}
				aria-label="Clear search"
			>
				<X />
			</button>
		{:else if !inputFocused && platformModifierKey && !mobileMode}
			<div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-xs text-gray-500 pointer-events-none">
				<kbd class="px-1.5 py-0.5 border border-gray-600 bg-gray-800 rounded">{platformModifierKey === 'Cmd' ? '⌘' : 'Ctrl'}</kbd>
				<span class="text-base">+</span>
				<kbd class="px-1.5 py-0.5 border border-gray-600 bg-gray-800 rounded">K</kbd>
			</div>
		{/if}
	</div>

	{#if showResults && searchResults.length > 0}
		<div
			class="search-results {mobileMode ? 'mt-4' : 'absolute mt-2'} w-full bg-black rounded-lg shadow-lg overflow-y-auto max-h-96 z-[100] border border-gray-700"
			transition:fade={{ duration: 150 }}
		>
			{#each searchResults as card (card.cardCode)}
				{@const set = findSetByCardCode(card.cardCode, sets)}
				{@const cardNumber = extractCardNumberFromCode(card.cardCode)}
				{@const cardImage = processCardImage(card.image)}
				{@const cardLink = `/card/${card.cardCode}/`}
				{@const isAdded = addedCards.has(card.cardCode)}

				<div class="flex items-center p-3 hover:bg-gray-800 transition-colors duration-200 border-b border-gray-700 last:border-b-0 relative">
					<img
						src={cardImage}
						alt={card.name}
						class="h-20 w-14 object-contain rounded mr-4 flex-shrink-0"
						loading="lazy"
					/>

					<div class="flex-grow min-w-0 pr-2 flex flex-col">
						<a
							href={cardLink}
							class="text-sm"
							on:click={() => { if (mobileMode && onToggleModal) onToggleModal(); }}
						>
							<p class="font-semibold text-white truncate">{card.name}</p>
						</a>
						
						<div class="flex justify-between items-center mt-1">
							<a
								href={cardLink}
								class="flex-grow min-w-0 flex items-center"
								on:click={() => { if (mobileMode && onToggleModal) onToggleModal(); }}
							>
								<p class="text-sm text-gray-400 truncate max-w-[70%]">{set?.name || 'Unknown Set'}</p>
								<div class="text-xs text-gray-500 text-right ml-1 flex-shrink-0">
									#{cardNumber || '?'}{#if set?.printedTotal}/{set.printedTotal}{/if}
								</div>
							</a>
							
							{#if isBinderPage}
								<!-- Button to add to binder storage when on binder page -->
								<div class="flex-shrink-0 ml-2">
									<button 
										class="py-1 px-2 rounded flex items-center gap-1 transition-all duration-300 ease-in-out {isAdded ? 'bg-green-700 text-white' : 'text-gold-400 hover:text-white hover:bg-gray-700'} hover:shadow-lg transform hover:translate-y-[-1px]"
										on:click={(e) => {
											e.preventDefault();
											e.stopPropagation();
											if (!isAdded) addToBinderStorage(card);
										}}
										title={isAdded ? "Added to binder" : "Add to binder storage"}
										disabled={isAdded}
									>
										{#if isAdded}
											<div in:fly={{ y: 10, duration: 200 }}>
												<Check size={14} />
											</div>
											<span class="text-xs" in:fly={{ x: 5, duration: 200 }}>Added</span>
										{:else}
											<PlusCircle size={14} />
											<span class="text-xs">Add</span>
										{/if}
									</button>
								</div>
							{/if}
						</div>
						
						{#if prices[card.cardCode]?.simple}
							<a
								href={cardLink}
								class="block"
								on:click={() => { if (mobileMode && onToggleModal) onToggleModal(); }}
							>
								<p class="text-gold-400 font-medium mt-1 text-sm">
									{#if prices[card.cardCode]?.simple}
										{prices[card.cardCode]?.simple?.toFixed(2)} $
									{:else}
										Priceless
									{/if}
								</p>
							</a>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	button {
		-webkit-tap-highlight-color: transparent;
	}
	
	button:active:not(:disabled) {
		transform: scale(0.95);
	}
</style>
