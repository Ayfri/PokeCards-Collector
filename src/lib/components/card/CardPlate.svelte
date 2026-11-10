<script lang="ts">
	import CardPlateArt from '#components/card/CardPlateArt.svelte';
	import CardPlateEmblem from '#components/card/CardPlateEmblem.svelte';
	import CardPlateHeader from '#components/card/CardPlateHeader.svelte';
	import RaritySymbol from '#components/card/RaritySymbol.svelte';
	import TypeSymbol from '#components/card/TypeSymbol.svelte';
	import SetLogo from '#components/SetLogo.svelte';
	import { cardTypeTint, NO_IMAGES } from '#helpers/card-images.ts';
	import { artNote, DARK_BODY_TYPES, FULL_ART_RARITIES, hasSilverBorder, plateIdentity, plateTexture, TRAINER_BODY } from '#helpers/card-plate.ts';
	import { catalogueOfPath } from '#helpers/catalogues.ts';
	import { formatCardNumber } from '#helpers/card-utils.ts';
	import { getPokemonImageSrc } from '#helpers/pokemon-utils.ts';
	import type { PlateCard, PlateSet } from '#lib/types.js';
	import { page } from '$app/state';
	import ImageOff from '@lucide/svelte/icons/image-off';

	interface Props {
		alt: string;
		/** The card the plate stands for: fills the name, HP, types, set, number and rarity when given. */
		card?: PlateCard | undefined;
		class?: string;
		/** The card's set, for the symbol and the `34/35` numbering: callers pass it only when they already hold it, so the plate never pulls the sets list in. */
		set?: PlateSet | undefined;
		style?: string;
		/** The name printed in the header, for a caller that shows another one than `card.name` (the species name of a Japanese card): it defaults to the card's name. */
		title?: string | undefined;
		/** Comma-separated energy types, used when no `card` is given. */
		types?: string | undefined;
	}

	let { alt, card = undefined, class: classNames = '', set = undefined, style = '', title = undefined, types = undefined }: Props = $props();

	/** The plate mimics a printed card, so its stage and kind labels use the language of the card's catalogue. */
	const language = $derived(card?.language ?? catalogueOfPath(page.url.pathname).language);
	/** A Trainer or Energy has no species to draw, so the plate shows an emblem of what it is instead of an artwork. */
	const identity = $derived(plateIdentity(card, types));
	/** 70% of the Japanese cards have no art, so the plate takes the card's energy colors for its body, or the silver of a printed Trainer. */
	const tintStyle = $derived(identity.kind === 'trainer' ? TRAINER_BODY : cardTypeTint(identity.tint));
	/** PokéAPI ships an artwork for every species, so a Pokémon card with no scan still shows what it depicts. */
	const artUrl = $derived(!NO_IMAGES && card?.pokemonNumber ? getPokemonImageSrc(card.pokemonNumber) : '');
	/** Keyed on the URL rather than a boolean, so a recycled tile showing another Pokémon retries its artwork. */
	let failedArt = $state<string>();
	/** The scan of another print or language whose illustration fills the window. Its own state, so a failed sprite never brings a failed scan back. */
	let failedScan = $state<string>();
	const scan = $derived(!NO_IMAGES && card?.artImage && card.artImage !== failedScan ? card.artImage : '');
	/** On a full-art card the illustration is the whole card, so its scan fills the plate and the bars turn darker to stay readable over it. */
	const fullArt = $derived(Boolean(scan) && (card?.supertype === 'Energy' || FULL_ART_RARITIES.has(card?.rarity ?? '')));
	/** The header text is black like on a printed card, which only reads on a body lighter than the dark types. */
	const lightText = $derived(fullArt || DARK_BODY_TYPES.has(identity.tint.split(',')[0]?.trim().toLowerCase() ?? ''));
	const ink = $derived(lightText ? 'text-white' : 'text-gray-950');
	/** Text sits straight on the body like on a printed card; a full-art scan needs a dark panel behind it. */
	const panel = $derived(fullArt ? 'rounded-[2cqw] bg-black/70 px-[3cqw] backdrop-blur-xs' : 'px-[1cqw]');
	const artAlt = $derived(`${card?.name ?? alt} artwork`);
	const heading = $derived(card ? title ?? card.name.charAt(0).toUpperCase() + card.name.slice(1) : '');
	const number = $derived(card?.localId ? formatCardNumber(card.localId, set?.printedTotal, { printed: true }) : '');
	const artist = $derived(card && card.artist !== 'Unknown' ? card.artist : '');
	/** `SetLogo` prefers the logo, which is too wide for the strip: the plate hands it the symbol alone. */
	const symbolSet = $derived(set?.symbol ? { logo: '', name: set.name, symbol: set.symbol } : undefined);
	const note = $derived(artNote(card?.artSource));
	/** The Pokédex line printed under a real card's art; 99999 is the placeholder of a card with no known species. */
	const dexLine = $derived(identity.kind === 'pokemon' && card?.pokemonNumber && card.pokemonNumber < 99999 ? `NO. ${String(card.pokemonNumber).padStart(3, '0')}` : '');
</script>

<!-- The layout of a real card, all scaled with the tile through `cqw`: border, name line, art window, text box, then a strip with the set, the illustrator,
     the set symbol and the number. The border is yellow or silver depending on the card's era. The `@max-*` variants drop details once they would shrink below reading size.
     The bottom padding never drops under 3.2rem, so the strip stays above the set badge and collection controls grids lay over the tile (fixed px, unlike the plate). -->
<div aria-label={alt} class="card-plate @container overflow-hidden text-white select-none {classNames}" data-card-code={card?.cardCode} role="img" style="{style}; {tintStyle}; {plateTexture(card)}">
	<div class="relative isolate flex h-full flex-col gap-[2cqw] px-[6.5cqw] pt-[4cqw] pb-[max(3.2rem,16cqw)] @max-[200px]:pb-[max(3.2rem,22cqw)] @max-[120px]:justify-center @max-[120px]:p-[6cqw] @max-[120px]:pb-[6cqw]">
		{#if scan && fullArt}
			<CardPlateArt alt={artAlt} base={scan} full onerror={() => (failedScan = scan)} />
			<div class="absolute inset-x-0 top-0 -z-10 h-[30%] bg-linear-to-b from-black/85 via-black/55 to-transparent"></div>
		{/if}
		<div class={['pointer-events-none absolute inset-0 border-[3.5cqw] @max-[120px]:hidden', hasSilverBorder(card) ? 'border-zinc-300' : 'border-gold-400']}></div>

		{#if card}
			<CardPlateHeader {card} {heading} {identity} {language} {lightText} />
		{/if}

		<!-- The art window of a real card, about 87 % of its width and 41 % of its height: a recessed frame holding a borrowed illustration, the Pokémon's artwork,
		     or an icon when there is none. Small tiles let it fill the space instead. A full-art scan sits behind the whole plate, so the window stays empty and frameless. -->
		<div class={['relative flex aspect-[1.5] items-center justify-center rounded-[0.8cqw] @max-[200px]:aspect-auto @max-[200px]:min-h-0 @max-[200px]:flex-1 @max-[120px]:flex-none', !fullArt && 'card-plate-window']}>
			{#if scan && !fullArt}
				<CardPlateArt alt={artAlt} base={scan} onerror={() => (failedScan = scan)} trainer={identity.kind === 'trainer'} />
			{:else if !scan && identity.kind !== 'pokemon'}
				<CardPlateEmblem accent={identity.accent} emblem={identity.emblem} kind={identity.kind} special={identity.special} />
			{:else if !scan && artUrl && artUrl !== failedArt}
				<img
					alt={artAlt}
					class="max-h-4/5 max-w-4/5 object-contain opacity-95 drop-shadow-[0_0_4cqw_rgb(0_0_0/0.55)] @max-[120px]:hidden"
					decoding="async"
					draggable="false"
					loading="lazy"
					onerror={() => (failedArt = artUrl)}
					src={artUrl}
				/>
			{:else if !scan}
				<ImageOff class="h-auto w-[22cqw] opacity-30 @max-[120px]:hidden" />
			{/if}
			{#if scan && note}
				<span class="absolute right-[2cqw] bottom-[2cqw] rounded-full bg-black/70 px-[2.5cqw] py-[0.5cqw] text-[3cqw] tracking-wide whitespace-nowrap text-white/85 backdrop-blur-xs @max-[200px]:hidden">{note}</span>
			{/if}
			<!-- Above 200px the header and the emblem already name a Trainer or Energy, so its chip only stays on small tiles. -->
			<span
				class={[
					`absolute bottom-[3cqw] left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/45 px-[3.5cqw] py-[1cqw] text-[3.5cqw] tracking-widest whitespace-nowrap text-white/65 uppercase
					@max-[200px]:text-[5.5cqw]
					@max-[120px]:static @max-[120px]:translate-x-0 @max-[120px]:border-none @max-[120px]:bg-transparent @max-[120px]:p-0 @max-[120px]:text-center @max-[120px]:text-[clamp(0.5rem,9cqw,0.85rem)] @max-[120px]:whitespace-normal`,
					lightText ? '@max-[120px]:text-white/70' : '@max-[120px]:text-gray-950/70',
					identity.label && '@min-[200px]:hidden',
					scan && !identity.label && '@min-[120px]:hidden'
				]}
			>
				{identity.label || 'No artwork'}
			</span>
		</div>

		{#if dexLine && !fullArt}
			<span class="-mt-[1.4cqw] truncate rounded-b-[0.8cqw] bg-linear-to-b from-zinc-100 to-zinc-300 px-[2cqw] py-[0.3cqw] text-center text-[2.6cqw] leading-tight text-gray-800 italic @max-[200px]:hidden">{dexLine}</span>
		{/if}

		{#if card}
			<!-- The text area under the art, where a real card prints its attacks: it takes the height the art window leaves, with the types and the set at its top.
			     The text sits straight on the body, in the header's ink; only over a full-art scan does it get a dark panel. -->
			<div class={['flex min-h-0 flex-col gap-[2cqw] py-[2cqw] @max-[200px]:hidden', fullArt ? 'mt-auto' : 'flex-1', panel, ink]}>
				<div class="flex flex-wrap items-center gap-[1.5cqw]">
					{#each identity.typeNames as type (type)}
						<span class={['flex items-center gap-[1.2cqw] rounded-full border px-[2.5cqw] py-[0.5cqw] text-[3.5cqw] tracking-wide uppercase', lightText ? 'border-white/25 bg-black/30' : 'border-gray-950/30 bg-white/45']}>
							<TypeSymbol decorative {type} />{type}
						</span>
					{/each}
				</div>
				<span class="truncate text-[4cqw] opacity-80">{card.setName}</span>
			</div>

			<footer class={['flex items-center justify-between gap-[3cqw] py-[1.5cqw] text-[3.5cqw] @max-[200px]:text-[6.5cqw] @max-[120px]:hidden', panel, ink]}>
				<span class="truncate italic @max-[200px]:hidden">{artist && `Illus. ${artist}`}</span>
				<span class="ml-auto flex shrink-0 items-center gap-[1.5cqw] font-semibold">
					{#if symbolSet}
						<SetLogo class="size-[5cqw] object-contain @max-[200px]:size-[7cqw]" set={symbolSet} />
					{/if}
					{number}
					<RaritySymbol decorative light={!lightText} rarity={card.rarity} />
				</span>
			</footer>
		{/if}
	</div>
</div>

<style>
	/* No scan exists for these cards, so the plate is a card face built from their energy colors, the way a real card body takes its type's color. */
	.card-plate {
		--tint-a: #5a5a5a;
		--tint-b: #2f2f2f;
		background-color: var(--tint-a);
		background-blend-mode: soft-light, normal;
		background-image: var(--plate-texture, none), linear-gradient(170deg, var(--tint-a) 0%, color-mix(in oklab, var(--tint-a) 80%, var(--tint-b)) 100%);
		background-position: var(--plate-shift, 0 0), 0 0;
		background-size: 140% 140%, auto;
	}

	.card-plate-window {
		background-color: color-mix(in oklab, var(--tint-a) 55%, black);
		background-image: radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--tint-a) 30%, transparent), rgb(0 0 0 / 0.35) 75%);
	}

	/* The thin metallic frame of a real card's art box, drawn behind the window so it only shows around it. */
	.card-plate-window::before {
		background: linear-gradient(135deg, #f4f5f7, #a9aeb6 50%, #eceef0);
		border-radius: 1.6cqw;
		content: '';
		inset: -0.8cqw;
		position: absolute;
		z-index: -1;
	}

	/* Thumbnails (search results, binder slots) are too small for a frame: only the label remains. */
	@container (width < 120px) {
		.card-plate-window {
			background: none;
		}

		.card-plate-window::before {
			display: none;
		}
	}
</style>
