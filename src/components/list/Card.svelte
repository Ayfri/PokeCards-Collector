<script lang="ts">
	import {fade} from 'svelte/transition';
	import type {Card} from '~/types.js';
	import { getCardImage } from '~/helpers/card-images.ts';
	import { onMount, onDestroy } from 'svelte';

	export let card: Card;

	const {
		image,
		pokemon,
		price,
		rarity,
		types,
		set
	} = card;

	const cardImage = getCardImage(image);
	const lowResolutionImage = cardImage.replace("_hires", "");
	// Get set code from set object or image name
	const setCode = set.ptcgoCode || image.split('/').at(-2);
	// Get card code from image name, remove all non-numeric characters
	const cardCode = image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1');

	const {name} = pokemon;
	let loaded = false;
	let displayImageUrl: string | null = null;
	let loading: boolean = true;
	let error: boolean = false;
	let controller: AbortController | null = null;

	onMount(() => {
		loading = true;
		error = false;
		displayImageUrl = null;
		controller = new AbortController();
		const signal = controller.signal;

		const imageUrl = getCardImage(card.image);

		fetch(imageUrl, { signal })
			.then(response => {
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				return response.blob();
			})
			.then(blob => {
				if (!signal.aborted) {
					displayImageUrl = URL.createObjectURL(blob);
					loading = false;
				}
			})
			.catch(err => {
				if (err.name === 'AbortError') {
					// console.log('Fetch aborted for:', card.name, card.numero);
				} else {
					console.error('Failed to load image:', err);
					error = true;
					loading = false;
				}
			});

		return () => {
			if (controller) {
				controller.abort();
			}
			if (displayImageUrl && displayImageUrl.startsWith('blob:')) {
				URL.revokeObjectURL(displayImageUrl);
			}
		};
	});

	onDestroy(() => {
		if (controller) {
			controller.abort();
		}
		if (displayImageUrl && displayImageUrl.startsWith('blob:')) {
			URL.revokeObjectURL(displayImageUrl);
		}
	});
</script>

<a
	aria-label={`Go to the card page of ${name}`}
	class="card-link text-white"
	draggable="false"
	href={`/card/${pokemon.id}/`}
	rel="dofollow"
>
	<div class="card-pokestore group relative flex flex-col items-center w-fit cursor-pointer transition-transform duration-500 ease-out hover:scale-[1.025]">
		<div class:list={rarity.toLowerCase()}></div>
		<div
			class={`aura h-[26rem] max-2xs:h-[22rem] w-[20rem] max-2xs:w-[16rem] absolute blur-[1.5rem] rounded-[15rem] -z-10 bg-[var(--type-color)]
			transition-all duration-700 ease-out group-hover:blur-[2.5rem] ${types.toLowerCase().split(',')}`}
		></div>
		<div class="relative h-[420px] max-2xs:h-[342px] w-[300px] max-2xs:w-[245px]">
			{#if loading}
				<div class="loader absolute top-0 left-0 h-[420px] max-2xs:h-[342px] w-[300px] max-2xs:w-[245px]" style={`--card-color: #${card.meanColor};`} transition:fade></div>
			{:else if error}
				<div class="absolute inset-0 flex items-center justify-center bg-red-900 rounded-lg h-[420px] max-2xs:h-[342px] w-[300px] max-2xs:w-[245px]">
					<span class="text-white">Error</span>
				</div>
			{:else if displayImageUrl}
				<img
					alt={name.charAt(0).toUpperCase() + name.slice(1)}
					class="rounded-lg h-[420px] max-2xs:h-[342px] w-[300px] max-2xs:w-[245px] transition-opacity duration-300 absolute top-0 left-0"
					class:opacity-0={!loaded}
					decoding="async"
					draggable="false"
					height="420"
					loading="lazy"
					on:load={() => loaded = true}
					sizes="(max-width: 245px) 245px, 300px"
					src={displayImageUrl}
					srcset="{lowResolutionImage} 245px, {cardImage} 300px"
					width="300"
				/>
			{/if}
		</div>
		<h2 class="text-center font-bold text-[1.3rem]">
			{name.charAt(0).toUpperCase() + name.slice(1)}
			<span class="uppercase">
				{#if setCode}
					{setCode}
				{/if}
				#{cardCode}/{set.printedTotal}
			</span>
		</h2>
		<h3 class="text-center">{price && price !== 100_000 ? `${price} $` : 'Priceless'}</h3>
	</div>
</a>

<style>
	.holo::after {
		background-image: url("https://assets.codepen.io/13471/sparkles.gif"), url(https://assets.codepen.io/13471/holo.png), linear-gradient(125deg, #ff008450 15%, #fca40040 30%, #ffff0030 40%, #00ff8a20 60%, #00cfff40 70%, #cc4cfa50 85%);
		background-position: 50% 50%;
		background-size: 160%;
		filter: brightness(1) contrast(1);
		mix-blend-mode: color-dodge;
		opacity: 70%;
		transition: all 0.33s ease;
		z-index: 2;
	}

	.holo::before,
	.holo::after {
		background-repeat: no-repeat;
		content: "";
		height: 420px;
		left: 50%;
		mix-blend-mode: color-dodge;
		position: absolute;
		top: 43%;
		transform: translate(-50%, -50%);
		transition: all 0.33s ease;
		width: 300px;
	}

	@-webkit-keyframes holoSparkle {
		0%, 100% {
			opacity: 0.75;
			background-position: 50% 50%;
			filter: brightness(1.2) contrast(1.25);
		}
		5%, 8% {
			opacity: 1;
			background-position: 40% 40%;
			filter: brightness(0.8) contrast(1.2);
		}
		13%, 16% {
			opacity: 0.5;
			background-position: 50% 50%;
			filter: brightness(1.2) contrast(0.8);
		}
		35%, 38% {
			opacity: 1;
			background-position: 60% 60%;
			filter: brightness(1) contrast(1);
		}
		55% {
			opacity: 0.33;
			background-position: 45% 45%;
			filter: brightness(1.2) contrast(1.25);
		}
	}

	@keyframes holoSparkle {
		0%, 100% {
			opacity: 0.75;
			background-position: 50% 50%;
			filter: brightness(1.2) contrast(1.25);
		}
		5%, 8% {
			opacity: 1;
			background-position: 40% 40%;
			filter: brightness(0.8) contrast(1.2);
		}
		13%, 16% {
			opacity: 0.5;
			background-position: 50% 50%;
			filter: brightness(1.2) contrast(0.8);
		}
		35%, 38% {
			opacity: 1;
			background-position: 60% 60%;
			filter: brightness(1) contrast(1);
		}
		55% {
			opacity: 0.33;
			background-position: 45% 45%;
			filter: brightness(1.2) contrast(1.25);
		}
	}

	@-webkit-keyframes holoGradient {
		0%, 100% {
			opacity: 0.5;
			background-position: 50% 50%;
			filter: brightness(0.5) contrast(1);
		}
		5%, 9% {
			background-position: 100% 100%;
			opacity: 1;
			filter: brightness(0.75) contrast(1.25);
		}
		13%, 17% {
			background-position: 0 0;
			opacity: 0.88;
		}
		35%, 39% {
			background-position: 100% 100%;
			opacity: 1;
			filter: brightness(0.5) contrast(1);
		}
		55% {
			background-position: 0 0;
			opacity: 1;
			filter: brightness(0.75) contrast(1.25);
		}
	}

	@keyframes holoGradient {
		0%, 100% {
			opacity: 0.5;
			background-position: 50% 50%;
			filter: brightness(0.5) contrast(1);
		}
		5%, 9% {
			background-position: 100% 100%;
			opacity: 1;
			filter: brightness(0.75) contrast(1.25);
		}
		13%, 17% {
			background-position: 0 0;
			opacity: 0.88;
		}
		35%, 39% {
			background-position: 100% 100%;
			opacity: 1;
			filter: brightness(0.5) contrast(1);
		}
		55% {
			background-position: 0 0;
			opacity: 1;
			filter: brightness(0.75) contrast(1.25);
		}
	}

	@-webkit-keyframes holoCard {
		0%, 100% {
			transform: rotateZ(0deg) rotateX(0deg) rotateY(0deg);
		}
		5%, 8% {
			transform: rotateZ(0deg) rotateX(6deg) rotateY(-20deg);
		}
		13%, 16% {
			transform: rotateZ(0deg) rotateX(-9deg) rotateY(32deg);
		}
		35%, 38% {
			transform: rotateZ(3deg) rotateX(12deg) rotateY(20deg);
		}
		55% {
			transform: rotateZ(-3deg) rotateX(-12deg) rotateY(-27deg);
		}
	}

	@keyframes holoCard {
		0%, 100% {
			transform: rotateZ(0deg) rotateX(0deg) rotateY(0deg);
		}
		5%, 8% {
			transform: rotateZ(0deg) rotateX(6deg) rotateY(-20deg);
		}
		13%, 16% {
			transform: rotateZ(0deg) rotateX(-9deg) rotateY(32deg);
		}
		35%, 38% {
			transform: rotateZ(3deg) rotateX(12deg) rotateY(20deg);
		}
		55% {
			transform: rotateZ(-3deg) rotateX(-12deg) rotateY(-27deg);
		}
	}

	@-webkit-keyframes rubberBand {
		from {
			transform: scale3d(1, 1, 1);
		}
		30% {
			transform: scale3d(1.25, 0.75, 1);
		}
		40% {
			transform: scale3d(0.75, 1.25, 1);
		}
		50% {
			transform: scale3d(1.15, 0.85, 1);
		}
		65% {
			transform: scale3d(0.95, 1.05, 1);
		}
		75% {
			transform: scale3d(1.05, 0.95, 1);
		}
		to {
			transform: scale3d(1, 1, 1);
		}
	}

	@keyframes rubberBand {
		from {
			transform: scale3d(1, 1, 1);
		}
		30% {
			transform: scale3d(1.25, 0.75, 1);
		}
		40% {
			transform: scale3d(0.75, 1.25, 1);
		}
		50% {
			transform: scale3d(1.15, 0.85, 1);
		}
		65% {
			transform: scale3d(0.95, 1.05, 1);
		}
		75% {
			transform: scale3d(1.05, 0.95, 1);
		}
		to {
			transform: scale3d(1, 1, 1);
		}
	}

	.loader {
		animation-duration: 4s;
		animation-fill-mode: forwards;
		animation-iteration-count: infinite;
		animation-name: placeHolderShimmer;
		animation-timing-function: linear;
		background: linear-gradient(to right, var(--card-color) 8%, color-mix(in oklab, var(--card-color), white 30%) 38%, var(--card-color) 54%);
		background-size: auto;
		border-radius: 0.5rem;
		z-index: -1;
	}

	@keyframes placeHolderShimmer {
		0% {
			background-position: -468px 0
		}
		100% {
			background-position: 468px 0
		}
	}
</style>
