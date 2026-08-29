<script lang="ts">
	import ImageOff from '@lucide/svelte/icons/image-off';
	import type {FullCard} from '$lib/types';
	import {cardTypeTint} from '$helpers/card-images';
	import {parseCardCode} from '$helpers/card-utils';
	import {NO_IMAGES} from '$lib/images';
	import {getPokemonImageSrc} from '$helpers/pokemon-utils';

	interface Props {
		/** The card TCGdex has no scan for. */
		card: FullCard;
	}

	let {card}: Props = $props();

	const tintStyle = $derived(cardTypeTint(card.types));
	const types = $derived((card.types ?? '').split(',').map(type => type.trim()).filter(Boolean));
	const cardNumber = $derived(card.localId ?? parseCardCode(card.cardCode).cardNumber);
	/** PokéAPI ships an artwork for every species, so a Pokemon card with no scan still shows what it depicts. */
	const artworkUrl = $derived(!NO_IMAGES && card.pokemonNumber
		? getPokemonImageSrc(card.pokemonNumber)
		: '');

	let artworkFailed = $state(false);
</script>

<div class="missing-art flex flex-col justify-between size-full rounded-xl p-5 text-white select-none" style={tintStyle}>
	<header class="flex items-start justify-between gap-3">
		<h2 class="text-xl font-bold leading-tight text-balance">{card.name}</h2>
		{#if card.hp}
			<span class="shrink-0 text-lg font-bold text-gold-400">{card.hp} HP</span>
		{/if}
	</header>

	<div class="relative flex grow items-center justify-center">
		{#if artworkUrl && !artworkFailed}
			<img
				alt={card.name}
				class="max-h-full max-w-[70%] object-contain opacity-60 drop-shadow-[0_0_1.5rem_rgba(0,0,0,0.55)]"
				draggable="false"
				loading="lazy"
				onerror={() => (artworkFailed = true)}
				src={artworkUrl}
			/>
		{:else}
			<ImageOff class="opacity-30" size={64} />
		{/if}
	</div>

	<footer class="flex flex-col gap-2 text-sm">
		{#if types.length}
			<div class="flex flex-wrap gap-1.5">
				{#each types as type (type)}
					<span class="rounded-full border border-white/25 bg-black/30 px-2 py-0.5 text-xs uppercase tracking-wide">{type}</span>
				{/each}
			</div>
		{/if}
		<div class="flex items-baseline justify-between gap-3 text-white/70">
			<span class="truncate">{card.setName}</span>
			<span class="shrink-0">{cardNumber ? `#${cardNumber}` : ''}</span>
		</div>
		{#if card.rarity}
			<span class="text-xs text-white/50">{card.rarity}</span>
		{/if}
		<span class="mt-1 text-center text-xs uppercase tracking-widest text-white/40">No artwork available</span>
	</footer>
</div>

<style>
	/* Same plate as the grid tiles: the card's energy colors mixed into gray, since no scan will ever replace it. */
	.missing-art {
		--tint-a: #5a5a5a;
		--tint-b: #2f2f2f;
		background-color: color-mix(in oklab, var(--tint-a) 18%, #191919);
		background-image:
			radial-gradient(120% 90% at 20% 0%, color-mix(in oklab, var(--tint-a) 45%, transparent) 0%, transparent 60%),
			radial-gradient(120% 90% at 85% 100%, color-mix(in oklab, var(--tint-b) 55%, transparent) 0%, transparent 65%);
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--tint-a) 40%, transparent);
	}
</style>
