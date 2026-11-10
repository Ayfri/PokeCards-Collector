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

	/** Only TCGdex ships WebP twins; a community image from pokemontcg.io is PNG only. */
	const candidates = (url: string | null | undefined) => url?.startsWith('https://assets.tcgdex.net/') ? [url.replace(/\.png$/, '.webp'), url] : url ? [url] : [];

	/**
	 * A mirrored set arrives with its same-origin `/set-images/` WebP, which is tried as given. A set added after the mirror keeps the remote URL
	 * the scraper stored (PNG when it exists): its TCGdex WebP twin is ~4.7x lighter (up to 290 kB for the PNG), so it goes first, with the stored
	 * file as the fallback for the few TCGdex ships as PNG only. The symbol stands in for a set with no logo, or whose logo fails to load.
	 */
	let failed = $state<string[]>([]);
	const src = $derived(NO_IMAGES ? undefined : [set.logo, set.symbol].flatMap(candidates).find(url => !failed.includes(url)));
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
