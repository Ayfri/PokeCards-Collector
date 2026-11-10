<script lang="ts">
	import CardInfo from '#components/card/CardInfo.svelte';
	import CardLanguages from '#components/card/CardLanguages.svelte';
	import EvolutionChain from '#components/card/EvolutionChain.svelte';
	import RelatedCards from '#components/card/RelatedCards.svelte';
	import {NO_IMAGES} from '#helpers/card-images.ts';
	import {fade, fly} from 'svelte/transition';
	import type {CardPageSet, FullCard, Pokemon, PriceData} from '#lib/types.js';
	import { titleCase } from '#helpers/format.ts';
	import InteractiveCard from '#components/card/InteractiveCard.svelte';
	import { flushSync } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { catalogueOfPath, type LanguagePaths } from '#helpers/catalogues.ts';
	import { cardPath, cardSlug, type SetNeighbourLinks, setPath } from '#helpers/card-utils.ts';
	import { getPokemonImageSrc, handlePokemonImageError } from '#helpers/pokemon-utils.ts';
	import { morphCards } from '#helpers/view-transitions.ts';

	
	interface Props {
		lowRes?: boolean;
		neighbours: SetNeighbourLinks;
		/** The path of each Pokémon in the chain and next to the shown one, by Pokédex id. */
		pokemonPaths: Record<number, string>;
		pokemons: Pokemon[];
		prices: Record<string, PriceData>;
		/** The shown card first, then its other prints. */
		prints: FullCard[];
		sets: CardPageSet[];
		versions: Promise<LanguagePaths>;
	}

	let {
		lowRes = false,
		neighbours,
		pokemonPaths,
		pokemons,
		prices,
		prints,
		sets,
		versions
	}: Props = $props();

	const catalogue = $derived(catalogueOfPath(page.url.pathname));

	/**
	 * Derived from the load rather than set in `onMount`, so the server renders the whole card with its heading, details and links:
	 * crawlers that run no JavaScript, most answer engines among them, only read that HTML. A related pick or a Back into a shallow entry overrides it.
	 */
	let currentCard = $derived<FullCard | undefined>(prints[0]);

	const cardPrices = $derived(currentCard ? prices[currentCard.cardCode] : undefined);
	const currentSet = $derived(currentCard ? sets.find(set => set.setId === currentCard?.setId) : undefined);
	/** The neighbours belong to the loaded card: after a related print is swapped in, they would point around the wrong one. */
	const showNeighbours = $derived(currentCard?.cardCode === prints[0].cardCode && !!(neighbours.previous || neighbours.next));
	const currentType = $derived(currentCard?.types?.toLowerCase().split(',')[0] || 'unknown');
	const currentPokemonId = $derived(currentCard?.pokemonNumber);

	const currentPokemon = $derived(currentPokemonId ? pokemons.find(p => p.id === currentPokemonId) : undefined);
	const previousPokemon = $derived(currentPokemonId ? pokemons.find(p => p.id === currentPokemonId - 1) : undefined);
	const nextPokemon = $derived(currentPokemonId ? pokemons.find(p => p.id === currentPokemonId + 1) : undefined);

	/** Swaps the displayed card without a navigation: the picked tile flies up into the big card while the page jumps back to the top. */
	function handleCardSelect(selectedCard: FullCard) {
		goto(cardPath(catalogue.language, selectedCard), { replace: true, shallow: true });
		morphCards([selectedCard.cardCode], () => {
			currentCard = selectedCard;
			flushSync();
			window.scrollTo({ behavior: 'instant', top: 0 });
		});
	}

	/** Our shallow `goto` only rewrites the URL, the card is already swapped. A Back into that entry is `shallow` too but reloads the page, so it resyncs. */
	afterNavigate(({ shallow, type }) => {
		if (shallow && type === 'goto') return;

		/**
		 * Read from the address bar, not `page.url`: a Back into a shallow entry loads the page of the card it replaced, so `page.url`
		 * names that card. Card links have no trailing slash (`trailingSlash` is `never`), and the last non-empty segment also reads one that has.
		 * The pathname is percent-encoded (Japanese slugs), and the slug is NFC like the ones `cardSlug` builds.
		 */
		const slugFromUrl = decodeURIComponent(window.location.pathname.split('/').filter(Boolean).at(-1) ?? '').normalize('NFC');
		const isShown = (card: FullCard) => cardSlug(card, catalogue.language) === slugFromUrl;
		const matchingCard = prints.find(isShown);

		if (matchingCard && matchingCard !== currentCard) currentCard = matchingCard;
	});
</script>

<!-- The mobile row sits under the card, the desktop buttons flank it (`order`), and an empty slot keeps the card centered. -->
{#snippet pokemonNav(pokemon: Pokemon | undefined, href: string | undefined, side: 'prev' | 'next', desktop: boolean)}
	{#if pokemon && href}
		<a
			class={['flex-col items-center opacity-70 transition-[opacity,scale] duration-300 ease-[ease] hover:scale-110 hover:opacity-100', desktop ? 'hidden lg:flex w-48' : 'flex w-auto', desktop && (side === 'prev' ? 'order-1' : 'order-3')]}
			{href}
			in:fly={{ delay: 400, duration: 400, x: side === 'prev' ? -50 : 50 }}
			title="{titleCase(pokemon.name)} cards"
		>
			{#if !NO_IMAGES}
				<!-- Keyed: the fallback marks the element it already retried, and a reused one would skip the sprite for the next Pokémon. -->
				{#key pokemon.id}
					<img
						alt={titleCase(pokemon.name)}
						class={['object-contain', desktop ? 'size-24' : 'size-16']}
						onerror={event => handlePokemonImageError(event, pokemon.id)}
						src={getPokemonImageSrc(pokemon.id)}
						title={titleCase(pokemon.name)}
					/>
				{/key}
			{:else}
				<div class={['flex items-center justify-center text-white bg-gray-800 rounded-full', desktop ? 'size-24' : 'size-16 text-xs']}>
					#{pokemon.id}
				</div>
			{/if}
			<span class="mt-1 text-center text-xs font-bold">{titleCase(pokemon.name)}</span>
			<span class="text-xs text-gray-400">#{pokemon.id}</span>
		</a>
	{:else}
		<div class={desktop ? ['hidden lg:block w-48', side === 'prev' ? 'order-1' : 'order-3'] : 'w-16'}></div>
	{/if}
{/snippet}

<div class="flex flex-col gap-1 lg:gap-4 items-center content-center">
	{#if currentPokemon && currentCard}
		<div in:fly={{ delay: 100, duration: 400, y: -30 }}>
			<EvolutionChain card={currentCard} {pokemonPaths} {pokemons} {prints} />
		</div>
	{/if}

	{#if currentPokemon && currentCard?.pokemonNumber}
		<div class="relative text-center" in:fade={{ delay: 200, duration: 300 }}>
			<div class="text-gold-400 bg-black/60 font-bold px-3 py-1 rounded-md inline-block z-10">
				#{currentCard.pokemonNumber}
			</div>
		</div>
	{/if}

	<div class="w-full px-4 md:px-12 max-w-8xl mx-auto perspective-[1000px] flex flex-col items-center lg:flex-row lg:justify-between">

		<!-- The big card has no intro of its own: the page transition flies the opened card into it. -->
		<div class="relative shrink-0 order-1 lg:order-2 perspective-[1000px]">
			{#if currentPokemon && !NO_IMAGES}
				<div class="card-aura {currentType}"></div>
			{/if}
			<InteractiveCard
				card={currentCard}
				currentSet={currentSet}
				pokemon={currentPokemon}
			/>
		</div>

		<div class="w-full flex justify-between items-center mt-4 lg:hidden order-2">
			{@render pokemonNav(previousPokemon, previousPokemon && pokemonPaths[previousPokemon.id], 'prev', false)}
			{@render pokemonNav(nextPokemon, nextPokemon && pokemonPaths[nextPokemon.id], 'next', false)}
		</div>

		{@render pokemonNav(previousPokemon, previousPokemon && pokemonPaths[previousPokemon.id], 'prev', true)}
		{@render pokemonNav(nextPokemon, nextPokemon && pokemonPaths[nextPokemon.id], 'next', true)}
	</div>

	{#if currentCard && showNeighbours}
		<nav aria-label="Cards in this set" class="grid w-full max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-md bg-black/60 px-3 py-2 text-sm">
			{#if neighbours.previous}
				<a class="min-w-0 justify-self-start truncate text-white transition-colors hover:text-gold-400" href={neighbours.previous.path} rel="prev">
					‹ #{neighbours.previous.number} {neighbours.previous.name}
				</a>
			{:else}
				<span></span>
			{/if}
			<a class="max-w-40 truncate text-center font-bold text-gold-400 hover:underline sm:max-w-xs" href={setPath(currentSet ?? { name: currentCard.setName, setId: currentCard.setId }, catalogue)} title="View all cards in this set">
				{currentSet?.name ?? currentCard.setName}
			</a>
			{#if neighbours.next}
				<a class="min-w-0 justify-self-end truncate text-white transition-colors hover:text-gold-400" href={neighbours.next.path} rel="next">
					{neighbours.next.name} #{neighbours.next.number} ›
				</a>
			{:else}
				<span></span>
			{/if}
		</nav>
	{/if}

	{#if currentCard}
		<CardLanguages cardCode={currentCard.cardCode} known={{ cardCode: prints[0].cardCode, versions }} language={catalogue.language} />
	{/if}

	{#if currentCard && currentSet}
		<div class="w-full" in:fly={{ delay: 500, duration: 500, y: 50 }}>
			<CardInfo card={currentCard} {cardPrices} pokemon={currentPokemon} set={currentSet} />
		</div>
	{/if}

	<div class="gold-rule my-12" in:fade={{ delay: 600, duration: 600 }}></div>

	{#if prints.length > 1}
		<div class="w-full" in:fly={{ delay: 700, duration: 500, y: 50 }}>
			<RelatedCards cards={prints} {lowRes} onCardSelect={handleCardSelect} pokemon={currentPokemon} {pokemons} {prices} {sets} />
		</div>
	{/if}
</div>

{#if currentPokemon && !NO_IMAGES}
	<div class="filter {currentType}" transition:fade></div>
{/if}

<style>
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
		/* AVIF weighs 234 KB against 608 KB for the PNG, which only browsers without AVIF still fetch. */
		background-image: image-set(url(/particles.avif) type('image/avif'), url(/particles.png) type('image/png'));
		background-size: cover;
		filter: var(--filter);
		inset: 0;
		position: fixed;
		z-index: -20;
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
