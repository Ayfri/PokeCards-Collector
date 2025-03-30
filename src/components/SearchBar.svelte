<script lang="ts">
	import { fade } from 'svelte/transition';
	import { getCardImage } from '~/helpers/card-images.ts';
	import { onMount, onDestroy } from 'svelte';
	import type { Card } from '~/types.js';

	export let allCards: Card[] = [];
	export let autoFocus: boolean = false;
	export let mobileMode: boolean = false;
	export let onToggleModal: (() => void) | undefined = undefined;

	let searchQuery = '';
	let searchResults: Card[] = [];
	let showResults = false;
	let inputElement: HTMLInputElement;

	const searchCards = () => {
		const query = searchQuery.toLowerCase().trim();

		if (!query) {
			searchResults = [];
			return;
		}

		let scoredResults: Array<{card: Card, score: number}> = [];

		// Search with various criteria and assign scores
		allCards.forEach(card => {
			let score = 0;
			const cardCode = card.image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1');
			const pokemonName = card.pokemon.name.toLowerCase();
			const setTotal = card.set.printedTotal.toString();

			// Pokemon name match (highest priority)
			if (pokemonName.includes(query)) {
				score += 100;
				// Exact match or starts with gets higher score
				if (pokemonName === query) {
					score += 50;
				} else if (pokemonName.startsWith(query)) {
					score += 25;
				}
			}

			// Format "Name Number" like "Pikachu 123"
			if (query.includes(' ')) {
				const parts = query.split(' ');
				// If the last part is a number
				if (/^\d+$/.test(parts[parts.length - 1])) {
					const searchName = parts.slice(0, -1).join(' ').toLowerCase();
					const searchNumber = parts[parts.length - 1];

					// Check if name matches and number matches
					if (pokemonName.includes(searchName) && cardCode === searchNumber) {
						score += 120; // Higher than regular name match
					}
				}
			}

			// Card number match (high priority)
			if (cardCode === query) {
				score += 80;
			}

			// Card number format match (X/Y) (high priority)
			if (query.includes('/')) {
				const [queryNumber, queryTotal] = query.split('/');

				// Match exact card number and set total
				if (cardCode === queryNumber && setTotal === queryTotal) {
					score += 150; // Higher than any other match
				}
				// Match exact card number in a set with similar total count
				else if (cardCode === queryNumber) {
					// If the total count is close, also consider it a good match
					const totalDiff = Math.abs(parseInt(setTotal) - parseInt(queryTotal));
					if (totalDiff <= 5) {
						score += 90;
					} else {
						score += 70;
					}
				}
				// Match any card with the same X/Y ratio (relative position in the set)
				else if (queryTotal !== '0') {
					const cardPosition = parseInt(cardCode) / parseInt(setTotal);
					const queryPosition = parseInt(queryNumber) / parseInt(queryTotal);

					// If the relative positions are similar
					const positionDiff = Math.abs(cardPosition - queryPosition);
					if (positionDiff < 0.05) {
						score += 40;
					}
				}
			}

			// Rarity match (medium priority)
			if (card.rarity.toLowerCase().includes(query)) {
				score += 40;
			}

			// Types match (medium priority)
			if (card.types.toLowerCase().includes(query)) {
				score += 30;
			}

			// Set code + number format (e.g. "SV01 123") (medium priority)
			if (query.includes(' ')) {
				const [setCode, cardNumber] = query.split(' ');
				if (
					card.set.ptcgoCode?.toLowerCase() === setCode.toLowerCase() &&
					cardCode === cardNumber
				) {
					score += 60;
				}
			}

			// Set name match (lowest priority)
			if (card.set.name.toLowerCase().includes(query)) {
				score += 20;
			}

			// Add to results if there's any match
			if (score > 0) {
				scoredResults.push({ card, score });
			}
		});

		// Sort by score (highest first) and take top results
		// In mobile mode, show more results
		const limit = mobileMode ? 10 : 5;
		searchResults = scoredResults
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.map(result => result.card);
	};

	const handleClickOutside = (event: MouseEvent) => {
		// Skip handler in mobile mode as the search is full screen
		if (mobileMode) return;

		const target = event.target as Node;
		if (showResults && inputElement && !inputElement.contains(target) && !document.querySelector('.search-results')?.contains(target)) {
			showResults = false;
		}
	};

	const handleInputFocus = () => {
		if (searchQuery.trim() !== '') {
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
	};

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleKeydown);

		if (autoFocus && inputElement) {
			setTimeout(() => {
				inputElement.focus();
			}, 100);
		}
	});

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside);
		document.removeEventListener('keydown', handleKeydown);
	});

	$: if (searchQuery) {
		showResults = true;
		searchCards();
	} else {
		searchResults = [];
	}
</script>

<div class="relative {mobileMode ? 'flex flex-col w-full' : ''}">
	<div class="search-container relative">
		<div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
			<i class="fas fa-search"></i>
		</div>
		<input
			bind:this={inputElement}
			bind:value={searchQuery}
			class="bg-black text-white px-4 py-2 rounded-full w-full outline-none focus:ring-2 focus:ring-gold-400 pl-10"
			on:focus={handleInputFocus}
			placeholder="Search cards..."
			type="text"
		/>
		{#if searchQuery.length > 0}
			<button
				class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
				on:click={handleClearSearch}
			>
				✕
			</button>
		{/if}
	</div>

	{#if showResults && searchResults.length > 0}
		<div
			class="search-results {mobileMode ? 'mt-4' : 'absolute mt-2'} w-full bg-black rounded-lg shadow-lg overflow-hidden z-[100] border border-gray-700"
			transition:fade={{ duration: 150 }}
		>
			{#each searchResults as card}
				{@const setCode = card.set.ptcgoCode || card.image.split('/').at(-2)}
				{@const cardCode = card.image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1')}
				{@const cardImage = getCardImage(card.image)}

				<a
					href={`/card/${card.pokemon.id}/`}
					class="flex items-center p-3 hover:bg-gray-700 transition-colors duration-200 border-b border-gray-700 last:border-b-0"
				>
					<div class="card-preview mr-3 flex-shrink-0">
						<img
							src={cardImage}
							alt={card.pokemon.name}
							class="h-20 w-14 object-contain rounded"
							loading="lazy"
						/>
					</div>
					<div class="card-info flex-grow">
						<div class="pokemon-name font-bold text-white">
							{card.pokemon.name.charAt(0).toUpperCase() + card.pokemon.name.slice(1)}
						</div>
						<div class="set-info text-gray-300 text-sm flex justify-between">
							<span>
								{card.set.name} · {setCode}
							</span>
							<span>
								#{cardCode}/{card.set.printedTotal}
							</span>
						</div>
						<div class="price text-gold-400 text-sm">
							{card.price && card.price !== 100_000 ? `${card.price} $` : 'Priceless'}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else if showResults && searchQuery.trim() !== ''}
		<div
			class="search-results {mobileMode ? 'mt-4' : 'absolute mt-2'} w-full bg-black rounded-lg shadow-lg p-4 text-gray-400 z-[100] border border-gray-700"
			transition:fade={{ duration: 150 }}
		>
			No results found
		</div>
	{/if}
</div>
