<script lang="ts">
	import CardPlateArt from '#components/card/CardPlateArt.svelte';
	import CardPlateEmblem from '#components/card/CardPlateEmblem.svelte';
	import TypeSymbol from '#components/card/TypeSymbol.svelte';
	import SetLogo from '#components/SetLogo.svelte';
	import { cardTypeTint } from '#helpers/card-images.ts';
	import { artNote, plateIdentity } from '#helpers/card-plate.ts';
	import { formatCardNumber } from '#helpers/card-utils.ts';
	import { getPokemonImageSrc } from '#helpers/pokemon-utils.ts';
	import { NO_IMAGES } from '#lib/images.ts';
	import type { FullCard, Set } from '#lib/types.js';
	import ImageOff from '@lucide/svelte/icons/image-off';

	interface Props {
		alt: string;
		/** The card the plate stands for: fills the name, HP, types, set, number and rarity when given. */
		card?: FullCard | undefined;
		class?: string;
		/** The card's set, for the symbol and the `34/35` numbering: callers pass it only when they already hold it, so the plate never pulls the sets list in. */
		set?: Pick<Set, 'name' | 'printedTotal' | 'symbol'> | undefined;
		style?: string;
		/** Comma-separated energy types, used when no `card` is given. */
		types?: string | undefined;
	}

	let { alt, card = undefined, class: classNames = '', set = undefined, style = '', types = undefined }: Props = $props();

	/** A Trainer or Energy has no species to draw, so the plate shows an emblem of what it is instead of an artwork. */
	const identity = $derived(plateIdentity(card, types));
	/** 70% of the Japanese cards have no art, so the plate takes the card's energy colors and mixes them into the gray. */
	const tintStyle = $derived(cardTypeTint(identity.tint));
	/** PokéAPI ships an artwork for every species, so a Pokémon card with no scan still shows what it depicts. */
	const artUrl = $derived(!NO_IMAGES && card?.pokemonNumber ? getPokemonImageSrc(card.pokemonNumber) : '');
	/** Keyed on the URL rather than a boolean, so a recycled tile showing another Pokémon retries its artwork. */
	let failedArt = $state<string>();
	/** The scan of another print or language whose illustration fills the window. Its own state, so a failed sprite never brings a failed scan back. */
	let failedScan = $state<string>();
	const scan = $derived(!NO_IMAGES && card?.artImage && card.artImage !== failedScan ? card.artImage : '');
	const subtitle = $derived(card?.stage || (identity.kind === 'pokemon' ? card?.supertype : identity.label));
	const rarity = $derived(card && card.rarity !== 'None' ? card.rarity : '');
	const number = $derived(card?.localId ? formatCardNumber(card.localId, set?.printedTotal) : '');
	const artist = $derived(card && card.artist !== 'Unknown' ? card.artist : '');
	/** `SetLogo` prefers the logo, which is too wide for the strip: the plate hands it the symbol alone. */
	const symbolSet = $derived(set?.symbol ? { logo: '', name: set.name, symbol: set.symbol } : undefined);
</script>

<!-- The layout of a real card, all scaled with the tile through `cqw`: name bar, art window, text box, then a strip with the illustrator,
     set symbol and number. The `@max-*` variants drop details once they would shrink below reading size.
     The bottom padding leaves room for the set badge and collection controls grids lay over the tile. -->
<div aria-label={alt} class="card-plate @container overflow-hidden text-white select-none {classNames}" data-card-code={card?.cardCode} role="img" style="{style}; {tintStyle}">
	<div class="card-plate-body flex h-full flex-col gap-[2.5cqw] p-[6cqw] pb-[16cqw] @max-[200px]:pb-[22cqw] @max-[120px]:justify-center @max-[120px]:pb-[6cqw]">
		{#if card}
			<header class="flex items-center justify-between gap-[3cqw] rounded-[2cqw] bg-black/30 px-[3cqw] py-[1.5cqw] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] @max-[120px]:hidden">
				<div class="flex min-w-0 flex-col">
					{#if subtitle}
						<span class="truncate text-[3.5cqw] leading-none font-semibold tracking-wide text-white/55 uppercase @max-[200px]:hidden">{subtitle}</span>
					{/if}
					<span class="line-clamp-2 text-[6.5cqw] leading-tight font-bold @max-[200px]:text-[9cqw]">{card.name}</span>
				</div>
				{#if card.hp || (identity.kind === 'pokemon' && identity.typeNames.length)}
					<!-- Past the first symbol the rest only fit on a wide tile. -->
					<div class="flex shrink-0 items-center gap-[1.2cqw] text-[6.5cqw] leading-tight @max-[200px]:text-[9cqw]">
						{#if card.hp}
							<span class="font-extrabold text-gold-400">{card.hp}<small class="ml-[0.15em] text-[0.6em]">HP</small></span>
						{/if}
						{#if identity.kind === 'pokemon'}
							{#each identity.typeNames as type, index (type)}
								<TypeSymbol class={[index > 0 && '@max-[200px]:hidden']} {type} />
							{/each}
						{/if}
					</div>
				{/if}
			</header>
		{/if}

		<!-- The art window of a real card: a recessed frame holding a borrowed illustration, the Pokémon's artwork, or an icon when there is none. -->
		<div class="card-plate-window relative flex min-h-0 flex-1 items-center justify-center rounded-[3cqw] @max-[120px]:flex-none">
			{#if scan}
				<CardPlateArt base={scan} note={artNote(card?.artSource)} onerror={() => (failedScan = scan)} />
			{:else if identity.kind !== 'pokemon'}
				<CardPlateEmblem emblem={identity.emblem} kind={identity.kind} special={identity.special} />
			{:else if artUrl && artUrl !== failedArt}
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
			<!-- Above 200px the header and the emblem already name a Trainer or Energy, so its chip only stays on small tiles. -->
			<span
				class={[
					`absolute bottom-[3cqw] left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/45 px-[3.5cqw] py-[1cqw] text-[3.5cqw] tracking-widest whitespace-nowrap text-white/65 uppercase
					@max-[200px]:text-[5.5cqw]
					@max-[120px]:static @max-[120px]:translate-x-0 @max-[120px]:border-none @max-[120px]:bg-transparent @max-[120px]:p-0 @max-[120px]:text-center @max-[120px]:text-[clamp(0.5rem,9cqw,0.85rem)] @max-[120px]:whitespace-normal @max-[120px]:text-white/45`,
					identity.label && '@min-[200px]:hidden',
					scan && !identity.label && '@min-[120px]:hidden'
				]}
			>
				{identity.label || 'No artwork'}
			</span>
		</div>

		{#if card}
			<!-- The text box under the art: where the energy types and the set go, since a plate has no attacks or rules to print. -->
			<div class="flex flex-col gap-[1.5cqw] rounded-[2cqw] bg-black/30 px-[3cqw] py-[2cqw] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] @max-[200px]:hidden">
				<div class="flex flex-wrap items-center gap-[1.5cqw]">
					{#each identity.typeNames as type (type)}
						<span class="flex items-center gap-[1.2cqw] rounded-full border border-white/25 bg-black/30 px-[2.5cqw] py-[0.5cqw] text-[3.5cqw] tracking-wide uppercase">
							<TypeSymbol {type} />{type}
						</span>
					{/each}
					{#if rarity}
						<span class="ml-auto truncate text-[3.5cqw] tracking-wide text-white/60 uppercase">{rarity}</span>
					{/if}
				</div>
				<span class="truncate text-[4cqw] text-white/70">{card.setName}</span>
			</div>

			<footer class="flex items-center justify-between gap-[3cqw] text-[3.5cqw] text-white/70 @max-[200px]:text-[6.5cqw] @max-[120px]:hidden">
				<span class="truncate italic @max-[200px]:hidden">{artist && `Illus. ${artist}`}</span>
				<span class="ml-auto flex shrink-0 items-center gap-[1.5cqw] font-semibold">
					{#if symbolSet}
						<SetLogo class="size-[5cqw] object-contain @max-[200px]:size-[7cqw]" set={symbolSet} />
					{/if}
					{number}
				</span>
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
		box-shadow: inset 0 0 0 2.5cqw color-mix(in oklab, var(--color-gold-400) 16%, transparent);
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
