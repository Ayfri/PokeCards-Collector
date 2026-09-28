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

	/** 54 of the 201 sets have no logo and TCGdex lists some it never uploaded (404), so the symbol stands in for it. */
	let failed = $state<string[]>([]);
	const src = $derived(NO_IMAGES ? undefined : [set.logo, set.symbol].find(url => url && !failed.includes(url)));
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
