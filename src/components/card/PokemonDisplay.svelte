<script lang="ts">
	import PokemonInfo from '@components/card/PokemonInfo.svelte';
	import EvolutionChain from '@components/card/EvolutionChain.svelte';
	import {fade} from 'svelte/transition';
	import type {Card, Pokemon} from '~/types.js';

	export let pokemons: Pokemon[];
	export let cards: Card[];
	export let sprites: Record<number, string>;
	let card: Card = cards[0];

	const setLogoFirstHalf = cards.slice(0, 5).map(card => card.set);
	const setLogoSecondHalf = cards.slice(5, 10).map(card => card.set);
	const pokemonName = card.pokemon.name;
	const types = [...new Set(cards.map(card => card.types.toLowerCase().split(',')[0]))];

	let centerCard: HTMLElement;
	let styleElement: HTMLStyleElement = null!;

	$: currentSet = setLogoFirstHalf[0];
	$: currentType = card.types.toLowerCase().split(',')[0];
	$: card = cards.find(card => card.set_name === currentSet.name) ?? cards[0];

	let cursorX = 0;
	let cursorY = 0;

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
</script>

<svelte:window on:mousemove={({clientX, clientY}) => {cursorX = clientX; cursorY = clientY;}}/>

<div class="h-[42rem] max-lg:h-[inherit] max-lg:flex max-lg:flex-col max-lg:gap-8 max-lg:flex-wrap max-lg:content-center">
	<!-- Evolution Chain Component -->
	<EvolutionChain {card} {pokemons} {cards} {sprites} />

	<div class="card-container h-full w-fit m-auto flex gap-12 max-lg:gap-3 max-lg:grid max-lg:place-items-center">
		<div class="left-sets">
			{#each setLogoFirstHalf as set}
				<button
					on:click={() => currentSet = set}
				>
					<img
						alt={set.name}
						class="set object-contain h-24 w-32"
						class:shadow={currentSet === set}
						draggable="false"
						height="105"
						src={set.logo}
						title="Click to see card in {set.name} set"
						width="75"
					/>
				</button>
			{/each}
		</div>
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
							hidden={c.pokemon.name !== pokemonName}
							draggable="false"
							loading={c.pokemon.name === pokemonName ? 'eager' : 'lazy'}
							height="420"
							src={c.image}
							width="300"
							transition:fade
						/>
					{/if}
				{/each}
			</div>
		</div>
		<div class="right-sets" class:empty={setLogoSecondHalf.length === 0}>
			{#each setLogoSecondHalf as set}
				<button
					on:click={() => currentSet = set}
				>
					<img
						alt={set.name}
						class="set object-contain h-24 w-32"
						class:shadow={currentSet === set}
						draggable="false"
						height="105"
						src={set.logo}
						title="Click to see card in {set.name} set"
						width="75"
					/>
				</button>
			{/each}
		</div>
	</div>
</div>

<svelte:head>
	<style bind:this={styleElement} id="card"></style>
</svelte:head>

{#each types as type}
	{#if currentType === type}
		<div class="filter {type}" id="filter" transition:fade></div>
	{/if}
{/each}

<PokemonInfo {card} />

<style lang="postcss">
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

	.shadow {
		filter: drop-shadow(0px 0px 8px rgb(243, 208, 44)) drop-shadow(3px 3px 4px #000);
		transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.set {
		transition: all .5s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.set:hover {
		cursor: pointer;
		transform: scale(1.05);
	}

	.left-sets, .right-sets {
		align-items: center;
		background-color: rgba(35, 35, 35, 0.75);
		border-color: #f3d02c;
		border-radius: 1rem;
		border-style: solid;
		border-width: 6px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		height: 34rem;
		justify-content: space-evenly;
		padding: 1rem;
		width: 11rem;
		z-index: 1;
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

	@media (max-width: 768px) {
		.card-container {
			grid-template-areas:
					'center'
					'left'
					'right';
		}

		#center-card {
			grid-area: center;
			margin-bottom: 0.75rem;
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

		.left-sets, .right-sets {
			flex-direction: row;
			height: 5rem;
			padding: 0.33rem;
			width: 90vw;
		}

		.left-sets {
			grid-area: left;
		}

		.right-sets {
			grid-area: right;
		}

		.right-sets.empty {
			display: none;
		}

		.left-sets img, .right-sets img {
			aspect-ratio: 1;
			max-height: 4rem;
			width: unset;
		}
	}
</style>
