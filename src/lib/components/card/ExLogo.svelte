<script lang="ts">
	import { EX_LOGO } from '#helpers/tcg-symbols.ts';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		class?: ClassValue;
	}

	let { class: classNames = '' }: Props = $props();

	const id = $props.id();
	/** Room for the half of the outline that falls outside the glyph. */
	const PAD = 4;
</script>

<svg
	aria-label="ex"
	class={['inline-block h-[0.9em] w-auto shrink-0 overflow-visible align-[-0.1em]', classNames]}
	role="img"
	viewBox="{-PAD} {-PAD} {EX_LOGO.width + PAD * 2} {100 + PAD * 2}"
>
	<defs>
		<linearGradient id="{id}-silver" x1="0" x2="0" y1="0" y2="1">
			<stop offset="0" stop-color="#ffffff" />
			<stop offset="0.55" stop-color="#d4d8de" />
			<stop offset="1" stop-color="#8d939c" />
		</linearGradient>
	</defs>
	<!-- The outline is drawn over the fill: half of it eats into the letters, which thins the font's heavy glyph while the border thickens. -->
	<path d={EX_LOGO.d} fill="url(#{id}-silver)" stroke="#111" stroke-linejoin="round" stroke-width="6" />
</svg>
