<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Set } from '#lib/types.js';
	import { NO_IMAGES } from '#helpers/card-images.ts';

	interface Props {
		class?: string;
		/** Rendered when the set has neither a logo nor a symbol that loads. */
		fallback?: Snippet;
		set: Pick<Set, 'logo' | 'name' | 'symbol'>;
	}

	let { class: classNames = '', fallback, set }: Props = $props();

	/** Only TCGdex ships WebP twins; a community image from pokemontcg.io is PNG only. */
	const toWebp = (url: string) => url.startsWith('https://assets.tcgdex.net/') ? url.replace(/\.png$/, '.webp') : url;

	/**
	 * A mirrored set arrives with its same-origin `/set-images/` WebP, which passes through untouched. A set added after the mirror keeps the
	 * remote URL the scraper stored (PNG when it exists): its TCGdex WebP twin is ~4.7x lighter, so it goes first, with the stored file as the
	 * fallback for the few TCGdex ships as PNG only. The symbol stands in for a set with no logo.
	 */
	let failed = $state<string[]>([]);
	const src = $derived(NO_IMAGES ? undefined : [...new Set([set.logo, set.symbol].flatMap(url => url ? [toWebp(url), url] : []))].find(url => !failed.includes(url)));
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
