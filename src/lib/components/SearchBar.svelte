<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onDestroy, onMount } from 'svelte';
	import Search from 'lucide-svelte/icons/search';
	import X from 'lucide-svelte/icons/x';
	import { processCardImage } from '$helpers/card-images';
	import type { FullCard, Set } from '$lib/types';
	import { browser } from '$app/environment';

	// --- Props ---
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
			const set = sets.find(s => s.name === card.setName);
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
		.slice(0, mobileMode ? 10 : 5); // Limit results

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
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('keydown', handleKeydown);

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
			document.removeEventListener('keydown', handleKeydown);
		}
	});

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
		<div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
			<Search />
		</div>
		<input
			bind:this={inputElement}
			bind:value={searchQuery}
			class="bg-black text-white px-4 py-2 rounded-full w-full outline-none focus:ring-2 focus:ring-gold-400 pl-10 pr-10"
			on:focus={handleInputFocus}
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
		{/if}
	</div>

	{#if showResults && searchResults.length > 0}
		<div
			class="search-results {mobileMode ? 'mt-4' : 'absolute mt-2'} w-full bg-black rounded-lg shadow-lg overflow-y-auto max-h-96 z-[100] border border-gray-700"
			transition:fade={{ duration: 150 }}
		>
			{#each searchResults as card (card.cardCode)}
				{@const set = sets.find(s => s.name === card.setName)}
				{@const cardNumber = extractCardNumberFromCode(card.cardCode)}
				{@const cardImage = processCardImage(card.image)}
				{@const cardLink = `/card/${set?.ptcgoCode || 'unknown'}/${cardNumber || 'unknown'}`}

				<a
					href={cardLink}
					class="flex items-center p-3 hover:bg-gray-800 transition-colors duration-200 border-b border-gray-700 last:border-b-0"
					on:click={() => { if (mobileMode && onToggleModal) onToggleModal(); }}
				>
					<img
						src={cardImage}
						alt={card.name}
						class="h-20 w-14 object-contain rounded mr-4 flex-shrink-0"
						loading="lazy"
					/>
					<div class="flex-grow text-sm">
						<p class="font-semibold text-white truncate">{card.name}</p>
						<p class="text-gray-400 truncate">{set?.name || 'Unknown Set'}</p>
						{#if card.price}
							<p class="text-gold-400 font-medium mt-1">{card.price.toFixed(2)} $</p>
						{/if}
					</div>
					<div class="text-xs text-gray-500 ml-2 text-right flex-shrink-0">
						#{cardNumber || '?'}{#if set?.printedTotal}/{set.printedTotal}{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
