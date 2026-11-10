<script lang="ts">
	import { TYPE_GLYPH_SCALE, TYPE_SYMBOLS } from '#helpers/tcg-symbols.ts';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		class?: ClassValue;
		/** The type's name is printed next to the symbol (or the parent already labels it), so the symbol is hidden from assistive tech instead of announcing it twice. */
		decorative?: boolean;
		/** Washes the disc out toward white, the way the symbol in a printed card's header is paler than the one on an attack cost. */
		pale?: boolean;
		/** References the symbol `TypeSymbolDefs` draws once in the page instead of inlining the disc and the glyph, for a grid that repeats the symbol on every tile. Not paled, and with no halo or inline alignment: the grid places it as a flex item. */
		shared?: boolean;
		/** An energy type name such as `Fire`, in any case. An unknown one gets the colorless disc with no glyph. */
		type: string;
	}

	let { class: classNames = '', decorative = false, pale = false, shared = false, type }: Props = $props();

	const gradientId = $props.id();
	const key = $derived(type.trim().toLowerCase());
	const glyph = $derived(TYPE_SYMBOLS[key]);
	const fill = (color: string) => (pale ? `color-mix(in oklab, ${color} 90%, white)` : color);
</script>

<!-- The `--<type>` pair from `colors.css` fills the disc and the glyph is black like on a printed card; a faint white halo keeps it readable on the dark discs. -->
<svg
	aria-hidden={decorative ? 'true' : undefined}
	aria-label={decorative ? undefined : type}
	class={shared ? ['size-[1.15em] shrink-0', classNames] : ['inline-block size-[1.15em] shrink-0 align-[-0.2em] drop-shadow-[0_0.05em_0.1em_rgb(0_0_0/0.5)]', classNames]}
	role={decorative ? undefined : 'img'}
	style={shared ? undefined : `--type-a: ${fill(`var(--${key}, var(--colorless))`)}; --type-b: ${fill(`var(--${key}2, var(--colorless2))`)}`}
	viewBox="0 0 100 100"
>
	{#if shared}
		<use href="#type-symbol-{glyph ? key : 'colorless'}" />
	{:else}
		<defs>
			<radialGradient cx=".3" cy=".25" id={gradientId} r=".85">
				<stop offset="0" style="stop-color: var(--type-a)" />
				<stop offset="1" style="stop-color: var(--type-b)" />
			</radialGradient>
		</defs>
		<circle cx="50" cy="50" fill="url(#{gradientId})" r="47.5" stroke="rgb(255 255 255/0.5)" stroke-width="5" />
		{#if glyph}
			<g class="drop-shadow-[0_0_1.5px_rgb(255_255_255/0.6)]">
				<path d={glyph} fill="#0a0a0a" transform="translate({50 - 50 * TYPE_GLYPH_SCALE} {50 - 50 * TYPE_GLYPH_SCALE}) scale({TYPE_GLYPH_SCALE})" />
			</g>
		{/if}
	{/if}
</svg>
