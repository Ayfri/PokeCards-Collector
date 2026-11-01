<script lang="ts">
	import { RARITY_SYMBOLS, RARITY_TONES } from '#helpers/rarity-symbols.ts';
	import { RARITY_SHAPES } from '#helpers/tcg-symbols.ts';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		class?: ClassValue;
		/** A TCGdex rarity name. One with no official symbol (`None`, empty) renders nothing. */
		rarity: string;
	}

	let { class: classNames = '', rarity }: Props = $props();

	const spec = $derived(RARITY_SYMBOLS[rarity]);
</script>

{#if spec}
	<span aria-label={rarity} class={['inline-flex shrink-0 items-center gap-[0.12em]', classNames]} role="img" title={rarity}>
		{#each { length: spec.count }, index (index)}
			<svg aria-hidden="true" class={['size-[1em]', RARITY_TONES[spec.tone]]} viewBox="0 0 100 100">
				<path d={RARITY_SHAPES[spec.shape]} />
			</svg>
		{/each}
	</span>
{/if}
