<script lang="ts">
	import CardInfo from '#components/card/CardInfo.svelte';
	import CardLanguages from '#components/card/CardLanguages.svelte';
	import EvolutionChain from '#components/card/EvolutionChain.svelte';
	import RelatedCards from '#components/card/RelatedCards.svelte';
	import {NO_IMAGES} from '#lib/images.ts';
	import {fade, fly} from 'svelte/transition';
	import type {FullCard, Pokemon, Set, PriceData} from '#lib/types.js';
	import { pascalCase } from '#helpers/strings.ts';
	import InteractiveCard from '#components/card/InteractiveCard.svelte';
	import { flushSync, onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { catalogueOfPath, isTwinLanguage, type CardVersions } from '#helpers/catalogues.ts';
	import { getRepresentativeCardForPokemon } from '#helpers/card-utils.ts';
	import { getPokemonImageSrc, getPokemonSpriteSrc } from '#helpers/pokemon-utils.ts';
	import { loading } from '#stores/loading.svelte.ts';
	import { morphCards } from '#helpers/view-transitions.ts';

	
	interface Props {
		allCards: FullCard[];
		pokemons: Pokemon[];
		prices: Record<string, PriceData>;
		sets: Set[];
		pokemonCards: FullCard[];
		versions: Promise<CardVersions>;
		lowRes?: boolean;
	}

	let {
		allCards,
		pokemons,
		prices,
		sets,
		pokemonCards,
		versions,
		lowRes = false
	}: Props = $props();

	const catalogue = $derived(catalogueOfPath(page.url.pathname));

	const cardUrl = (cardCode: string) => catalogue.routeCode
		? resolve('/[catalogue=catalogue]-card/[cardCode]', { catalogue: catalogue.routeCode, cardCode })
		: resolve('/card/[cardCode]', { cardCode });

	let currentCard = $state<FullCard | undefined>(undefined);
	let isInitialRenderComplete = $state(false);

	const cardPrices = $derived(currentCard ? prices[currentCard.cardCode] : undefined);
	const currentSet = $derived(currentCard ? sets.find(set => set.setId === currentCard?.setId) : undefined);
	const currentType = $derived(currentCard?.types?.toLowerCase().split(',')[0] || 'unknown');
	const currentPokemonId = $derived(currentCard?.pokemonNumber);

	const currentPokemon = $derived(currentPokemonId ? pokemons.find(p => p.id === currentPokemonId) : undefined);
	const previousPokemon = $derived(currentPokemonId ? pokemons.find(p => p.id === currentPokemonId - 1) : undefined);
	const nextPokemon = $derived(currentPokemonId ? pokemons.find(p => p.id === currentPokemonId + 1) : undefined);
	const previousPokemonCard = $derived(previousPokemon ? getRepresentativeCardForPokemon(previousPokemon.id, allCards, prices) : undefined);
	const nextPokemonCard = $derived(nextPokemon ? getRepresentativeCardForPokemon(nextPokemon.id, allCards, prices) : undefined);

	/**
	 * Deduplicated by `cardCode`, because `allCards` can list the same card more than once.
	 * A Trainer/Energy keeps the load's `pokemonCards`, because swapping to another print never leaves its group.
	 */
	const currentPokemonCards = $derived([...new Map((currentPokemonId ? allCards.filter(c => c.pokemonNumber === currentPokemonId) : pokemonCards).map(c => [c.cardCode, c])).values()]);

	function handlePokemonImageError(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		const pokemonId = img.dataset.pokemonId;

		if (!pokemonId) {
			img.src = '/loading-spinner.svg';
			img.onerror = null;
			return;
		}

		if (img.src.includes('official-artwork')) {
			img.src = getPokemonSpriteSrc(Number(pokemonId));
		} else {
			img.src = '/loading-spinner.svg';
			img.onerror = null;
		}
	}

	/** Swaps the displayed card without a navigation: the picked tile flies up into the big card while the page jumps back to the top. */
	function handleCardSelect(selectedCard: FullCard) {
		const { cardCode } = selectedCard;
		goto(cardUrl(cardCode), { replace: true, shallow: true });
		morphCards([selectedCard.cardCode], () => {
			currentCard = selectedCard;
			flushSync();
			window.scrollTo({ behavior: 'instant', top: 0 });
		});
	}

	function handlePokemonNavigation(cardCode: string | undefined) {
		if (cardCode) {
			loading.navigation = true;
			goto(cardUrl(cardCode));
		}
	}

	onMount(() => {
		currentCard = pokemonCards[0];
		isInitialRenderComplete = true;
	});

	/** Our shallow `goto` only rewrites the URL, the card is already swapped. A Back into that entry is `shallow` too but reloads the page, so it resyncs. */
	afterNavigate(({ shallow, type }) => {
		if (shallow && type === 'goto') return;

		/**
		 * Read from the address bar, not `page.url`: a Back into a shallow entry loads the page of the card it replaced, so `page.url`
		 * names that card. Tile links end in a slash (`/card/<code>/`) and `resolve()` URLs do not, hence the last non-empty segment.
		 */
		const cardCodeFromUrl = window.location.pathname.split('/').filter(Boolean).at(-1);
		/** `pokemonCards` holds the viewed card with every column, `allCards` only its list fields, so it is searched first. */
		const matchingCard = pokemonCards.find(card => card.cardCode === cardCodeFromUrl) ?? allCards.find(card => card.cardCode === cardCodeFromUrl);

		if (matchingCard && matchingCard !== currentCard) {
			currentCard = matchingCard;
		} else if (!currentCard) {
			currentCard = pokemonCards[0];
		}

		isInitialRenderComplete = true;
	});
</script>

<div class="flex flex-col gap-1 lg:gap-4 items-center content-center">
	{#if currentPokemon && isInitialRenderComplete && currentCard}
		<div in:fly={{ y: -30, duration: 400, delay: 100 }}>
			<EvolutionChain card={currentCard} {pokemons} {allCards} pokemonCards={currentPokemonCards} {prices} />
		</div>
	{/if}

	{#if currentPokemon && currentCard?.pokemonNumber}
		<div class="pokedex-number-display relative text-center" in:fade={{ duration: 300, delay: 200 }}>
			<div class="pokedex-number text-gold-400 bg-black/60 font-bold px-3 py-1 rounded-md inline-block z-10">
				#{currentCard.pokemonNumber}
			</div>
		</div>
	{/if}

	<div class="card-display-area w-full px-4 md:px-12 max-w-8xl mx-auto perspective-container flex flex-col items-center">

		<!-- The big card has no intro of its own: the page transition flies the opened card into it. -->
		<div class="center-card-wrapper relative shrink-0 order-1 lg:order-2 perspective-container">
			{#if currentPokemon && !NO_IMAGES}
				<div class="card-aura {currentType}" id="card-aura"></div>
			{/if}
			<InteractiveCard
				card={currentCard}
				pokemon={currentPokemon}
				currentType={currentType}
				currentSet={currentSet}
			/>
		</div>

		<div class="mobile-nav-wrapper w-full flex justify-between items-center mt-4 lg:hidden order-2">
			{#if previousPokemon && previousPokemonCard}
				<button
					onclick={() => handlePokemonNavigation(previousPokemonCard.cardCode)}
					class="prev-pokemon-nav flex flex-col items-center w-auto opacity-70 hover:opacity-100 transition-opacity"
					in:fly={{ x: -50, duration: 400, delay: 400 }}
				>
					{#if !NO_IMAGES}
					<img
						src={getPokemonImageSrc(previousPokemon.id)}
						alt={pascalCase(previousPokemon.name)}
						class="w-16 h-16 object-contain nav-pokemon-image"
						title={pascalCase(previousPokemon.name)}
						onerror={handlePokemonImageError}
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

			{#if nextPokemon && nextPokemonCard}
				<button
					onclick={() => handlePokemonNavigation(nextPokemonCard.cardCode)}
					class="next-pokemon-nav flex flex-col items-center w-auto opacity-70 hover:opacity-100 transition-opacity"
					in:fly={{ x: 50, duration: 400, delay: 400 }}
				>
					{#if !NO_IMAGES}
					<img
						src={getPokemonImageSrc(nextPokemon.id)}
						alt={pascalCase(nextPokemon.name)}
						class="w-16 h-16 object-contain nav-pokemon-image"
						title={pascalCase(nextPokemon.name)}
						onerror={handlePokemonImageError}
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

		{#if previousPokemon && previousPokemonCard}
			<button
				onclick={() => handlePokemonNavigation(previousPokemonCard.cardCode)}
				class="prev-pokemon-nav hidden lg:flex flex-col items-center w-48 opacity-70 hover:opacity-100 transition-opacity order-1"
				in:fly={{ x: -50, duration: 400, delay: 400 }}
			>
				{#if !NO_IMAGES}
					<img
						src={getPokemonImageSrc(previousPokemon.id)}
						alt={pascalCase(previousPokemon.name)}
						class="w-24 h-24 object-contain nav-pokemon-image"
						title={pascalCase(previousPokemon.name)}
						onerror={handlePokemonImageError}
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

		{#if nextPokemon && nextPokemonCard}
			<button
				onclick={() => handlePokemonNavigation(nextPokemonCard.cardCode)}
				class="next-pokemon-nav hidden lg:flex flex-col items-center w-48 opacity-70 hover:opacity-100 transition-opacity order-3"
				in:fly={{ x: 50, duration: 400, delay: 400 }}
			>
				{#if !NO_IMAGES}
					<img
						src={getPokemonImageSrc(nextPokemon.id)}
						alt={pascalCase(nextPokemon.name)}
						class="w-24 h-24 object-contain nav-pokemon-image"
						title={pascalCase(nextPokemon.name)}
						onerror={handlePokemonImageError}
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

	{#if currentCard && isTwinLanguage(catalogue.language)}
		<CardLanguages cardCode={currentCard.cardCode} language={catalogue.language} known={{ cardCode: pokemonCards[0].cardCode, versions }} />
	{/if}

	{#if currentCard && currentSet}
		<div class="w-full" in:fly={{ y: 50, duration: 500, delay: 500 }}>
			<CardInfo card={currentCard} set={currentSet} {cardPrices} pokemon={currentPokemon} />
		</div>
	{/if}

	<div class="separator w-full max-w-200 my-12 h-1 bg-linear-to-r from-transparent via-gold-400 to-transparent" in:fade={{ duration: 600, delay: 600 }}></div>

	{#if currentPokemonCards.length > 1}
		<div class="w-full" in:fly={{ y: 50, duration: 500, delay: 700 }}>
			<RelatedCards cards={currentPokemonCards} {pokemons} {sets} {prices} pokemon={currentPokemon} onCardSelect={handleCardSelect} {lowRes} />
		</div>
	{/if}
</div>

{#if currentPokemon && !NO_IMAGES}
	<div class="filter {currentType}" id="filter" transition:fade></div>
{/if}

<style>
	.perspective-container {
		perspective: 1000px;
	}

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

	.filter {
		background-image: url(/particles.png);
		/* AVIF weighs 234 KB against 608 KB for the PNG, which only browsers without AVIF still fetch. */
		background-image: image-set(url(/particles.avif) type('image/avif'), url(/particles.png) type('image/png'));
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
			flex-direction: row;
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
