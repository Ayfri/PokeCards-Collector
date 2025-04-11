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
	import { page } from '$app/stores'; // Import the page store

	export let pokemons: Pokemon[];
	export let cards: FullCard[];
	export let sets: Set[];
	export let sprites: Record<number, string>;

	// Reactive statement to find the correct card based on the URL ID
	$: currentPokemonId = parseInt($page.params.id, 10);
	$: card = cards.find(c => c.pokemonNumber === currentPokemonId) ?? cards[0]; // Fallback to first card if not found

	// Indicateur pour savoir si on a fini le chargement initial
	let isInitialRenderComplete = false;
	let shouldRenderAllCards = false;

	let centerCard: HTMLElement;
	let styleElement: HTMLStyleElement = null!;

	$: currentSet = sets.find(set => set.name === card.setName)!!;
	$: currentType = card.types.toLowerCase().split(',')[0];

	let debounceTimer: number;
	let cursorX = 0;
	let cursorY = 0;
	let maxRotate = 25; // Max rotation in degrees

	// Trouver le pokémon précédent dans le Pokédex
	$: previousPokemon = pokemons.find(p => p.id === card.pokemonNumber!! - 1);

	// Trouver le pokémon suivant dans le Pokédex
	$: nextPokemon = pokemons.find(p => p.id === card.pokemonNumber!! + 1);

	// Gestionnaires d'erreurs pour les images Pokémon
	function handlePreviousPokemonError(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		if (!previousPokemon) return;
		// Ajouter une classe pour éviter une boucle infinie si les deux images échouent
		if (img.classList.contains('fallback-attempted')) {
			img.src = '/loading-spinner.svg';
			img.onerror = null; // Empêcher la gestion d'erreur ultérieure
		} else {
			img.classList.add('fallback-attempted');
		}
	}

	function handleNextPokemonError(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		if (!nextPokemon) return;
		// Ajouter une classe pour éviter une boucle infinie si les deux images échouent
		if (img.classList.contains('fallback-attempted')) {
			img.src = '/loading-spinner.svg';
			img.onerror = null; // Empêcher la gestion d'erreur ultérieure
		} else {
			img.classList.add('fallback-attempted');
		}
	}

	// Préchargement des sprites manquants - uniquement pour les Pokémon adjacents (optimisation)
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

	// Préchargement optimisé des sprites pour les Pokémon adjacents uniquement
	$: if (previousPokemon && !sprites[previousPokemon.id]) {
		ensureSprite(previousPokemon.id);
	}

	$: if (nextPokemon && !sprites[nextPokemon.id]) {
		ensureSprite(nextPokemon.id);
	}

	// Optimisation: Utilisation de throttle pour limiter les mises à jour de style lors du mouvement de la souris
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

			// Extraire les informations pour l'URL
			const pokemonId = selectedCard.pokemonNumber!!;
			const setCode = selectedSet.ptcgoCode;
			const cardCode = selectedCard.image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1');

			// Construire la nouvelle URL
			const newUrl = `/card/${pokemonId}/?set=${setCode}&number=${cardCode}`;

			// Mettre à jour l'URL sans rafraîchir la page
			history.pushState({ pokemonId, setCode, cardCode }, '', newUrl);
		}
	}

	// Gestionnaire pour les événements de navigation (bouton précédent/suivant du navigateur)
	// This might become redundant or need adjustment with the reactive approach
	// function handlePopState(event: PopStateEvent) {
	// 	if (event.state) {
	// 		const { setCode, cardCode } = event.state;
	// 		// Trouver la carte correspondante
	// 		const selectedCard = cards.find(c => {
	// 			const cardSetCode = c.setName; // Assuming setName corresponds to setCode somehow
	// 			const imageCardNumber = c.image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1');
	// 			// Need to ensure setCode maps correctly to setName if they differ
	// 			const selectedSet = sets.find(set => set.ptcgoCode === setCode); // Find set by ptcgoCode
	// 			return selectedSet && c.setName === selectedSet.name && imageCardNumber === cardCode;
	// 		});
	// 		if (selectedCard) {
	// 			card = selectedCard; // Update the reactive card variable
	// 		}
	// 	}
	// }

	onMount(() => {
		// Remove style element creation and appending
		// styleElement = document.createElement('style');
		// document.head.appendChild(styleElement);

		// window.addEventListener('popstate', handlePopState); // Consider removing or adapting popstate

		// Initialiser l'état de l'historique avec la carte actuelle (might need adjustment)
		// Ensure this reflects the card found via $page.params.id
		const initialSet = sets.find(set => set.name === card.setName);
		if (initialSet) {
			const initialState = {
				pokemonId: card.pokemonNumber!!,
				setCode: initialSet.ptcgoCode,
				cardCode: card.image?.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1')
			};
			history.replaceState(initialState, '', window.location.href);
		}

		// Marquer le rendu initial comme terminé après un court délai
		setTimeout(() => {
			isInitialRenderComplete = true;
		}, 0);

		// Charger le composant AllPokemonCards de manière différée
		setTimeout(() => {
			shouldRenderAllCards = true;
		}, 100);

		return () => {
			// window.removeEventListener('popstate', handlePopState); // Cleanup popstate listener if kept
			// Remove style element removal
			// if (styleElement && styleElement.parentNode) {
			// 	styleElement.parentNode.removeChild(styleElement);
			// }
		};
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
		<div class="pokedex-number text-gold-400 font-bold px-3 py-1 rounded-md inline-block">
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
						<img
							src={sprites[previousPokemon.id]}
							alt={pascalCase(previousPokemon.name)}
							class="w-32 h-32 object-contain nav-pokemon-image silhouette"
							title={pascalCase(previousPokemon.name)}
							on:error={handlePreviousPokemonError}
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
						height={544}
						width={384}
						class="image rounded-xl"
						lazy={true}
					/>
				{/key}
			</div>
		</div>

		<!-- Next Pokemon -->
		{#if nextPokemon}
			<a href={`/card/${nextPokemon.id}/`} class="next-pokemon-nav flex flex-col items-center w-48">
				<div class="nav-pokemon-wrapper relative">
					<div class="pokemon-sprite-container relative">
						<img
							src={sprites[nextPokemon.id]}
							alt={pascalCase(nextPokemon.name)}
							class="w-32 h-32 object-contain nav-pokemon-image silhouette"
							title={pascalCase(nextPokemon.name)}
							on:error={handleNextPokemonError}
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

	.interactive-card .image {
		/* Ensure image covers the card and respects 3D transform */
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover; /* Or contain, depending on desired behavior */
		position: absolute;
		top: 0;
		left: 0;
		backface-visibility: hidden; /* Prevent flickering during rotation */
	}

	.interactive-card.inactive {
		/* Smooth transition back to default when mouse leaves */
		transform: rotateX(0deg) rotateY(0deg);
		/* transition: transform 0.4s ease-out; */ /* Removed - Use base transition */
	}

	.card-face {
		/* Ensure the image inside respects the 3D space if needed, maybe add backface-visibility */
		/* backface-visibility: hidden; */
	}

	.pokedex-number-display {
		height: 2.5rem; /* Fixed height to prevent layout shift */
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.pokedex-number {
		background-color: rgba(0, 0, 0, 0.6);
		border: 1px solid var(--color-gold-400);
		box-shadow: 0 0 5px var(--color-gold-400);
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
