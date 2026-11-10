<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Set } from '#lib/types.js';
	import { NO_IMAGES } from '#helpers/card-images.ts';

	interface Props {
		class?: string;
		/** Loads the image right away at high priority, for the logos above the fold. The others wait until they scroll near. */
		eager?: boolean;
		/** Rendered when the set has neither a logo nor a symbol that loads. */
		fallback?: Snippet;
		set: Pick<Set, 'logo' | 'name' | 'symbol'>;
	}

	let { class: classNames = '', eager = false, fallback, set }: Props = $props();

	/**
	 * A set arrives with its same-origin `/set-images/` WebP once the mirror holds it, so the logo and the symbol are tried as given. A set added
	 * after the mirror keeps the remote URL the scraper stored. The symbol stands in for a set with no logo, or whose logo fails to load.
	 */
	let failed = $state<string[]>([]);
	const src = $derived(NO_IMAGES ? undefined : [set.logo, set.symbol].find(url => url && !failed.includes(url)));
</script>

{#if src}
	<img
		alt="{set.name} logo"
		class={classNames}
		decoding="async"
		fetchpriority={eager ? 'high' : undefined}
		loading={eager ? 'eager' : 'lazy'}
		onerror={() => failed.push(src)}
		{src}
	/>
{:else}
	{@render fallback?.()}
{/if}
