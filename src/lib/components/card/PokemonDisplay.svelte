<script lang="ts">
	import PokemonInfo from '@components/card/PokemonInfo.svelte';
	import EvolutionChain from '@components/card/EvolutionChain.svelte';
	import AllPokemonCards from '@components/card/AllPokemonCards.svelte';
	import {fade} from 'svelte/transition';
	import type {Card, FullCard, Pokemon} from '~/lib/types';
	import { spriteCache } from '$stores/spriteCache';
	import { pascalCase } from '$helpers/strings';
	import { getCardImageForPokemon } from '$helpers/card-images';
	import { ExternalLink } from 'lucide-svelte';

	export let pokemons: Pokemon[];
	export let cards: FullCard[];
	export let sprites: Record<number, string>;
	let card: FullCard = cards[0];

	// Helper function to safely get cardmarket URL
	function getCardmarketUrl(cardObj: FullCard): string | null {
		return cardObj && 'cardmarket' in cardObj && cardObj.cardmarket && 'url' in cardObj.cardmarket 
			? cardObj.cardmarket.url 
			: null;
	}

	$: allSets = cards.map(card => card.set);

	const pokemonName = card.pokemon.name;
	const types = [...new Set(cards.map(card => card.types.toLowerCase().split(',')[0]))];

	let centerCard: HTMLElement;
	let styleElement: HTMLStyleElement = null!;

	$: currentSet = allSets[0];
	$: currentType = card.types.toLowerCase().split(',')[0];
	$: card = cards.find(card => card.set_name === currentSet.name) ?? cards[0];
	$: cardmarketUrl = getCardmarketUrl(card);

	let cursorX = 0;
	let cursorY = 0;

	// Trouver le pokémon précédent dans le Pokédex
	$: previousPokemon = pokemons.find(p => p.id === card.pokemon.id - 1);

	// Trouver le pokémon suivant dans le Pokédex
	$: nextPokemon = pokemons.find(p => p.id === card.pokemon.id + 1);

	// Handle error for previous Pokemon image
	function handlePreviousPokemonError(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		if (!previousPokemon) return;
		img.src = getCardImageForPokemon(previousPokemon.id, cards);
		// Add a class to prevent infinite loop if both sprite and card image fail
		if (img.classList.contains('fallback-attempted')) {
			img.src = '/loading-spinner.svg';
			img.onerror = null; // Prevent further error handling
		} else {
			img.classList.add('fallback-attempted');
		}
	}

	// Handle error for next Pokemon image
	function handleNextPokemonError(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		if (!nextPokemon) return;
		img.src = getCardImageForPokemon(nextPokemon.id, cards);
		// Add a class to prevent infinite loop if both sprite and card image fail
		if (img.classList.contains('fallback-attempted')) {
			img.src = '/loading-spinner.svg';
			img.onerror = null; // Prevent further error handling
		} else {
			img.classList.add('fallback-attempted');
		}
	}

	// Préchargement des sprites manquants
	async function ensureSprite(pokemonId: number) {
		if (!sprites[pokemonId]) {
			try {
				sprites[pokemonId] = await spriteCache.getSprite(pokemonId);
			} catch (error) {
				console.error(`Failed to load sprite for Pokemon #${pokemonId}`);
				sprites[pokemonId] = getCardImageForPokemon(pokemonId, cards);
			}
		}
		return sprites[pokemonId];
	}

	// Préchargement des sprites pour les Pokémon adjacents
	$: if (previousPokemon && !sprites[previousPokemon.id]) {
		ensureSprite(previousPokemon.id);
	}

	$: if (nextPokemon && !sprites[nextPokemon.id]) {
		ensureSprite(nextPokemon.id);
	}

	$: if (cursorX && cursorY) {
		const rect = centerCard.getBoundingClientRect();
		const isInCard = cursorX >= rect.left && cursorX <= rect.right &&
			cursorY >= rect.top && cursorY <= rect.bottom;

		if (isInCard) {
			centerCard.classList.remove('inactive');

			const l = cursorX - rect.left;
			const t = cursorY - rect.top;
			const h = rect.height;
			const w = rect.width;
			const px = Math.abs(Math.floor(100 / w * l) - 100);
			const py = Math.abs(Math.floor(100 / h * t) - 100);
			const pa = (50 - px) + (50 - py);

			// Calculs pour les positions de gradient / arrière-plan
			const lp = 50 + (px - 50) / 1.5;
			const tp = 50 + (py - 50) / 1.5;
			const pxSpark = 50 + (px - 50) / 7;
			const pySpark = 50 + (py - 50) / 7;
			const pOpc = 20 + Math.abs(pa) * 1.5;
			const ty = ((tp - 50) / 2) * -1;
			const tx = ((lp - 50) / 1.5) * 0.5;

			const gradPos = `background-position: ${lp}% ${tp}%;`;
			const sparkPos = `background-position: ${pxSpark}% ${pySpark}%;`;
			const opc = `opacity: ${pOpc / 100};`;
			const tf = `transform: rotateX(${ty}deg) rotateY(${tx}deg);`;
			const style2 = `.holo:hover::before {${gradPos}}`;
			const style3 = `.holo:hover::after {${sparkPos} ${opc}}`;
			centerCard.setAttribute('style', tf);
			styleElement.innerHTML = `${style2} \n${style3}`;
		} else {
			if (!centerCard.classList.contains('inactive')) {
				centerCard.classList.add('inactive');
				centerCard.removeAttribute('style');
				centerCard.style.transform = `rotateY(0deg) rotateX(0deg)`;
				styleElement.innerHTML = '';
			}
		}
	}

	function handleCardSelect(selectedCard: FullCard) {
		const selectedSet = allSets.find(set => set.name === selectedCard.set_name);
		if (selectedSet) {
			currentSet = selectedSet;
		}
	}
</script>

<svelte:window on:mousemove={({clientX, clientY}) => {cursorX = clientX; cursorY = clientY;}}/>

<div class="h-[42rem] max-lg:h-[inherit] max-lg:flex max-lg:flex-col max-lg:gap-8 max-lg:flex-wrap max-lg:content-center">
	<!-- Evolution Chain Component -->
	<EvolutionChain {card} {pokemons} {cards} {sprites} />

	<!-- Pokédex number indicator -->
	<div class="pokedex-number-display text-center mb-2">
		<div class="pokedex-number text-gold-400 font-bold px-3 py-1 rounded-md inline-block">
			#{card.pokemon.id}
		</div>
	</div>

	<!-- Main card display with adjacent navigation -->
	<div class="card-navigation-container flex items-center justify-between w-full px-12 max-w-8xl mx-auto">
		<!-- Previous Pokemon -->
		{#if previousPokemon}
			<a href={`/card/${previousPokemon.id}/`} class="prev-pokemon-nav flex flex-col items-center w-48">
				<div class="nav-pokemon-wrapper relative">
					<div class="pokemon-sprite-container relative">
						<img
							src={sprites[previousPokemon.id] || getCardImageForPokemon(previousPokemon.id, cards)}
							alt={pascalCase(previousPokemon.name)}
							class="w-32 h-32 object-contain nav-pokemon-image silhouette"
							title={pascalCase(previousPokemon.name)}
							on:error={handlePreviousPokemonError}
							data-pokemon-id={previousPokemon.id}
						/>
					</div>
				</div>
				<span class="pokemon-name mt-3 text-base font-semibold text-center w-full px-2">
					<span class="text-gold-400 mr-1">&larr;</span> {pascalCase(previousPokemon.name)}
				</span>
				<div class="pokemon-number-indicator mt-1">
					#{previousPokemon.id}
				</div>
			</a>
		{:else}
			<div class="prev-pokemon-nav empty-space w-32 h-32 opacity-30 flex flex-col items-center justify-center">
				<div class="empty-pokemon-label text-gold-400 font-bold text-lg">
					Début du Pokédex
				</div>
			</div>
		{/if}

		<!-- Center card -->
		<div class="card-container h-full w-fit flex flex-col gap-4 items-center">
			<div
				bind:this={centerCard}
				class="center-card h-[34rem] {currentType} {card.rarity.toLowerCase()}"
				id="center-card"
			>
				<div class="card-aura {currentType}" id="card-aura"></div>
				<div class="relative h-[34rem] w-[24rem] -z-10 max-lg:w-[75vw] max-lg:h-[112.5vw]">
					{#each cards as c}
						{#if currentSet === c.set}
							<img
								alt={c.pokemon.name}
								class="image"
								decoding="async"
								draggable="false"
								loading="eager"
								height="420"
								src={c.image}
								width="300"
								transition:fade
							/>
						{/if}
					{/each}
				</div>
			</div>
		</div>

		<!-- Next Pokemon -->
		{#if nextPokemon}
			<a href={`/card/${nextPokemon.id}/`} class="next-pokemon-nav flex flex-col items-center w-48">
				<div class="nav-pokemon-wrapper relative">
					<div class="pokemon-sprite-container relative">
						<img
							src={sprites[nextPokemon.id] || getCardImageForPokemon(nextPokemon.id, cards)}
							alt={pascalCase(nextPokemon.name)}
							class="w-32 h-32 object-contain nav-pokemon-image silhouette"
							title={pascalCase(nextPokemon.name)}
							on:error={handleNextPokemonError}
							data-pokemon-id={nextPokemon.id}
						/>
					</div>
				</div>
				<span class="pokemon-name mt-3 text-base font-semibold text-center w-full px-2">
					{pascalCase(nextPokemon.name)} <span class="text-gold-400 ml-1">&rarr;</span>
				</span>
				<div class="pokemon-number-indicator mt-1">
					#{nextPokemon.id}
				</div>
			</a>
		{:else}
			<div class="next-pokemon-nav empty-space w-32 h-32 opacity-30 flex flex-col items-center justify-center">
				<div class="empty-pokemon-label text-gold-400 font-bold text-lg">
					Fin du Pokédex
				</div>
			</div>
		{/if}
	</div>
</div>

<svelte:head>
	<style bind:this={styleElement} id="card"></style>
</svelte:head>

<div class="filter {currentType}" id="filter" transition:fade></div>

<PokemonInfo {card} />

<!-- Add the new AllPokemonCards component -->
<AllPokemonCards
	cards={cards}
	currentPokemonId={card.pokemon.id}
	onCardSelect={handleCardSelect}
/>

<style>
	img {
		user-select: none;
	}

	.inactive {
		transition: all 3s cubic-bezier(0.22, 1, 0.36, 1) !important;
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

	.center-card {
		position: relative;
		transform-style: preserve-3d;
	}

	.center-card:hover {
		border-radius: 0.5rem !important;
		box-shadow: 0 0 30px -5px #ffffff70, 0 0 10px -2px #ffffff9e, 0 50px 20px 10px rgb(0, 0, 0);
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

	.image {
		border-radius: 0.5rem;
		height: 34rem;
		position: absolute;
		width: 24rem;
		z-index: 10;
	}

	.pokedex-number-display {
		margin-top: 0.5rem;
		margin-bottom: 1rem;
	}

	.pokedex-number {
		background-color: rgba(0, 0, 0, 0.5);
		border: 1px solid #f3d02c;
		font-size: 1.25rem;
	}

	.pokemon-number-indicator {
		text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
		background-color: rgba(0, 0, 0, 0.7);
		padding: 0.2rem 0.5rem;
		border-radius: 0.75rem;
		border: 1px solid #f3d02c;
		box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
		font-weight: bold;
		font-size: 0.8rem;
		color: #f3d02c;
		display: inline-block;
	}

	.nav-pokemon-wrapper {
		padding: 0.5rem;
		border-radius: 50%;
		background-color: rgba(0, 0, 0, 0.7);
		transition: transform 0.3s ease-in-out;
		position: relative;
		overflow: hidden;
		width: 9rem;
		height: 9rem;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	}

	.nav-pokemon-wrapper::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: radial-gradient(circle at center,
			rgba(40, 40, 40, 0.3) 5%,
			rgba(20, 20, 20, 0.5) 35%,
			rgba(0, 0, 0, 0.7) 70%);
		opacity: 1;
		z-index: 1;
		border-radius: 50%;
		transition: background 0.3s ease-in-out;
	}

	.nav-pokemon-wrapper:hover {
		transform: scale(1.05);
	}

	.nav-pokemon-wrapper::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: radial-gradient(circle, rgba(243, 208, 44, 0.3) 0%, rgba(0, 0, 0, 0) 70%);
		opacity: 0;
		transition: opacity 0.3s ease-in-out;
		z-index: 2;
		border-radius: 50%;
	}

	.nav-pokemon-wrapper:hover::after {
		opacity: 1;
	}

	.pokemon-sprite-container {
		position: relative;
		overflow: hidden;
		border-radius: 50%;
		width: 8rem;
		height: 8rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.3s ease-in-out;
		background: radial-gradient(circle at center, rgba(140, 140, 140, 0.25) 0%, rgba(70, 70, 70, 0.1) 50%, rgba(0, 0, 0, 0) 80%);
	}

	.pokemon-sprite-container::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, rgba(200, 200, 200, 0.1) 40%, transparent 75%);
		z-index: 2;
		opacity: 0.7;
	}

	.nav-pokemon-image {
		background-color: transparent;
		border-radius: 50%;
		transition: all 0.3s ease-in-out;
		position: relative;
		z-index: 2;
	}

	/* Silhouette effect */
	.silhouette {
		filter: brightness(0) contrast(0.85) drop-shadow(0 0 3px rgba(255, 255, 255, 0.9));
		transition: all 0.3s ease-in-out;
		position: relative;
		z-index: 3;
		opacity: 0.95;
	}

	.nav-pokemon-wrapper:hover .silhouette {
		filter: brightness(1) contrast(1) drop-shadow(0 0 3px rgba(255, 255, 255, 0.9));
		opacity: 1;
	}

	.pokemon-name {
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		letter-spacing: 0.02em;
	}

	.empty-pokemon-label {
		text-shadow: 0 0 8px rgba(0, 0, 0, 0.9);
		padding: 0.5rem;
		text-align: center;
		border-radius: 0.5rem;
		background-color: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(243, 208, 44, 0.3);
	}

	.empty-space {
		border-radius: 50%;
		background-color: rgba(0, 0, 0, 0.4);
		box-shadow: inset 0 0 15px rgba(243, 208, 44, 0.2);
	}

	:global(.card-type) {
		background-color: color-mix(in oklab, var(--type-color), white 50%);
		border: 1px solid var(--type-color);
		border-radius: 1rem;
		color: color-mix(in oklab, var(--type-color), black 25%);
		margin: 0;
		padding: 0.15rem 0.8rem;
	}

	:global(.holo::after) {
		background-image: url("https://assets.codepen.io/13471/sparkles.gif"), url(https://assets.codepen.io/13471/holo.png), linear-gradient(125deg, #ff008450 15%, #fca40040 30%, #ffff0030 40%, #00ff8a20 60%, #00cfff40 70%, #cc4cfa50 85%);
		background-position: 50% 50%;
		background-size: 160%;
		border-radius: 2.5rem !important;
		filter: brightness(1) contrast(1);
		mix-blend-mode: color-dodge;
		opacity: 70%;
		transition: all 0.33s ease;
		z-index: 2;
	}

	:global(.holo::before),
	:global(.holo::after) {
		background-repeat: no-repeat;
		border-radius: 0.5rem !important;
		content: "";
		height: 34rem;
		left: 50%;
		mix-blend-mode: color-dodge;
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		transition: all 0.33s ease;
		width: 24rem;
	}

	:global(.holo.active:after),
	:global(.holo:hover:after) {
		border-radius: 0.5rem !important;
		filter: brightness(1) contrast(1);
		opacity: 1;
	}

	:global(.holo.active),
	:global(.holo:hover) {
		animation: none;
		border-radius: 0.5rem !important;
		transition: box-shadow 0.1s ease-out;
	}

	:global(.holo:hover::before) {
		animation: none;
		background-image: linear-gradient(110deg, transparent 25%, var(--type-color) 48%, var(--type-color2) 52%, transparent 75%);
		background-position: 50% 50%;
		background-size: 250% 250%;
		border-radius: 0.5rem !important;
		filter: brightness(0.66) contrast(1.33);
		opacity: 0.88;
		transition: none;
	}

	@media (max-width: 1200px) {
		.card-navigation-container {
			padding: 0 1rem;
		}
	}

	@media (max-width: 768px) {
		.card-container {
			margin: 1.5rem auto;
		}

		.card-navigation-container {
			flex-direction: column;
			padding: 0;
			margin-top: 2rem;
		}

		.prev-pokemon-nav, .next-pokemon-nav {
			margin: 1.5rem 0;
		}

		.prev-pokemon-nav {
			order: 1;
			align-self: flex-start;
			margin-left: 1.5rem;
		}

		.next-pokemon-nav {
			order: 2;
			align-self: flex-end;
			margin-right: 1.5rem;
		}

		.card-container {
			order: 0;
		}

		#card-aura {
			height: 50vh;
			top: 35%;
			width: 80vw;
		}

		.images, .image {
			height: 112.5vw;
			width: 75vw;
		}

		.nav-pokemon-wrapper {
			width: 6rem;
			height: 6rem;
			margin-top: 1rem;
		}

		.pokemon-sprite-container {
			width: 5rem;
			height: 5rem;
		}

		.nav-pokemon-image {
			width: 4.5rem;
			height: 4.5rem;
		}

		.pokemon-number-indicator {
			font-size: 0.7rem;
			padding: 0.15rem 0.4rem;
		}

		.pokemon-name {
			font-size: 0.9rem;
			margin-top: 0.5rem;
		}

		.pokemon-title {
			font-size: 1.75rem;
			margin-top: 0.25rem;
		}

		:global(.center-card + div > h2) {
			margin-top: 1rem;
			font-size: 1.75rem;
		}
	}

	.pokemon-title-container {
		display: none;
	}

	.pokemon-title {
		color: white;
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8), 0 0 4px rgba(0, 0, 0, 0.5);
		margin-bottom: 1rem;
	}

	/* Styles pour le titre du Pokémon sur la page */
	:global(.center-card + div > h2) {
		position: relative;
		z-index: 5;
		margin-top: 2rem;
		color: white;
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8), 0 0 4px rgba(0, 0, 0, 0.5);
		font-size: 2.5rem;
		font-weight: bold;
		text-align: center;
	}
</style>
