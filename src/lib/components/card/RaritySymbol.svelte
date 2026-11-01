<script lang="ts">
	import { RARITY_SYMBOLS, RARITY_TONES } from '#helpers/rarity-symbols.ts';
	import { RARITY_SHAPES } from '#helpers/tcg-symbols.ts';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		class?: ClassValue;
		/** The rarity's name is printed next to the symbol (or the parent already labels it), so the symbol is hidden from assistive tech instead of announcing it twice. */
		decorative?: boolean;
		/** Drawn on a light surface such as a card face: the ink and silver tones darken, the way a printed card shows them in black. */
		light?: boolean;
		/** A TCGdex rarity name. `None` and empty get a default circle, an unknown name renders nothing. */
		rarity: string;
	}

	let { class: classNames = '', decorative = false, light = false, rarity }: Props = $props();

	const spec = $derived(RARITY_SYMBOLS[rarity]);
	const tone = $derived(spec && light && spec.tone === 'ink' ? 'fill-gray-950' : spec && light && spec.tone === 'silver' ? 'fill-slate-500' : spec && RARITY_TONES[spec.tone]);
	const label = $derived(rarity && rarity !== 'None' ? rarity : 'Unknown rarity');
</script>

{#if spec}
	<span
		aria-hidden={decorative ? 'true' : undefined}
		aria-label={decorative ? undefined : label}
		class={['inline-flex shrink-0 items-center gap-[0.12em]', classNames]}
		role={decorative ? undefined : 'img'}
		title={decorative ? undefined : label}
	>
		{#each { length: spec.count }, index (index)}
			<svg aria-hidden="true" class={['size-[1em]', tone]} viewBox="0 0 100 100">
				<path d={RARITY_SHAPES[spec.shape]} />
			</svg>
		{/each}
	</span>
{/if}
