<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Set } from '$lib/types';
	import { NO_IMAGES } from '$lib/images';

	interface Props {
		class?: string;
		/** Rendered when the set has neither a logo nor a symbol that loads. */
		fallback?: Snippet;
		set: Pick<Set, 'logo' | 'name' | 'symbol'>;
	}

	let { class: classNames = '', fallback, set }: Props = $props();

	const toWebp = (url: string) => url.replace(/\.png$/, '.webp');

	/**
	 * The WebP twin first, ~4.7x lighter than the stored PNG (up to 290 KB); 4 logos only exist as PNG, so it stays as the fallback.
	 * 54 of the 201 sets have no logo, so the symbol stands in, tried as WebP only: TCGdex answers 400 for every symbol today.
	 */
	let failed = $state<string[]>([]);
	const src = $derived(NO_IMAGES ? undefined : [set.logo && toWebp(set.logo), set.logo, set.symbol && toWebp(set.symbol)].find(url => url && !failed.includes(url)));
</script>

{#if src}
	<img
		alt="{set.name} logo"
		class={classNames}
		decoding="async"
		loading="lazy"
		onerror={() => failed.push(src)}
		{src}
	/>
{:else}
	{@render fallback?.()}
{/if}
