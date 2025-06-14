<script lang="ts">
	import CardInfo from '@components/card/CardInfo.svelte';
	import EvolutionChain from '@components/card/EvolutionChain.svelte';
	import RelatedCards from '@components/card/RelatedCards.svelte';
	import {NO_IMAGES} from '$lib/images';
	import {fade, fly} from 'svelte/transition';
	import type {FullCard, Pokemon, Set, PriceData} from '$lib/types';
	import { pascalCase } from '$helpers/strings';
	import InteractiveCard from '@components/card/InteractiveCard.svelte';
	import { onMount } from 'svelte';
	import { afterNavigate, goto, replaceState } from '$app/navigation';
	import { findSetByCardCode } from '$helpers/set-utils';
	import { getRepresentativeCardForPokemon } from '$helpers/card-utils';
	import { setNavigationLoading } from '$lib/stores/loading';

	// --- Props ---
	export let allCards: FullCard[];
	export let pokemons: Pokemon[];
	export let prices: Record<string, PriceData>;
	export let sets: Set[];
	export let pokemonCards: FullCard[];
	export let isJapaneseContext: boolean = false;
	export let lowRes: boolean = false;

	// --- Internal State ---
	let currentCard: FullCard | undefined = undefined;
	let isInitialRenderComplete = false;
	let shouldRenderAllCards = false;

	// --- Reactive Computations ---
	$: baseCardUrl = isJapaneseContext ? '/jp-card/' : '/card/';
	$: cardPrices = currentCard ? prices[currentCard.cardCode] : undefined;
	$: currentSet = currentCard ? findSetByCardCode(currentCard.cardCode, sets) : undefined;
	$: currentType = currentCard?.types?.toLowerCase().split(',')[0] || 'unknown';
	$: currentPokemonId = currentCard?.pokemonNumber;

	$: currentPokemon = currentPokemonId ? pokemons.find(p => p.id === currentPokemonId) : undefined;
	$: previousPokemon = currentPokemonId ? pokemons.find(p => p.id === currentPokemonId - 1) : undefined;
	$: nextPokemon = currentPokemonId ? pokemons.find(p => p.id === currentPokemonId + 1) : undefined;
	$: previousPokemonCard = previousPokemon ? getRepresentativeCardForPokemon(previousPokemon.id, allCards, prices) : undefined;
	$: nextPokemonCard = nextPokemon ? getRepresentativeCardForPokemon(nextPokemon.id, allCards, prices) : undefined;

	$: currentPokemonCards = currentPokemonId ? allCards.filter(c => c.pokemonNumber === currentPokemonId) : [];

	// --- Functions ---
	function handlePokemonImageError(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		const pokemonId = img.dataset.pokemonId;

		if (!pokemonId) {
			img.src = '/loading-spinner.svg';
			img.onerror = null;
			return;
		}

		if (img.src.includes('official-artwork')) {
			img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
		} else {
			img.src = '/loading-spinner.svg';
			img.onerror = null;
		}
	}

	function handleCardSelect(selectedCard: FullCard) {
		// Simply update the current card without navigation
		currentCard = selectedCard;

		// Optionally update the URL in the browser without reload
		if (typeof window !== 'undefined') {
			const newUrl = `${baseCardUrl}${selectedCard.cardCode}/`;
			replaceState(newUrl, { replaceUrl: true });
			window.scrollTo({
				top: 0,
				behavior: 'smooth'
			});
		}
	}

	function handlePokemonNavigation(cardCode: string | undefined) {
		if (cardCode) {
			setNavigationLoading(true);
			goto(`${baseCardUrl}${cardCode}`);
		}
	}

	// --- Lifecycle ---
	onMount(() => {
		currentCard = pokemonCards[0];
		isInitialRenderComplete = true;
		setTimeout(() => shouldRenderAllCards = true, 800);
	});

	afterNavigate(() => {
		const urlParts = window.location.pathname.split('/');
		const cardCodeFromUrl = urlParts[urlParts.length - 2];
		const matchingCard = allCards.find(card => card.cardCode === cardCodeFromUrl);

		if (matchingCard && matchingCard !== currentCard) {
			currentCard = matchingCard;
		} else if (!currentCard) {
			currentCard = pokemonCards[0];
		}

		isInitialRenderComplete = true;
		if (!shouldRenderAllCards) {
			setTimeout(() => shouldRenderAllCards = true, 800);
		}
	});

	// Ensure unique cards in currentPokemonCards
	$: if (currentPokemonId) {
		const uniqueCardCodes = new Set<string>();
		currentPokemonCards = allCards
			.filter(c => c.pokemonNumber === currentPokemonId)
			.filter(c => {
				if (!uniqueCardCodes.has(c.cardCode)) {
					uniqueCardCodes.add(c.cardCode);
					return true;
				}
				return false;
			});
	} else {
		currentPokemonCards = [];
	}
</script>

<div class="flex flex-col gap-1 lg:gap-4 items-center content-center">
	<!-- Evolution Chain Component (Only for Pokemon) -->
	{#if currentPokemon && isInitialRenderComplete && currentCard}
		<div in:fly={{ y: -30, duration: 400, delay: 100 }}>
			<EvolutionChain card={currentCard} {pokemons} {allCards} pokemonCards={currentPokemonCards} {prices} />
		</div>
	{/if}

	<!-- Pokédex number indicator (Only for Pokemon) -->
	{#if currentPokemon && currentCard?.pokemonNumber}
		<div class="pokedex-number-display relative text-center" in:fade={{ duration: 300, delay: 200 }}>
			<div class="pokedex-number text-gold-400 bg-black/60 font-bold px-3 py-1 rounded-md inline-block z-10">
				#{currentCard.pokemonNumber}
			</div>
		</div>
	{/if}

	<!-- Main card display container -->
	<div class="card-display-area w-full px-4 md:px-12 max-w-8xl mx-auto perspective-container flex flex-col items-center">

		<!-- Center Card -->
		<div class="center-card-wrapper relative flex-shrink-0 order-1 lg:order-2 perspective-container" in:fly={{ y: 50, duration: 500, delay: 300 }}>
			<!-- Conditional Aura for Pokemon Types -->
			{#if currentPokemon && !NO_IMAGES}
				<div class="card-aura {currentType}" id="card-aura"></div>
			{/if}
			<InteractiveCard
				card={currentCard}
				pokemon={currentPokemon}
				currentType={currentType}
				currentSet={currentSet}
				handlePokemonImageError={handlePokemonImageError}
			/>
		</div>

		<!-- Mobile Navigation Wrapper -->
		<div class="mobile-nav-wrapper w-full flex justify-between items-center mt-4 lg:hidden order-2">
			<!-- Previous Pokemon (Mobile) -->
			{#if previousPokemon && previousPokemonCard}
				<button
					on:click={() => handlePokemonNavigation(previousPokemonCard.cardCode)}
					class="prev-pokemon-nav flex flex-col items-center w-auto opacity-70 hover:opacity-100 transition-opacity"
					in:fly={{ x: -50, duration: 400, delay: 400 }}
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
				</button>
			{:else}
				<div class="w-16"></div>
			{/if}

			<!-- Next Pokemon (Mobile) -->
			{#if nextPokemon && nextPokemonCard}
				<button
					on:click={() => handlePokemonNavigation(nextPokemonCard.cardCode)}
					class="next-pokemon-nav flex flex-col items-center w-auto opacity-70 hover:opacity-100 transition-opacity"
					in:fly={{ x: 50, duration: 400, delay: 400 }}
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
				</button>
			{:else}
				<div class="w-16"></div>
			{/if}
		</div>

		<!-- Desktop Navigation -->
		<!-- Previous Pokemon (Desktop) -->
		{#if previousPokemon && previousPokemonCard}
			<button
				on:click={() => handlePokemonNavigation(previousPokemonCard.cardCode)}
				class="prev-pokemon-nav hidden lg:flex flex-col items-center w-48 opacity-70 hover:opacity-100 transition-opacity order-1"
				in:fly={{ x: -50, duration: 400, delay: 400 }}
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
			</button>
		{:else}
			<div class="hidden lg:block w-48 order-1"></div>
		{/if}

		<!-- Next Pokemon (Desktop) -->
		{#if nextPokemon && nextPokemonCard}
			<button
				on:click={() => handlePokemonNavigation(nextPokemonCard.cardCode)}
				class="next-pokemon-nav hidden lg:flex flex-col items-center w-48 opacity-70 hover:opacity-100 transition-opacity order-3"
				in:fly={{ x: 50, duration: 400, delay: 400 }}
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
			</button>
		{:else}
			<div class="hidden lg:block w-48 order-3"></div>
		{/if}
	</div>

	<!-- Card Information Component -->
	{#if currentCard && currentSet}
		<div class="w-full" in:fly={{ y: 50, duration: 500, delay: 500 }}>
			<CardInfo card={currentCard} set={currentSet} {cardPrices} pokemon={currentPokemon} />
		</div>
	{/if}

	<div class="separator w-full max-w-[800px] my-12 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent" in:fade={{ duration: 600, delay: 600 }}></div>

	<!-- Other Related Cards (Pokemon or Same Name Cards) -->
	{#if currentPokemonCards.length > 1 && shouldRenderAllCards}
		<div class="w-full" in:fly={{ y: 50, duration: 500, delay: 700 }}>
			<RelatedCards cards={currentPokemonCards} {pokemons} {sets} {prices} pokemon={currentPokemon} onCardSelect={handleCardSelect} {lowRes} />
		</div>
	{/if}
</div>

<!-- Background Filter (Conditional on Pokemon Type?) -->
{#if currentPokemon && !NO_IMAGES}
	<div class="filter {currentType}" id="filter" transition:fade></div>
{/if}

<style>
	.perspective-container {
		perspective: 1000px;
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
		background-image: url(/particles.png);
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

	@media (min-width: 1024px) {
		.card-display-area {
			flex-direction: row; /* Row layout for desktop */
			justify-content: space-between;
			align-items: center;
		}
	}

	@media (max-width: 1023px) {
		.card-aura {
			filter: blur(20px);
			opacity: 0.5;
		}
	}

	@media (max-width: 640px) {
		.card-aura {
			filter: blur(15px);
			opacity: 0.4;
		}
	}
</style>
