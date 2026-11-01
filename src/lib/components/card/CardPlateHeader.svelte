<script lang="ts">
	import ExLogo from '#components/card/ExLogo.svelte';
	import TypeSymbol from '#components/card/TypeSymbol.svelte';
	import { type PlateIdentity, stageLabel } from '#helpers/card-plate.ts';
	import type { Language } from '#helpers/catalogues.ts';
	import type { FullCard } from '#lib/types.js';
	import type { Attachment } from 'svelte/attachments';

	interface Props {
		card: FullCard;
		/** The name to print: the card's, or the species name a caller passes for a Japanese card. */
		heading: string;
		identity: PlateIdentity;
		language: Language;
		/** True on a dark body or over a full-art scan: the text turns white with a shadow. */
		lightText: boolean;
	}

	let { card, heading, identity, language, lightText }: Props = $props();

	/**
	 * Scarlet & Violet prints a lowercase `ex` as a silver logo after the name; the older uppercase `EX` is a different mark and stays text.
	 * The suffix follows a space (`Absol ex`), a hyphen in French (`Absol-ex`) or the kana of a Japanese name (`アブソルex`): after a Latin letter
	 * it would also cut `Calyrex` and `Toxapex`.
	 */
	const EX_SUFFIX = /(?:[\s-]|(?<=[぀-ヿ一-鿿]))ex$/;
	const exSuffix = $derived(EX_SUFFIX.test(heading));
	const name = $derived(heading.replace(EX_SUFFIX, ''));
	/** A Trainer names its kind in the colored pill of the banner row instead. */
	const subtitle = $derived(identity.banner ? '' : stageLabel(card.stage, language) || (identity.kind === 'pokemon' ? card.supertype : identity.label));
	/** A plain Trainer (no known kind) has only its banner: a pill would repeat the same word. */
	const kindPill = $derived(identity.label !== identity.banner ? identity.label : '');

	/** A name that does not fit is squeezed horizontally like on a printed card, never cut or wrapped; below this the text stops being legible. */
	const MIN_SQUISH = 0.55;

	/**
	 * First paint, before any measure: the widths of the header's parts in `cqw`, estimated from character counts, so the server and the client draw
	 * the same squish and a tile is right on mount (a view transition holds back the ResizeObserver). `fit` replaces it with the measured value.
	 */
	const estimate = $derived.by(() => {
		const natural = name.length * 3.5;
		const pill = subtitle ? subtitle.length * 1.65 + 3 + 2 : 0;
		const hp = card.hp ? 4.8 + 4 * String(card.hp).length + 1.2 : 0;
		const types = identity.kind === 'pokemon' ? identity.typeNames.length * 9.25 : 0;
		const logo = exSuffix ? 12 : 0;
		const squish = Math.min(1, Math.max(MIN_SQUISH, (91.5 - 2 - pill - hp - types - logo) / natural));
		return `--squish: ${squish.toFixed(3)}; --squish-gap: ${((squish - 1) * natural).toFixed(2)}cqw`;
	});

	/**
	 * Measures the name against the room left in its box (net of the ex logo) and sets `--squish` and the negative margin that pulls the logo back
	 * against the squished text, since a transform does not change the layout width. Re-run when the name changes, `text` being what makes it track.
	 */
	function fit(text: string): Attachment<HTMLElement> {
		return node => {
			const box = node.parentElement;
			if (!box || !text) return;
			const measure = () => {
				const logo = node.nextElementSibling instanceof HTMLElement ? node.nextElementSibling.offsetWidth : 0;
				const natural = node.offsetWidth;
				const squish = natural ? Math.min(1, Math.max(MIN_SQUISH, (box.clientWidth - logo) / natural)) : 1;
				node.style.setProperty('--squish', squish.toFixed(3));
				node.style.setProperty('--squish-gap', `${((squish - 1) * natural).toFixed(1)}px`);
			};
			measure();
			const observer = new ResizeObserver(measure);
			observer.observe(box);
			observer.observe(node);
			return () => observer.disconnect();
		};
	}
</script>

<!-- A printed Trainer card opens with a large gray `TRAINER` against the left border and its kind on the right, in the kind's color outlined in white. -->
{#if identity.banner}
	<div class="-mb-[1.5cqw] -ml-[1.5cqw] -mr-[1cqw] flex items-baseline justify-between gap-[2cqw] @max-[200px]:hidden">
		<span class="inline-block origin-bottom-left scale-y-85 -skew-x-20 text-[7cqw] leading-none font-black tracking-wide text-gray-500 uppercase [text-shadow:0_0.3cqw_0_rgb(255_255_255/0.6)]">{identity.banner}</span>
		{#if kindPill}
			<span
				class="-translate-y-[0.8cqw] text-[4.5cqw] leading-none font-extrabold whitespace-nowrap italic [paint-order:stroke_fill] [-webkit-text-stroke:0.9cqw_white]"
				style:color="color-mix(in oklab, var(--{identity.accent}) 55%, var(--{identity.accent}2))"
			>{kindPill}</span>
		{/if}
	</div>
{/if}

<!-- Like on a real card the header has no box and its text is black, white (with a shadow) only over a full-art scan or a dark body.
     It starts under the card's left border, where a printed stage tab sits. -->
<header class={['flex items-center justify-between -ml-[3.5cqw] -mr-[3cqw] gap-[2cqw] pr-[1cqw] pl-[1cqw] -mb-[0.5cqw] @max-[120px]:hidden', lightText ? 'text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.65)]' : 'text-gray-950']}>
	<div class="flex min-w-0 flex-1 items-center gap-[1.5cqw]">
		{#if subtitle}
			<span class="shrink-0 rounded-full bg-white/60 px-[1.5cqw] py-[0.2cqw] text-[2.4cqw] leading-tight font-semibold tracking-wide text-gray-950 uppercase italic @max-[200px]:hidden">{subtitle}</span>
		{/if}
		<span class="min-w-0 flex-1 overflow-hidden text-[6cqw] leading-[1.2] font-semibold whitespace-nowrap @max-[200px]:line-clamp-2 @max-[200px]:text-[9cqw] @max-[200px]:whitespace-normal">
			<span
				{@attach fit(name)}
				class="mr-[var(--squish-gap,0px)] inline-block origin-left [transform:scaleX(var(--squish,1))] @max-[200px]:mr-0 @max-[200px]:inline"
				style={estimate}
			>{name}</span>{#if exSuffix}<span class="inline-block">&nbsp;<ExLogo /></span>{/if}
		</span>
	</div>
	{#if card.hp || (identity.kind === 'pokemon' && identity.typeNames.length)}
		<!-- Past the first symbol the rest only fit on a wide tile. -->
		<div class="flex shrink-0 items-center gap-[1.2cqw] text-[7cqw] leading-tight @max-[200px]:text-[9cqw]">
			{#if card.hp}
				<span class="font-bold"><small class="mr-[0.15em] text-[0.5em]">HP</small>{card.hp}</span>
			{/if}
			{#if identity.kind === 'pokemon'}
				{#each identity.typeNames as type, index (type)}
					<TypeSymbol class={[index > 0 && '@max-[200px]:hidden']} decorative glyph="black" pale {type} />
				{/each}
			{/if}
		</div>
	{/if}
</header>
