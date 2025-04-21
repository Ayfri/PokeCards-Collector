<script lang="ts">
	import CardInfo from '@components/card/CardInfo.svelte';
	import EvolutionChain from '@components/card/EvolutionChain.svelte';
	import RelatedCards from '@components/card/RelatedCards.svelte';
	import {fade} from 'svelte/transition';
	import type {FullCard, Pokemon, Set, CardMarketPrices} from '$lib/types';
	import { pascalCase } from '$helpers/strings';
	import CardImage from '@components/card/CardImage.svelte';
	import { onMount } from 'svelte';

	// --- Props ---
	export let cards: FullCard[]; // Expects the primary card to be the first element
	export let pokemons: Pokemon[]; // Full list for lookups (prev/next, evolutions)
	export let sets: Set[];
	export let pokemon: Pokemon | undefined = undefined; // Make Pokemon optional
	export let cardmarket: CardMarketPrices = {
		averageSellPrice: 0,
		avg1: 0,
		avg7: 0,
		avg30: 0,
		reverseHoloAvg1: 0,
		reverseHoloAvg7: 0,
		reverseHoloAvg30: 0,
		germanProLow: 0,
		lowPrice: 0,
		reverseHoloLow: 0,
		lowPriceExPlus: 0,
		trendPrice: 0,
		suggestedPrice: 0,
		reverseHoloSell: 0,
		reverseHoloTrend: 0
	};

	// --- Reactive State ---
	// The primary card to display is the first one in the sorted list
	$: card = cards[0];

	// Safely find the current set
	$: currentSet = sets.find(set => set.name === card?.setName);
	// Safely determine the card type
	$: currentType = card?.types?.toLowerCase().split(',')[0] || 'unknown';

	// Find previous/next Pokémon only if the current card is a Pokémon card
	$: previousPokemon = pokemon ? pokemons.find(p => p.id === pokemon!!.id - 1) : undefined;
	$: nextPokemon = pokemon ? pokemons.find(p => p.id === pokemon!!.id + 1) : undefined;

	// Indicator for when initial loading is complete
	let isInitialRenderComplete = false;
	let shouldRenderAllCards = false;

	let centerCard: HTMLElement;
	let debounceTimer: number;
	let cursorX = 0;
	let cursorY = 0;
	let maxRotate = 25; // Max rotation in degrees

	// --- Functions ---
	function handlePokemonImageError(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		const pokemonId = img.dataset.pokemonId;
		const currentSrc = img.src;
		const defaultSpriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
		const loadingSpinner = '/loading-spinner.svg';

		if (!pokemonId) {
			img.src = loadingSpinner;
			img.onerror = null;
			return;
		}

		if (currentSrc.includes('official-artwork')) {
			// Official artwork failed, try default sprite
			img.src = defaultSpriteUrl;
		} else {
			// Default sprite also failed (or it was the first attempt and it failed), show spinner
			img.src = loadingSpinner;
			img.onerror = null; // Prevent infinite loop
		}
	}

	function throttle(fn: Function, delay: number) {
		let canRun = true;
		return (...args: any[]) => {
			if (canRun) {
				fn(...args);
				canRun = false;
				setTimeout(() => {
					canRun = true;
				}, delay);
			}
		};
	}

	const throttledUpdateCardStyle = throttle((clientX: number, clientY: number) => {
		const rect = centerCard?.getBoundingClientRect();
		if (!rect) return;

		const isInCard = clientX >= rect.left && clientX <= rect.right &&
			clientY >= rect.top && clientY <= rect.bottom;

		if (isInCard) {
			centerCard.classList.remove('inactive');
			const l = clientX - rect.left;
			const t = clientY - rect.top;
			const h = rect.height;
			const w = rect.width;
			const rotateY = ((l / w) * 2 - 1) * maxRotate;
			const rotateX = (1 - (t / h) * 2) * maxRotate;
			centerCard.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
			centerCard.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
		} else {
			if (!centerCard.classList.contains('inactive')) {
				centerCard.classList.add('inactive');
				centerCard.style.removeProperty('--rx');
				centerCard.style.removeProperty('--ry');
			}
		}
	}, 16);

	function handleMouseMove(event: MouseEvent) {
		const {clientX, clientY} = event;
		cursorX = clientX;
		cursorY = clientY;
		throttledUpdateCardStyle(clientX, clientY);
	}

	// This function likely only applies when displaying Pokemon cards
	// Ensure pokemonNumber exists before using it.
	function handleCardSelect(selectedCard: FullCard) {
		const selectedSet = sets.find(set => set.name === selectedCard.setName);
		// Only proceed if it's a Pokemon card with a number and set
		if (selectedSet && selectedCard.pokemonNumber) {
			currentSet = selectedSet;
			const pokemonId = selectedCard.pokemonNumber;
			const setCode = selectedSet.ptcgoCode;
			// Extract card number more robustly (handle potential missing parts)
			const filenameParts = selectedCard.image?.split('/').at(-1)?.split('_') || [];
			const cardNumberRaw = filenameParts[0] || '';
			const cardNumberMatch = cardNumberRaw.match(/[a-z]*(\d+)[a-z]*/i);
			const cardNumber = cardNumberMatch ? cardNumberMatch[1] : undefined;

			if (pokemonId && setCode && cardNumber) {
				const newUrl = `/card/${pokemonId}?set=${setCode}&number=${cardNumber}`;
				history.pushState({ pokemonId, setCode, cardNumber }, '', newUrl);
			} else {
				console.warn('Could not determine full card details for URL update', selectedCard);
			}
		}
	}

	// --- Lifecycle ---
	onMount(() => {
		// Initialize history state only if it's a Pokemon card
		if (pokemon && card?.pokemonNumber && currentSet) {
			const filenameParts = card.image?.split('/').at(-1)?.split('_') || [];
			const cardNumberRaw = filenameParts[0] || '';
			const cardNumberMatch = cardNumberRaw.match(/[a-z]*(\d+)[a-z]*/i);
			const cardNumber = cardNumberMatch ? cardNumberMatch[1] : undefined;

			if (currentSet.ptcgoCode && cardNumber) {
				const initialState = {
					pokemonId: pokemon.id,
					setCode: currentSet.ptcgoCode,
					cardNumber: cardNumber
				};
				history.replaceState(initialState, '', window.location.href);
			}
		}

		setTimeout(() => {
			isInitialRenderComplete = true;
		}, 0);

		setTimeout(() => {
			shouldRenderAllCards = true;
		}, 100);
	});
</script>

<svelte:window on:mousemove={handleMouseMove}/>

<div class="max-lg:flex max-lg:flex-col max-lg:gap-8 max-lg:flex-wrap max-lg:content-center">
	<!-- Evolution Chain Component (Only for Pokemon) -->
	{#if pokemon && isInitialRenderComplete}
		<EvolutionChain {card} {pokemons} {cards} />
	{/if}

	<!-- Pokédex number indicator (Only for Pokemon) -->
	{#if pokemon && card?.pokemonNumber}
		<div class="pokedex-number-display text-center mb-2">
			<div class="pokedex-number text-gold-400 bg-black/60 font-bold px-3 py-1 rounded-md inline-block z-10">
				#{card.pokemonNumber}
			</div>
		</div>
	{/if}

	<!-- Main card display with adjacent navigation -->
	<div class="card-navigation-container flex items-center justify-between w-full px-12 max-w-8xl mx-auto perspective-container">
		<!-- Previous Pokemon (Only for Pokemon) -->
		{#if pokemon && previousPokemon}
			<a href={`/card/${previousPokemon.id}/`} class="prev-pokemon-nav flex flex-col items-center w-48">
				<div class="nav-pokemon-wrapper relative">
					<div class="pokemon-sprite-container relative">
						<img
							src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${previousPokemon.id}.png`}
							alt={pascalCase(previousPokemon.name)}
							class="w-32 h-32 object-contain nav-pokemon-image silhouette"
							title={pascalCase(previousPokemon.name)}
							on:error={handlePokemonImageError}
							data-pokemon-id={previousPokemon.id}
						/>
					</div>
				</div>
				<span class="nav-pokemon-name mt-2 text-center text-sm">{pascalCase(previousPokemon.name)}</span>
				<span class="nav-pokemon-id text-xs text-gray-400 mt-1">#{previousPokemon.id}</span>
			</a>
		{:else}
			<div class="w-48"></div> <!-- Placeholder for alignment -->
		{/if}

		<!-- Center Card -->
		<div class="center-card-wrapper relative flex-shrink-0 mx-4">
			<!-- Conditional Aura for Pokemon Types -->
			{#if pokemon}
				<div class="card-aura {currentType}" id="card-aura"></div>
			{/if}
			<div
				class="w-[23rem] max-w-[23rem] h-[32rem] max-h-[32rem] mx-auto rounded-xl shadow-lg card-face interactive-card {pokemon ? '' : 'non-pokemon'}"
				bind:this={centerCard}
				data-card-id={currentSet?.ptcgoCode}
				data-card-type={currentType}
			>
				{#key card?.image} <!-- Use key for smooth transitions -->
					<CardImage
						alt={pokemon ? pokemon.name : card?.name || 'Card image'}
						imageUrl={card?.image}
						highRes={true}
						height={544}
						width={384}
						class="image rounded-xl"
						lazy={false}
					/>
				{/key}
			</div>
		</div>

		<!-- Next Pokemon (Only for Pokemon) -->
		{#if pokemon && nextPokemon}
			<a href={`/card/${nextPokemon.id}/`} class="next-pokemon-nav flex flex-col items-center w-48">
				<div class="nav-pokemon-wrapper relative">
					<div class="pokemon-sprite-container relative">
						<img
							src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${nextPokemon.id}.png`}
							alt={pascalCase(nextPokemon.name)}
							class="w-32 h-32 object-contain nav-pokemon-image silhouette"
							title={pascalCase(nextPokemon.name)}
							on:error={handlePokemonImageError}
							data-pokemon-id={nextPokemon.id}
						/>
					</div>
				</div>
				<span class="nav-pokemon-name mt-2 text-center text-sm">{pascalCase(nextPokemon.name)}</span>
				<span class="nav-pokemon-id text-xs text-gray-400 mt-1">#{nextPokemon.id}</span>
			</a>
		{:else}
			<div class="w-48"></div> <!-- Placeholder for alignment -->
		{/if}
	</div>

	<!-- Card Information Component -->
	{#if card && currentSet}
		<CardInfo {card} set={currentSet} {cardmarket} {pokemon} />
	{/if}

	<!-- Other Related Cards (Pokemon or Same Name Cards) -->
	{#if cards.length > 1 && shouldRenderAllCards}
		<RelatedCards {cards} {pokemons} {sets} {pokemon} onCardSelect={handleCardSelect} />
	{/if}
</div>

<!-- Background Filter (Conditional on Pokemon Type?) -->
{#if pokemon}
	<div class="filter {currentType}" id="filter" transition:fade></div>
{/if}

<style>
	.perspective-container {
		perspective: 1000px;
	}

	.interactive-card {
		transform-style: preserve-3d;
		transition: transform 0.05s linear, filter 0.3s ease;
		transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
	}

	.interactive-card.inactive {
		transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1); /* Smooth return */
	}

	/* Card Aura Styles */
	.card-aura {
		position: absolute;
		top: -10%;
		left: -10%;
		width: 120%;
		height: 120%;
		border-radius: 1.5rem; /* Slightly larger than card radius */
		z-index: -1;
		filter: blur(25px);
		opacity: 0.6;
		transition: background 0.5s ease;
	}

	/* Individual type colors */
	.card-aura.grass { background: radial-gradient(circle, rgba(120, 200, 80, 0.8), transparent 70%); }
	.card-aura.fire { background: radial-gradient(circle, rgba(240, 128, 48, 0.8), transparent 70%); }
	.card-aura.water { background: radial-gradient(circle, rgba(104, 144, 240, 0.8), transparent 70%); }
	.card-aura.lightning { background: radial-gradient(circle, rgba(248, 208, 48, 0.8), transparent 70%); }
	.card-aura.psychic { background: radial-gradient(circle, rgba(248, 88, 136, 0.8), transparent 70%); }
	.card-aura.fighting { background: radial-gradient(circle, rgba(192, 48, 40, 0.8), transparent 70%); }
	.card-aura.darkness { background: radial-gradient(circle, rgba(112, 88, 72, 0.8), transparent 70%); }
	.card-aura.metal { background: radial-gradient(circle, rgba(184, 184, 208, 0.8), transparent 70%); }
	.card-aura.dragon { background: radial-gradient(circle, rgba(112, 56, 248, 0.8), transparent 70%); }
	.card-aura.fairy { background: radial-gradient(circle, rgba(238, 153, 172, 0.8), transparent 70%); }
	.card-aura.colorless { background: radial-gradient(circle, rgba(168, 168, 120, 0.8), transparent 70%); }
	.card-aura.unknown { background: radial-gradient(circle, rgba(104, 160, 144, 0.8), transparent 70%); }

	/* Navigation Pokemon Styles */
	.prev-pokemon-nav, .next-pokemon-nav {
		cursor: pointer;
		transition: transform 0.3s ease, opacity 0.3s ease;
		opacity: 0.7;
	}

	.prev-pokemon-nav:hover, .next-pokemon-nav:hover {
		transform: scale(1.1);
		opacity: 1;
	}

	.nav-pokemon-image {
		transition: filter 0.3s ease;
	}

	.nav-pokemon-image.silhouette {
		filter: brightness(0.3) contrast(1.1) saturate(0.9);
	}

	.prev-pokemon-nav:hover .nav-pokemon-image.silhouette,
	.next-pokemon-nav:hover .nav-pokemon-image.silhouette {
		filter: brightness(1) contrast(1) saturate(1);
	}

	.nav-pokemon-name {
		font-weight: bold;
	}

	.pokedex-number-display {
		position: relative;
	}

	@media (max-width: 1024px) {
		.card-navigation-container {
			flex-direction: column;
			align-items: center;
			padding: 0;
			gap: 1rem;
		}

		.prev-pokemon-nav, .next-pokemon-nav {
			position: absolute;
			top: 50%;
			transform: translateY(-50%);
			z-index: 10;
			width: 5rem;
		}

		.prev-pokemon-nav {
			left: 1rem;
		}

		.next-pokemon-nav {
			right: 1rem;
		}

		.nav-pokemon-image {
			width: 3rem;
			height: 3rem;
		}

		.nav-pokemon-name, .nav-pokemon-id {
			display: none; /* Hide text on smaller screens */
		}

		.center-card-wrapper {
			order: 2; /* Ensure card is visually between nav buttons */
			margin: 0;
			width: 100%; /* Allow card to take full width */
			display: flex;
			justify-content: center;
			margin-top: 1rem; /* Add some space */
		}

		.interactive-card {
			width: 18rem;
			height: 25rem;
		}

		.card-aura {
			filter: blur(20px);
			opacity: 0.5;
		}
	}

	@media (max-width: 640px) {
		.interactive-card {
			width: 15rem;
			height: 21rem;
		}

		.card-aura {
			filter: blur(15px);
			opacity: 0.4;
		}

		.prev-pokemon-nav {
			left: 0.5rem;
		}

		.next-pokemon-nav {
			right: 0.5rem;
		}
	}
</style>
