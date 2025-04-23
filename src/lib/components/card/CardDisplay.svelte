<script lang="ts">
	import CardInfo from '@components/card/CardInfo.svelte';
	import EvolutionChain from '@components/card/EvolutionChain.svelte';
	import RelatedCards from '@components/card/RelatedCards.svelte';
	import {NO_IMAGES} from '$lib/images';
	import {fade} from 'svelte/transition';
	import type {FullCard, Pokemon, Set, PriceData} from '$lib/types';
	import { pascalCase } from '$helpers/strings';
	import CardImage from '@components/card/CardImage.svelte';
	import { onMount } from 'svelte';
	import { pushState } from '$app/navigation';
	import { findSetByCardCode } from '$helpers/set-utils';

	// --- Props ---
	export let cards: FullCard[]; // Expects the primary card to be the first element
	export let pokemons: Pokemon[]; // Full list for lookups (prev/next, evolutions)
	export let prices: Record<string, PriceData>;
	export let sets: Set[];
	export let pokemon: Pokemon | undefined = undefined; // Make Pokemon optional

	// --- Reactive State ---
	// The primary card to display is the first one in the sorted list
	$: card = cards[0];
	$: cardPrices = prices[card.cardCode];

	// Safely find the current set
	$: currentSet = findSetByCardCode(card.cardCode, sets);
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

	// Update the displayed card and URL when a related card is selected
	function handleCardSelect(selectedCard: FullCard) {
		card = selectedCard;
		pushState(`/card/${selectedCard.cardCode}/`, {});
		window.scroll({
			top: 150,
			behavior: 'smooth'
		});
	}

	// Helper function to get a representative card for a Pokemon
	function getRepresentativeCardForPokemon(pokemonId: number): FullCard | undefined {
		// Find all cards for this Pokemon
		const pokemonCards = cards.filter(c => c.pokemonNumber === pokemonId);
		if (pokemonCards.length === 0) return undefined;
		
		// Sort by price (highest first) and return the first one
		return [...pokemonCards].sort((a, b) => (prices[b.cardCode]?.simple ?? 0) - (prices[a.cardCode]?.simple ?? 0))[0];
	}

	// --- Lifecycle ---
	onMount(() => {
		// Initialize history state only if it's a Pokemon card and the URL doesn't already match
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

<div class="flex flex-col gap-1 lg:gap-8 content-center">
	<!-- Evolution Chain Component (Only for Pokemon) -->
	{#if pokemon && isInitialRenderComplete}
		<EvolutionChain {card} {pokemons} {cards} {prices} />
	{/if}

	<!-- Pokédex number indicator (Only for Pokemon) -->
	{#if pokemon && card?.pokemonNumber}
		<div class="pokedex-number-display text-center mb-2">
			<div class="pokedex-number text-gold-400 bg-black/60 font-bold px-3 py-1 rounded-md inline-block z-10">
				#{card.pokemonNumber}
			</div>
		</div>
	{/if}

	<!-- Main card display container -->
	<div class="card-display-area w-full px-4 md:px-12 max-w-8xl mx-auto perspective-container flex flex-col items-center">

		<!-- Center Card -->
		<div class="center-card-wrapper relative flex-shrink-0 order-1 lg:order-2">
			<!-- Conditional Aura for Pokemon Types -->
			{#if pokemon && !NO_IMAGES}
				<div class="card-aura {currentType}" id="card-aura"></div>
			{/if}
			<div
				class="w-[21rem] h-[29rem] sm:w-[20rem] sm:h-[28rem] lg:w-[23rem] lg:h-[32rem] max-w-full mx-auto rounded-xl shadow-lg card-face interactive-card {pokemon ? '' : 'non-pokemon'}"
				bind:this={centerCard}
				data-card-id={currentSet?.name}
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

		<!-- Mobile Navigation Wrapper -->
		<div class="mobile-nav-wrapper w-full flex justify-between items-center mt-4 lg:hidden order-2">
			<!-- Previous Pokemon (Mobile) -->
			{#if pokemon && previousPokemon}
				{@const prevCard = getRepresentativeCardForPokemon(previousPokemon.id)}
				<a 
					href={prevCard ? `/card/${prevCard.cardCode}/` : `/card/${previousPokemon.id}/`} 
					class="prev-pokemon-nav flex flex-col items-center w-auto opacity-70 hover:opacity-100 transition-opacity"
				>
					{#if !NO_IMAGES}
					<img
						src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${previousPokemon.id}.png`}
						alt={pascalCase(previousPokemon.name)}
						class="w-16 h-16 object-contain nav-pokemon-image"
						title={pascalCase(previousPokemon.name)}
						on:error={handlePokemonImageError}
						data-pokemon-id={previousPokemon.id}
					/>
					{:else}
					<div class="w-16 h-16 flex items-center justify-center text-white text-xs bg-gray-800 rounded-full">
						#{previousPokemon.id}
					</div>
					{/if}
					<span class="nav-pokemon-name mt-1 text-center text-xs font-bold">{pascalCase(previousPokemon.name)}</span>
					<span class="nav-pokemon-id text-xs text-gray-400">#{previousPokemon.id}</span>
				</a>
			{:else}
				<div class="w-16"></div> <!-- Placeholder for alignment -->
			{/if}

			<!-- Next Pokemon (Mobile) -->
			{#if pokemon && nextPokemon}
				{@const nextCard = getRepresentativeCardForPokemon(nextPokemon.id)}
				<a 
					href={nextCard ? `/card/${nextCard.cardCode}/` : `/card/${nextPokemon.id}/`} 
					class="next-pokemon-nav flex flex-col items-center w-auto opacity-70 hover:opacity-100 transition-opacity"
				>
					{#if !NO_IMAGES}
					<img
						src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${nextPokemon.id}.png`}
						alt={pascalCase(nextPokemon.name)}
						class="w-16 h-16 object-contain nav-pokemon-image"
						title={pascalCase(nextPokemon.name)}
						on:error={handlePokemonImageError}
						data-pokemon-id={nextPokemon.id}
					/>
					{:else}
					<div class="w-16 h-16 flex items-center justify-center text-white text-xs bg-gray-800 rounded-full">
						#{nextPokemon.id}
					</div>
					{/if}
					<span class="nav-pokemon-name mt-1 text-center text-xs font-bold">{pascalCase(nextPokemon.name)}</span>
					<span class="nav-pokemon-id text-xs text-gray-400">#{nextPokemon.id}</span>
				</a>
			{:else}
				<div class="w-16"></div> <!-- Placeholder for alignment -->
			{/if}
		</div>

		<!-- Desktop Navigation -->
		<!-- Previous Pokemon (Desktop) -->
		{#if pokemon && previousPokemon}
			{@const prevCard = getRepresentativeCardForPokemon(previousPokemon.id)}
			<a 
				href={prevCard ? `/card/${prevCard.cardCode}/` : `/card/${previousPokemon.id}/`} 
				class="prev-pokemon-nav hidden lg:flex flex-col items-center w-48 opacity-70 hover:opacity-100 transition-opacity order-1"
			>
				{#if !NO_IMAGES}
				<img
					src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${previousPokemon.id}.png`}
					alt={pascalCase(previousPokemon.name)}
					class="w-24 h-24 object-contain nav-pokemon-image"
					title={pascalCase(previousPokemon.name)}
					on:error={handlePokemonImageError}
					data-pokemon-id={previousPokemon.id}
				/>
				{:else}
				<div class="w-24 h-24 flex items-center justify-center text-white bg-gray-800 rounded-full">
					#{previousPokemon.id}
				</div>
				{/if}
				<span class="nav-pokemon-name mt-1 text-center text-xs font-bold">{pascalCase(previousPokemon.name)}</span>
				<span class="nav-pokemon-id text-xs text-gray-400">#{previousPokemon.id}</span>
			</a>
		{:else}
			<div class="hidden lg:block w-48 order-1"></div>
		{/if}

		<!-- Next Pokemon (Desktop) -->
		{#if pokemon && nextPokemon}
			{@const nextCard = getRepresentativeCardForPokemon(nextPokemon.id)}
			<a 
				href={nextCard ? `/card/${nextCard.cardCode}/` : `/card/${nextPokemon.id}/`} 
				class="next-pokemon-nav hidden lg:flex flex-col items-center w-48 opacity-70 hover:opacity-100 transition-opacity order-3"
			>
				{#if !NO_IMAGES}
				<img
					src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${nextPokemon.id}.png`}
					alt={pascalCase(nextPokemon.name)}
					class="w-24 h-24 object-contain nav-pokemon-image"
					title={pascalCase(nextPokemon.name)}
					on:error={handlePokemonImageError}
					data-pokemon-id={nextPokemon.id}
				/>
				{:else}
				<div class="w-24 h-24 flex items-center justify-center text-white bg-gray-800 rounded-full">
					#{nextPokemon.id}
				</div>
				{/if}
				<span class="nav-pokemon-name mt-1 text-center text-xs font-bold">{pascalCase(nextPokemon.name)}</span>
				<span class="nav-pokemon-id text-xs text-gray-400">#{nextPokemon.id}</span>
			</a>
		{:else}
			<div class="hidden lg:block w-48 order-3"></div>
		{/if}
	</div>

	<!-- Card Information Component -->
	{#if card && currentSet}
		<CardInfo {card} set={currentSet} {cardPrices} {pokemon} />
	{/if}

	<!-- Other Related Cards (Pokemon or Same Name Cards) -->
	{#if cards.length > 1 && shouldRenderAllCards}
		<RelatedCards {cards} {pokemons} {sets} {prices} {pokemon} onCardSelect={handleCardSelect} />
	{/if}
</div>

<!-- Background Filter (Conditional on Pokemon Type?) -->
{#if pokemon && !NO_IMAGES}
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
		aspect-ratio: 1 / 1;
		background-color: var(--type-color);
		border-radius: 50%;
		filter: blur(5rem) opacity(.5);
		left: 50%;
		max-width: 100%;
		pointer-events: none;
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		transition: all .3s ease-in-out;
		width: 43rem;
		z-index: -20;
	}

	/* Fixed background filter that covers the entire page */
	.filter {
		background-image: url(../../../particles.png);
		background-size: cover;
		content: "";
		filter: var(--filter);
		height: 100%;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		position: fixed;
		width: 100%;
		z-index: -20;
	}

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

	.nav-pokemon-name {
		font-weight: bold;
	}

	.pokedex-number-display {
		position: relative;
	}

	@media (min-width: 1024px) {
		.card-display-area {
			flex-direction: row; /* Row layout for desktop */
			justify-content: space-between;
			align-items: center;
		}
	}

	@media (max-width: 1023px) { /* Adjusted breakpoint slightly */
		/* Styles moved to Tailwind classes */
		/* .card-navigation-container {
			flex-direction: column;
			align-items: center;
			padding: 0;
			gap: 1rem;
		} */

		/* Updated styles for mobile navigation */
		/* .prev-pokemon-nav, .next-pokemon-nav {
			width: 8rem;
			opacity: 1;
			margin-top: 1rem;
		} */

		/* .prev-pokemon-nav {
			order: 1;
		} */

		/* .center-card-wrapper {
			order: 2;
			margin: 0;
			width: 100%;
			display: flex;
			justify-content: center;
			margin-top: 1rem;
		} */

		/* .next-pokemon-nav {
			order: 3;
		} */

		/* .prev-pokemon-placeholder, .next-pokemon-placeholder {
			display: none;
		} */

		/* .nav-pokemon-image {
			width: 4rem;
			height: 4rem;
		} */

		/* .nav-pokemon-name, .nav-pokemon-id {
			display: block;
		} */

		/* Moved card size adjustments to Tailwind */
		/* .interactive-card {
			width: 18rem;
			height: 25rem;
		} */

		.card-aura {
			filter: blur(20px);
			opacity: 0.5;
		}
	}

	@media (max-width: 640px) {
		/* Moved card size adjustments to Tailwind */
		/* .interactive-card {
			width: 15rem;
			height: 21rem;
		} */

		.card-aura {
			filter: blur(15px);
			opacity: 0.4;
		}

		/* Further mobile adjustments if needed */
	}
</style>
