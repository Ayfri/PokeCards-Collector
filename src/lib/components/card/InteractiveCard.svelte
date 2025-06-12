<script lang="ts">
	import CardImage from '@components/card/CardImage.svelte';
	import type { FullCard, Pokemon, Set } from '$lib/types';
	import { pascalCase } from '$helpers/strings';

	// --- Props ---
	export let card: FullCard | undefined;
	export let currentSet: Set | undefined;
	export let currentType: string;
	export let handlePokemonImageError: (event: Event) => void; // Pass through if CardImage needs it
	export let pokemon: Pokemon | undefined; // For alt text and class logic

	// --- Internal State ---
	let centerCard: HTMLElement;
	let maxRotate = 25; // Max rotation in degrees

	// --- Functions ---
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
		throttledUpdateCardStyle(clientX, clientY);
	}
</script>

<svelte:window on:mousemove={handleMouseMove}/>

<div
	class="w-[21rem] h-[29rem] sm:w-[20rem] sm:h-[28rem] lg:w-[23rem] lg:h-[32rem] max-w-full mx-auto rounded-xl shadow-lg card-face interactive-card {pokemon ? '' : 'non-pokemon'}"
	bind:this={centerCard}
	data-card-id={currentSet?.name}
	data-card-type={currentType}
>
	{#key card?.image}
		{#if card?.image}
			<CardImage
				alt={pokemon ? pascalCase(pokemon.name) : card?.name || 'Card image'}
				imageUrl={card?.image}
				lowRes={false}
				height={544}
				width={384}
				class="image rounded-xl"
				lazy={false}
				on:error={handlePokemonImageError}
			/>
		{:else}
			<div class="w-full h-full flex items-center justify-center">
				<div class="text-gray-400 text-sm">No image available</div>
			</div>
		{/if}
	{/key}
</div>

<style>
	.interactive-card {
		transform-style: preserve-3d;
		transition: transform 0.05s linear, filter 0.3s ease;
		transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
	}
</style>
