<script lang="ts">
	import { TYPE_SYMBOLS } from '#helpers/tcg-symbols.ts';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		class?: ClassValue;
		/** An energy type name such as `Fire`, in any case. An unknown one gets the colorless disc with no glyph. */
		type: string;
	}

	let { class: classNames = '', type }: Props = $props();

	const gradientId = $props.id();
	const key = $derived(type.trim().toLowerCase());
	const glyph = $derived(TYPE_SYMBOLS[key]);
</script>

<!-- The `--<type>` pair from `colors.css` fills the disc. White on yellow or gray stays readable thanks to the glyph's shadow. -->
<svg
	aria-label={type}
	class={['inline-block size-[1.15em] shrink-0 align-[-0.2em] drop-shadow-[0_0.05em_0.1em_rgb(0_0_0/0.5)]', classNames]}
	role="img"
	style="--type-a: var(--{key}, var(--colorless)); --type-b: var(--{key}2, var(--colorless2))"
	viewBox="0 0 100 100"
>
	<defs>
		<radialGradient id={gradientId} cx=".3" cy=".25" r=".85">
			<stop offset="0" stop-color="var(--type-a)" />
			<stop offset="1" stop-color="var(--type-b)" />
		</radialGradient>
	</defs>
	<circle cx="50" cy="50" fill="url(#{gradientId})" r="47.5" stroke="rgb(255 255 255/0.5)" stroke-width="5" />
	{#if glyph}
		<g class="drop-shadow-[0_0_1.5px_rgb(0_0_0/0.55)]">
			<path d={glyph} fill="white" transform="translate(19 19) scale(.62)" />
		</g>
	{/if}
</svg>
