<script lang="ts">
	import CardImage from '@components/card/CardImage.svelte';
	import MissingCardArt from '@components/card/MissingCardArt.svelte';
	import type { FullCard, Pokemon, Set } from '$lib/types';
	import { pascalCase } from '$helpers/strings';
	import { throttle } from '$helpers/throttle';

	
	interface Props {
		card: FullCard | undefined;
		currentSet: Set | undefined;
		currentType: string;
		handlePokemonImageError: (event: Event) => void;
		pokemon: Pokemon | undefined;
	}

	let {
		card,
		currentSet,
		currentType,
		handlePokemonImageError,
		pokemon
	}: Props = $props();

	let centerCard = $state<HTMLElement>();
	const maxRotate = 25;

	/** The tilt follows the pointer, so it is capped to one update per frame. */
	const throttledUpdateCardStyle = throttle((clientX: number, clientY: number) => {
		if (!centerCard) return;
		const rect = centerCard.getBoundingClientRect();

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

<svelte:window onmousemove={handleMouseMove}/>

<div
	class="w-84 h-116 sm:w-[20rem] sm:h-112 lg:w-92 lg:h-128 max-w-full mx-auto rounded-xl shadow-lg card-face interactive-card {pokemon ? '' : 'non-pokemon'}"
	bind:this={centerCard}
	data-card-id={currentSet?.name}
	data-card-type={currentType}
>
	{#key card?.image}
		{#if card?.image}
			<CardImage
				alt={pokemon ? pascalCase(pokemon.name) : card?.name || 'Card image'}
				imageUrl={card?.image}
				types={card?.types}
				lowRes={false}
				height={544}
				width={384}
				class="image rounded-xl"
				lazy={false}
				onerror={handlePokemonImageError}
			/>
		{:else if card}
			<MissingCardArt {card} />
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
