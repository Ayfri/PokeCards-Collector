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
	 * The scraper only stores a logo or symbol the CDN holds, PNG when it exists since Open Graph and the sitemap reuse it.
	 * Its WebP twin is ~4.7x lighter (a logo PNG weighs up to 290 KB), so it goes first, with the stored file as the fallback
	 * for the few TCGdex ships as PNG only. The symbol stands in for a set with no logo.
	 */
	let failed = $state<string[]>([]);
	const src = $derived(NO_IMAGES ? undefined : [set.logo, set.symbol].flatMap(url => url ? [toWebp(url), url] : []).find(url => !failed.includes(url)));
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
