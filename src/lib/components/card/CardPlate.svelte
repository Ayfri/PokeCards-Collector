<script lang="ts">
	import { cardTypeTint } from '$helpers/card-images';
	import { getPokemonImageSrc } from '$helpers/pokemon-utils';
	import { NO_IMAGES } from '$lib/images';
	import type { FullCard } from '$lib/types';
	import ImageOff from '@lucide/svelte/icons/image-off';

	interface Props {
		/** Accessible name of the plate. */
		alt: string;
		/** The card the plate stands for: fills the name, HP, types, set, number and rarity when given. */
		card?: FullCard | undefined;
		class?: string;
		style?: string;
		/** Comma-separated energy types, used when no `card` is given. */
		types?: string | undefined;
	}

	let { alt, card = undefined, class: classNames = '', style = '', types = undefined }: Props = $props();

	const cardTypes = $derived(card?.types ?? types);
	/** 70% of the japanese cards carry no art, so the plate borrows the card's energy colors and mixes them into the gray. */
	const tintStyle = $derived(cardTypeTint(cardTypes));
	const typeNames = $derived((cardTypes ?? '').split(',').map(type => type.trim()).filter(Boolean));
	/** PokéAPI ships an artwork for every species, so a Pokémon card with no scan still shows what it depicts. */
	const artUrl = $derived(!NO_IMAGES && card?.pokemonNumber ? getPokemonImageSrc(card.pokemonNumber) : '');
	/** Keyed on the URL rather than a boolean, so a recycled tile showing another Pokémon retries its artwork. */
	let failedArt = $state<string>();
	const subtitle = $derived([card?.stage ?? card?.supertype, card?.rarity !== 'None' && card?.rarity].filter(Boolean).join(' · '));
</script>

<!-- Everything scales with the tile through `cqw`, and the `@max-*` variants drop details once they would shrink below reading size.
     The bottom padding leaves room for the set badge and collection controls grids lay over the tile. -->
<div aria-label={alt} class="card-plate @container overflow-hidden text-white select-none {classNames}" role="img" style="{style}; {tintStyle}">
	<div class="card-plate-body flex h-full flex-col gap-[3.5cqw] p-[6cqw] pb-[16cqw] @max-[200px]:pb-[22cqw] @max-[120px]:justify-center @max-[120px]:pb-[6cqw]">
		{#if card}
			<header class="flex items-start justify-between gap-[3cqw] @max-[120px]:hidden">
				<div class="flex min-w-0 flex-col">
					<span class="line-clamp-2 text-[7cqw] leading-tight font-bold @max-[200px]:text-[9cqw]">{card.name}</span>
					{#if subtitle}
						<span class="truncate text-[4cqw] text-white/55 @max-[200px]:hidden">{subtitle}</span>
					{/if}
				</div>
				{#if card.hp}
					<span class="shrink-0 text-[7cqw] leading-tight font-extrabold text-gold-400 @max-[200px]:text-[9cqw]">
						{card.hp}<small class="ml-[0.15em] text-[0.6em]">HP</small>
					</span>
				{/if}
			</header>
		{/if}

		<!-- The art window of a real card: a recessed frame holding the Pokémon's artwork, or an icon when there is none. -->
		<div class="card-plate-window relative flex min-h-0 flex-1 items-center justify-center rounded-[3cqw] @max-[120px]:flex-none">
			{#if artUrl && artUrl !== failedArt}
				<img
					alt=""
					class="max-h-4/5 max-w-4/5 object-contain opacity-65 saturate-75 drop-shadow-[0_0_4cqw_rgb(0_0_0/0.55)] @max-[120px]:hidden"
					decoding="async"
					draggable="false"
					loading="lazy"
					onerror={() => (failedArt = artUrl)}
					src={artUrl}
				/>
			{:else}
				<ImageOff class="h-auto w-[22cqw] opacity-30 @max-[120px]:hidden" />
			{/if}
			<span
				class="absolute bottom-[3cqw] left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/45 px-[3.5cqw] py-[1cqw] text-[3.5cqw] tracking-widest whitespace-nowrap text-white/65 uppercase
				@max-[200px]:text-[5.5cqw]
				@max-[120px]:static @max-[120px]:translate-x-0 @max-[120px]:border-none @max-[120px]:bg-transparent @max-[120px]:p-0 @max-[120px]:text-center @max-[120px]:text-[clamp(0.5rem,9cqw,0.85rem)] @max-[120px]:whitespace-normal @max-[120px]:text-white/45"
			>
				No artwork
			</span>
		</div>

		{#if card}
			<footer class="flex flex-col gap-[1.5cqw] @max-[120px]:hidden">
				{#if typeNames.length}
					<div class="flex flex-wrap gap-[1.5cqw] @max-[200px]:hidden">
						{#each typeNames as type (type)}
							<span class="rounded-full border border-white/25 bg-black/30 px-[2.5cqw] py-[0.5cqw] text-[3.5cqw] tracking-wide uppercase">{type}</span>
						{/each}
					</div>
				{/if}
				<div class="flex justify-between gap-[3cqw] text-[4.5cqw] text-white/75 @max-[200px]:text-[7cqw]">
					<span class="truncate">{card.setName}</span>
					{#if card.localId}
						<span class="shrink-0">#{card.localId}</span>
					{/if}
				</div>
			</footer>
		{/if}
	</div>
</div>

<style>
	/* No scan exists for these cards, so the plate is a card face built from their energy colors mixed into gray. */
	.card-plate {
		--tint-a: #5a5a5a;
		--tint-b: #2f2f2f;
		background-color: color-mix(in oklab, var(--tint-a) 18%, #191919);
		background-image:
			repeating-linear-gradient(135deg, rgb(255 255 255 / 0.025) 0 2px, transparent 2px 9px),
			radial-gradient(120% 90% at 20% 0%, color-mix(in oklab, var(--tint-a) 45%, transparent) 0%, transparent 60%),
			radial-gradient(120% 90% at 85% 100%, color-mix(in oklab, var(--tint-b) 55%, transparent) 0%, transparent 65%);
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--tint-a) 35%, transparent);
	}

	.card-plate-body {
		box-shadow: inset 0 0 0 2.5cqw color-mix(in oklab, var(--tint-a) 12%, transparent);
	}

	.card-plate-window {
		background-image: radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--tint-a) 30%, transparent), rgb(0 0 0 / 0.35) 75%);
		box-shadow:
			inset 0 0 0 1px rgb(255 255 255 / 0.12),
			inset 0 2cqw 6cqw rgb(0 0 0 / 0.45);
	}

	/* Thumbnails (search results, binder slots) are too small for a frame: only the label remains. */
	@container (width < 120px) {
		.card-plate-body,
		.card-plate-window {
			background-image: none;
			box-shadow: none;
		}
	}
</style>
