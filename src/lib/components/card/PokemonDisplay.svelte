<script lang="ts">
	import PokemonInfo from '@components/card/PokemonInfo.svelte';
	import EvolutionChain from '@components/card/EvolutionChain.svelte';
	import AllPokemonCards from '@components/card/AllPokemonCards.svelte';
	import {fade} from 'svelte/transition';
	import type {FullCard, Pokemon, Set} from '$lib/types';
	import { spriteCache } from '$stores/spriteCache';
	import { pascalCase } from '$helpers/strings';
	import CardImage from '@components/card/CardImage.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	export let pokemons: Pokemon[];
	export let cards: FullCard[];
	export let sets: Set[];
	export let sprites: Record<number, string>;

	// Reactive statement to find the correct card based on the URL ID
	$: currentPokemonId = parseInt($page.params.id, 10);
	$: card = cards.find(c => c.pokemonNumber === currentPokemonId) ?? cards[0]; // Fallback to first card if not found

	// Indicator for when initial loading is complete
	let isInitialRenderComplete = false;
	let shouldRenderAllCards = false;

	let centerCard: HTMLElement;

	$: currentSet = sets.find(set => set.name === card.setName)!!;
	$: currentType = card.types.toLowerCase().split(',')[0];

	let debounceTimer: number;
	let cursorX = 0;
	let cursorY = 0;
	let maxRotate = 25; // Max rotation in degrees

	// Find the previous pokemon in the Pokédex
	$: previousPokemon = pokemons.find(p => p.id === card.pokemonNumber!! - 1);

	// Find the next pokemon in the Pokédex
	$: nextPokemon = pokemons.find(p => p.id === card.pokemonNumber!! + 1);

	// Replace previous/next error handlers with a single one
	function handlePokemonImageError(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		// Use a known fallback and prevent loops if the fallback itself fails
		const fallbackSrc = '/loading-spinner.svg';
		if (img.src !== fallbackSrc) {
			img.src = fallbackSrc;
			img.onerror = null; // Prevent infinite loops
		}
	}

	// Preload missing sprites - only for adjacent Pokémon (optimization)
	async function ensureSprite(pokemonId: number) {
		if (!sprites[pokemonId]) {
			try {
				sprites[pokemonId] = await spriteCache.getSprite(pokemonId);
			} catch (error) {
				console.error(`Failed to load sprite for Pokemon #${pokemonId}`);
			}
		}
		return sprites[pokemonId];
	}

	// Optimization: Using throttle to limit style updates when mouse moves
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

			// Calculate rotation based on mouse position within the card
			const rotateY = ((l / w) * 2 - 1) * maxRotate; // Map x pos to [-maxRotate, maxRotate]
			const rotateX = (1 - (t / h) * 2) * maxRotate; // Map y pos to [-maxRotate, maxRotate] (inverted Y)

			// Update CSS custom properties
			centerCard.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
			centerCard.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
		} else {
			if (!centerCard.classList.contains('inactive')) {
				centerCard.classList.add('inactive');
				// Remove custom properties to allow CSS transition back to default
				centerCard.style.removeProperty('--rx');
				centerCard.style.removeProperty('--ry');
			}
		}
	}, 16); // Throttle to ~60fps

	function handleMouseMove(event: MouseEvent) {
		const {clientX, clientY} = event;
		cursorX = clientX;
		cursorY = clientY;
		throttledUpdateCardStyle(clientX, clientY);
	}

	function handleCardSelect(selectedCard: FullCard) {
		const selectedSet = sets.find(set => set.name === selectedCard.setName);
		if (selectedSet) {
			currentSet = selectedSet;

			// Extract information for the URL
			const pokemonId = selectedCard.pokemonNumber!!;
			const setCode = selectedSet.ptcgoCode;
			const cardCode = selectedCard.image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1');

			// Build the new URL
			const newUrl = `/card/${pokemonId}/?set=${setCode}&number=${cardCode}`;

			// Update the URL without refreshing the page
			history.pushState({ pokemonId, setCode, cardCode }, '', newUrl);
		}
	}

	onMount(() => {
		// Initialize the history state with the current card (might need adjustment)
		const initialSet = sets.find(set => set.name === card.setName);
		if (initialSet) {
			const initialState = {
				pokemonId: card.pokemonNumber!!,
				setCode: initialSet.ptcgoCode,
				cardCode: card.image?.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1')
			};
			history.replaceState(initialState, '', window.location.href);
		}

		// Mark the initial render as complete after a short delay
		setTimeout(() => {
			isInitialRenderComplete = true;
		}, 0);

		// Load the AllPokemonCards component asynchronously
		setTimeout(() => {
			shouldRenderAllCards = true;
		}, 100);
	});
</script>

<svelte:window on:mousemove={handleMouseMove}/>

<div class="max-lg:flex max-lg:flex-col max-lg:gap-8 max-lg:flex-wrap max-lg:content-center">
	<!-- Evolution Chain Component -->
	{#if isInitialRenderComplete}
		<EvolutionChain {card} {pokemons} {cards} {sprites} />
	{/if}

	<!-- Pokédex number indicator -->
	<div class="pokedex-number-display text-center mb-2">
		<div class="pokedex-number text-gold-400 bg-black/60 font-bold px-3 py-1 rounded-md inline-block z-10">
			#{card.pokemonNumber}
		</div>
	</div>

	<!-- Main card display with adjacent navigation -->
	<div class="card-navigation-container flex items-center justify-between w-full px-12 max-w-8xl mx-auto perspective-container">
		<!-- Previous Pokemon -->
		{#if previousPokemon}
			<a href={`/card/${previousPokemon.id}/`} class="prev-pokemon-nav flex flex-col items-center w-48">
				<div class="nav-pokemon-wrapper relative">
					<div class="pokemon-sprite-container relative">
						{#await ensureSprite(previousPokemon.id)}
							<img
								src="/loading-spinner.svg"
								alt={pascalCase(previousPokemon.name)}
								class="w-32 h-32 object-contain nav-pokemon-image silhouette"
								title={pascalCase(previousPokemon.name)}
								on:error={handlePokemonImageError}
								data-pokemon-id={previousPokemon.id}
							/>
						{:then sprite}
							<img
								src={sprite}
								alt={pascalCase(previousPokemon.name)}
								class="w-32 h-32 object-contain nav-pokemon-image silhouette"
								title={pascalCase(previousPokemon.name)}
								on:error={handlePokemonImageError}
								data-pokemon-id={previousPokemon.id}
							/>
						{/await}
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
			<div class="card-aura {currentType}" id="card-aura"></div>
			<div
				class="w-[23rem] max-w-[23rem] h-[32rem] max-h-[32rem] mx-auto rounded-xl shadow-lg card-face interactive-card"
				bind:this={centerCard}
				data-card-id={currentSet.ptcgoCode}
				data-card-type={currentType}
			>
				{#key card.image}
					<CardImage
						alt={pokemons.find(p => p.id === card.pokemonNumber)?.name}
						imageUrl={card.image}
						highRes={true}
						height={544}
						width={384}
						class="image rounded-xl"
						lazy={false}
					/>
				{/key}
			</div>
		</div>

		<!-- Next Pokemon -->
		{#if nextPokemon}
			<a href={`/card/${nextPokemon.id}/`} class="next-pokemon-nav flex flex-col items-center w-48">
				<div class="nav-pokemon-wrapper relative">
					<div class="pokemon-sprite-container relative">
						{#await ensureSprite(nextPokemon.id)}
							<img
								src="/loading-spinner.svg"
								alt={pascalCase(nextPokemon.name)}
								class="w-32 h-32 object-contain nav-pokemon-image silhouette"
								title={pascalCase(nextPokemon.name)}
								data-pokemon-id={nextPokemon.id}
							/>
						{:then sprite}
							<img
								src={sprite}
								alt={pascalCase(nextPokemon.name)}
								class="w-32 h-32 object-contain nav-pokemon-image silhouette"
								title={pascalCase(nextPokemon.name)}
								on:error={handlePokemonImageError}
								data-pokemon-id={nextPokemon.id}
							/>
						{/await}
					</div>
				</div>
				<span class="nav-pokemon-name mt-2 text-center text-sm">{pascalCase(nextPokemon.name)}</span>
				<span class="nav-pokemon-id text-xs text-gray-400 mt-1">#{nextPokemon.id}</span>
			</a>
		{:else}
			<div class="w-48"></div> <!-- Placeholder for alignment -->
		{/if}
	</div>

	<!-- Pokémon Info Component -->
	{#if isInitialRenderComplete}
		{@const pokemon = pokemons.find(p => p.id === card.pokemonNumber)}
		{#if pokemon}
			<PokemonInfo {card} {pokemon} />
		{/if}
	{/if}

</div>

<!-- Lazy load AllPokemonCards -->
{#if shouldRenderAllCards}
	<div class="container mx-auto px-4 py-8" transition:fade|global>
		{#if card.pokemonNumber}
			<AllPokemonCards {cards} {pokemons} {sets} currentPokemonId={card.pokemonNumber} onCardSelect={handleCardSelect}/>
		{/if}
	</div>
{/if}

<div class="filter {currentType}" id="filter" transition:fade></div>

<style>
	.perspective-container {
		perspective: 1000px;
	}

	.interactive-card {
		/* Variables driven by JS */
		--rx: 0deg;
		--ry: 0deg;

		/* Base state */
		transform-style: preserve-3d;
		transform: rotateX(var(--rx)) rotateY(var(--ry));
		transition: transform 0.3s ease-out; /* Unified transition duration */
		position: relative; /* Needed for positioning children like CardImage */
		overflow: hidden; /* Clip children to rounded corners */
	}

	#card-aura {
		background-color: var(--type-color);
		border-radius: 50%;
		filter: blur(5rem) opacity(0.5);
		height: 43rem;
		left: 50%;
		pointer-events: none;
		position: absolute;
		top: 50%;
		transform: translateX(-50%) translateY(-50%);
		transition: all 0.3s ease-in-out;
		width: 43rem;
		z-index: -20;
	}

	.filter {
		background-image: url("/particles.png");
		background-size: cover;
		content: "";
		filter: var(--filter);
		height: 100%;
		inset: 0 0 0 0;
		position: fixed;
		width: 100%;
		z-index: -20;
	}

	.pokedex-number-display {
		height: 2.5rem; /* Fixed height to prevent layout shift */
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-pokemon-wrapper {
		transition: transform 0.4s ease-in-out;
	}

	.prev-pokemon-nav:hover .nav-pokemon-wrapper,
	.next-pokemon-nav:hover .nav-pokemon-wrapper {
		transform: scale(1.05);
	}

	.nav-pokemon-image {
		transition: filter 0.4s ease-in-out;
	}

	.nav-pokemon-image.silhouette {
		/* filter: brightness(0) invert(0.2) sepia(0.5) hue-rotate(180deg); */
		filter: grayscale(100%) brightness(0.2) opacity(0.8);
	}

	.prev-pokemon-nav:hover .nav-pokemon-image.silhouette,
	.next-pokemon-nav:hover .nav-pokemon-image.silhouette {
		filter: none; /* Reveal color on hover */
	}

	.nav-pokemon-name {
		color: #ccc; /* Lighter color for better readability */
		transition: color 0.4s ease-in-out;
	}

	.prev-pokemon-nav:hover .nav-pokemon-name,
	.next-pokemon-nav:hover .nav-pokemon-name {
		color: #fff; /* Brighten on hover */
	}

	/* Existing styles */
	:global(.dark) .silhouette {
		/* filter: brightness(1.5) contrast(0.9) saturate(0); */
		filter: grayscale(100%) brightness(0.7) opacity(0.8); /* Adjusted for grey silhouette in dark mode */
	}

	:global(.dark) .prev-pokemon-nav:hover .nav-pokemon-image.silhouette,
	:global(.dark) .next-pokemon-nav:hover .nav-pokemon-image.silhouette {
		filter: none;
	}

	/* Responsive adjustments if necessary */
	@media (max-width: 1024px) {
		.card-navigation-container {
			flex-direction: column;
			gap: 1rem;
			padding: 1rem;
			perspective: none; /* Disable perspective on smaller screens? Or adjust? */
		}

		.prev-pokemon-nav,
		.next-pokemon-nav {
			order: 2; /* Place nav arrows below card */
			width: auto;
		}

		.center-card-wrapper {
			order: 1;
			margin: 0;
		}

		.interactive-card {
			width: 80vw; /* Adjust width for smaller screens */
			height: auto; /* Adjust height proportionally */
			aspect-ratio: 63 / 88; /* Standard Pokemon card ratio */
			max-width: none;
			max-height: none;
			transform: none !important; /* Disable rotation on small screens */
			transition: none;
		}
	}

</style>
