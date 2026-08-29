<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import PlusCircle from '@lucide/svelte/icons/circle-plus';
	import Check from '@lucide/svelte/icons/check';
	import { processCardImage } from '$helpers/card-images';
	import type { FullCard, Set, PriceData } from '$lib/types';
	import { buildSetLookupMap, findSetByCardCode, findSetInLookup } from '$helpers/set-utils';
	import { page } from '$app/state';
	import { getBinderStorage, hasBinderStorage } from '$stores/binderContext';
	import { debounce } from '$helpers/debounce';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		prices: Record<string, PriceData>;
		allCards: FullCard[];
		autoFocus?: boolean;
		mobileMode?: boolean;
		onToggleModal?: (() => void) | undefined;
		sets: Set[];
	}

	let {
		prices,
		allCards,
		autoFocus = false,
		mobileMode = false,
		onToggleModal = undefined,
		sets
	}: Props = $props();

	let inputElement = $state<HTMLInputElement>();
	let searchQuery = $state('');
	let searchResults: FullCard[] = $state([]);
	let showResults = $state(false);
	const addedCards = new SvelteSet<string>(); // Card codes flashing the "added" state
	let platformModifierKey = $state('');
	let inputFocused = $state(false);

	const isBinderPage = $derived(page.url.pathname === '/binder');

	// Context reads only work during component initialization, so the binder store is grabbed here rather than when a card is added
	const binderStoredCards = hasBinderStorage() ? getBinderStorage() : null;

	function addToBinderStorage(card: FullCard) {
		if (!binderStoredCards) {
			const event = new CustomEvent('add-to-binder', { 
				detail: { cardCode: card.cardCode },
				bubbles: true 
			});
			document.dispatchEvent(event);
		} else {
			binderStoredCards.update((cards: string[]) => {
				if (!cards.includes(card.cardCode)) {
					return [...cards, card.cardCode];
				}
				return cards;
			});
		}
		
		addedCards.add(card.cardCode);
		
		setTimeout(() => {
			addedCards.delete(card.cardCode);
		}, 1500);
	}


	function extractCardNumberFromCode(cardCode: string): string {
		return cardCode?.split('_')[3] || '';
	}

	interface SearchEntry {
		card: FullCard;
		name: string;
		number: string;
		printedTotal: string;
		setCode: string;
		setName: string;
	}

	/**
	 * Resolving the set and lowercasing the fields per keystroke cost ~1 s over the 23k cards, because
	 * `findSetByCardCode` rescans every set. The index pays that once and each search is then a plain loop.
	 */
	let searchIndex: SearchEntry[] = [];
	let indexedCards: FullCard[] | null = null;

	function buildSearchIndex(): SearchEntry[] {
		if (indexedCards === allCards) return searchIndex;
		const lookup = buildSetLookupMap(sets);
		searchIndex = allCards.map(card => {
			const set = findSetInLookup(card.cardCode, lookup);
			return {
				card,
				name: card.name.toLowerCase(),
				number: extractCardNumberFromCode(card.cardCode).toLowerCase(),
				printedTotal: set?.printedTotal?.toString() ?? '',
				setCode: set?.ptcgoCode?.toLowerCase() ?? '',
				setName: set?.name.toLowerCase() ?? '',
			};
		});
		indexedCards = allCards;
		return searchIndex;
	}

	/** Higher is more relevant; 0 drops the card. Without it "pikachu" surfaced the Detective Pikachu set before any Pikachu. */
	function scoreEntry(entry: SearchEntry, query: string): number {
		const { name, number, printedTotal, setCode, setName } = entry;

		// Explicit combined forms win: they name a single printing.
		if (query.includes('/')) {
			const [queryNumber, queryTotal] = query.split('/');
			if (number === queryNumber && (queryTotal ? printedTotal === queryTotal : query.endsWith('/'))) return 130;
		}

		if (query.includes(' ')) {
			const parts = query.split(' ');
			const last = parts[parts.length - 1];
			if (/^\d+$/.test(last) && number === last) {
				const head = parts.slice(0, -1).join(' ');
				if (setCode === head) return 125;
				if (name.includes(head)) return 120;
			}
			// Card name + set name, trying every split point ("pikachu base set").
			for (let i = 1; i < parts.length; i++) {
				if (name.includes(parts.slice(0, i).join(' ')) && setName.includes(parts.slice(i).join(' '))) return 115;
			}
		}

		if (name === query) return 110;
		if (name.startsWith(query)) return 100;
		if (number === query) return 90;
		if (name.includes(query)) return 80;
		if (setCode === query) return 50;
		if (setName.includes(query)) return 40;
		return 0;
	}

	const performSearch = () => {
		const query = searchQuery.toLowerCase().trim();

		if (!query) {
			searchResults = [];
			showResults = false;
			return;
		}

		const matches: { entry: SearchEntry; score: number }[] = [];
		for (const entry of buildSearchIndex()) {
			const score = scoreEntry(entry, query);
			if (score > 0) matches.push({ entry, score });
		}

		searchResults = matches
			.sort((a, b) => b.score - a.score || a.entry.name.length - b.entry.name.length)
			.slice(0, 10)
			.map(match => match.entry.card);

		showResults = searchResults.length > 0;
	};

	const debouncedSearch = debounce(performSearch, 300);

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
		inputFocused = true;
	};

	const handleClearSearch = () => {
		searchQuery = '';
		searchResults = [];
		showResults = false;
		inputElement?.focus();
	};

	onMount(() => {
		platformModifierKey = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl';

		if (autoFocus && inputElement) {
			setTimeout(() => inputElement?.focus(), 100); // The modal is still transitioning in, focusing right away gets undone
		}
	});

	const handleGlobalKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			if (mobileMode && onToggleModal) {
				onToggleModal();
			} else {
				showResults = false;
			}
		}

		if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
			event.preventDefault();
			inputElement?.focus();
		}
	};

	$effect(() => {
		if (searchQuery.trim()) {
			debouncedSearch();
		} else {
			searchResults = [];
			showResults = false;
		}
	});
</script>

<svelte:document onclick={handleClickOutside} onkeydown={handleGlobalKeydown} />

<div class="relative {mobileMode ? 'flex flex-col w-full' : ''}">
	<div class="search-container relative">
		<div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
			<Search size={18} />
		</div>
		<input
			bind:this={inputElement}
			bind:value={searchQuery}
			class="bg-black border text-white px-4 py-2 rounded-full w-full outline-hidden pl-10 pr-10 {mobileMode ? '' : 'pr-24'} transition-all duration-300 ease-in-out {inputFocused ? 'ring-2 ring-gold-400 shadow-lg shadow-gold-400/20 border-transparent' : 'border border-gray-700 hover:border-gray-500'}"
			onfocus={handleInputFocus}
			onblur={() => inputFocused = false}
			placeholder="Search cards..."
			type="text"
		/>
		{#if searchQuery.length > 0}
			<button
				class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white z-10 flex items-center justify-center h-6 w-6"
				onclick={handleClearSearch}
				aria-label="Clear search"
				title="Clear search"
			>
				<X size={18} />
			</button>
		{:else if !inputFocused && platformModifierKey && !mobileMode}
			<div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-xs text-gray-500 pointer-events-none">
				<kbd class="px-1.5 py-0.5 border border-gray-600 bg-gray-800 rounded-sm">{platformModifierKey === 'Cmd' ? '⌘' : 'Ctrl'}</kbd>
				<span class="text-base">+</span>
				<kbd class="px-1.5 py-0.5 border border-gray-600 bg-gray-800 rounded-sm">K</kbd>
			</div>
		{/if}
	</div>

	{#if showResults && searchResults.length > 0}
		<div
			class="search-results {mobileMode ? 'mt-4' : 'absolute mt-2'} w-full bg-black rounded-lg shadow-lg overflow-y-auto max-h-96 z-100 border border-gray-700"
			transition:fade={{ duration: 150 }}
		>
			{#each searchResults as card (card.cardCode)}
				{@const set = findSetByCardCode(card.cardCode, sets)}
				{@const cardNumber = extractCardNumberFromCode(card.cardCode)}
				{@const cardImage = processCardImage(card.image)}
				{@const cardLink = `/card/${card.cardCode}/`}
				{@const isAdded = addedCards.has(card.cardCode)}

				<a 
					href={cardLink}
					class="block hover:bg-gray-800 transition-colors duration-200 border-b border-gray-700 last:border-b-0 relative"
					onclick={() => { if (mobileMode && onToggleModal) onToggleModal(); }}
				>
					<div class="flex items-center p-3 relative">
						<img
							src={cardImage}
							alt={card.name}
							class="h-20 w-14 object-contain rounded-sm mr-4 shrink-0"
							loading="lazy"
						/>

						<div class="grow min-w-0 pr-2 flex flex-col">
							<p class="font-semibold text-white truncate">{card.name}</p>
							
							<div class="flex justify-between items-center mt-1">
								<div class="grow min-w-0 flex items-center">
									<p class="text-sm text-gray-400 truncate max-w-[70%]">{set?.name || 'Unknown Set'}</p>
									<div class="text-xs text-gray-500 text-right ml-1 shrink-0">
										#{cardNumber || '?'}{#if set?.printedTotal}/{set.printedTotal}{/if}
									</div>
								</div>
								
								{#if isBinderPage}
									<div class="shrink-0 ml-2">
										<button 
											class="py-1 px-2 rounded-sm flex items-center gap-1 transition-all duration-300 ease-in-out {isAdded ? 'bg-green-700 text-white' : 'text-gold-400 hover:text-white hover:bg-gray-700'} hover:shadow-lg transform hover:-translate-y-px"
											onclick={(e) => {
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
								<p class="text-gold-400 font-medium mt-1 text-sm">
									{#if prices[card.cardCode]?.simple}
										{prices[card.cardCode]?.simple?.toFixed(2)} €
									{:else}
										Priceless
									{/if}
								</p>
							{/if}
						</div>
					</div>
				</a>
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
	
	/* Prevent clear button from scaling when clicked */
	.search-container button:active:not(:disabled) {
		transform: translateY(-50%);
	}
</style>
