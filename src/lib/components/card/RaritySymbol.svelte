<script lang="ts">
	import { RARITY_SYMBOLS, RARITY_TONES } from '#helpers/rarity-symbols.ts';
	import { RARITY_SHAPES } from '#helpers/tcg-symbols.ts';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		class?: ClassValue;
		/** Drawn on a light surface such as a card face: the ink and silver tones darken, the way a printed card shows them in black. */
		light?: boolean;
		/** A TCGdex rarity name. `None` and empty get a default circle, an unknown name renders nothing. */
		rarity: string;
	}

	let { class: classNames = '', light = false, rarity }: Props = $props();

	const spec = $derived(RARITY_SYMBOLS[rarity]);
	const tone = $derived(spec && light && spec.tone === 'ink' ? 'fill-gray-950' : spec && light && spec.tone === 'silver' ? 'fill-slate-500' : spec && RARITY_TONES[spec.tone]);
</script>

{#if spec}
	<span aria-label={rarity} class={['inline-flex shrink-0 items-center gap-[0.12em]', classNames]} role="img" title={rarity}>
		{#each { length: spec.count }, index (index)}
			<svg aria-hidden="true" class={['size-[1em]', tone]} viewBox="0 0 100 100">
				<path d={RARITY_SHAPES[spec.shape]} />
			</svg>
		{/each}
	</span>
{/if}
