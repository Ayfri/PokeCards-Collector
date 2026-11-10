<script lang="ts">
	import CardImage from '#components/card/CardImage.svelte';
	import type { CardPageSet, FullCard, Pokemon } from '#lib/types.js';
	import { titleCase } from '#helpers/format.ts';
	import { throttle } from '#helpers/utils.ts';

	
	interface Props {
		card: FullCard | undefined;
		currentSet: CardPageSet | undefined;
		pokemon: Pokemon | undefined;
	}

	let {
		card,
		currentSet,
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
			const l = clientX - rect.left;
			const t = clientY - rect.top;
			const h = rect.height;
			const w = rect.width;
			const rotateY = ((l / w) * 2 - 1) * maxRotate;
			const rotateX = (1 - (t / h) * 2) * maxRotate;
			centerCard.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
			centerCard.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
		} else {
			centerCard.style.removeProperty('--rx');
			centerCard.style.removeProperty('--ry');
		}
	}, 16);
</script>

<svelte:window onmousemove={event => throttledUpdateCardStyle(event.clientX, event.clientY)} />

<div
	bind:this={centerCard}
	class="w-84 h-116 sm:w-[20rem] sm:h-112 lg:w-92 lg:h-128 max-w-full mx-auto rounded-xl shadow-lg interactive-card"
	data-card-hero={card?.cardCode}
>
	{#key card?.image}
		{#if card}
			<CardImage
				alt="{pokemon ? titleCase(pokemon.name) : card.name} - {card.setName}"
				{card}
				class="image size-full rounded-xl"
				imageUrl={card.image}
				lazy={false}
				lowRes={false}
				set={currentSet}
				sizes="384px"
			/>
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
