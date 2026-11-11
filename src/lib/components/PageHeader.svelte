<script lang="ts" module>
	import type { LucideIcon } from '@lucide/svelte';

	export interface PageStat {
		icon: LucideIcon;
		label: string;
		/** Hover text that spells out what the number counts. */
		title?: string;
		/** Already formatted, so the server and the browser print the same text. */
		value: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		class?: ClassValue;
		/** On the right from `lg` (the filter bar), under the text below it. */
		controls?: Snippet;
		/** Next to the title, such as the language pills of a set list. */
		extras?: Snippet;
		/** Keeps the lede in the HTML but out of the layout below `md`, for a page that has to fit one phone screen. */
		hideLedeOnPhone?: boolean;
		/** Real text in the server HTML: one sentence of about 100 characters that says what the page is for, so it stays on one line from `xl`. */
		lede: string;
		/** A line of icons and facts between the lede and the stats, such as an author and a date. */
		meta?: Snippet;
		stats?: readonly PageStat[];
		title: string;
	}

	let { class: classNames, controls, extras, hideLedeOnPhone = false, lede, meta, stats, title }: Props = $props();
</script>

<!-- The negative margin pulls the header into the empty band the layout's `<main>` padding leaves under the fixed nav pill (74 px tall on desktop):
     the title sits ~22 px under it, and the page container above has no top padding of its own. -->
<header class={['-mt-4 flex flex-col gap-x-8 gap-y-3 border-b border-gold-400/25 pb-4 lg:-mt-8 lg:flex-row lg:items-end lg:justify-between', classNames]}>
	<div class="min-w-0">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<h1 class="m-0 text-3xl font-bold text-white md:text-4xl">{title}</h1>
			{@render extras?.()}
		</div>
		<p class={['mt-1 text-sm text-gray-300', hideLedeOnPhone && 'max-md:sr-only']}>{lede}</p>
		{@render meta?.()}
		{#if stats?.length}
			<ul class="mt-2.5 flex list-none flex-wrap gap-2 p-0" role="list">
				{#each stats as { icon: Icon, label, title: hover, value } (label)}
					<li class="flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-800/70 px-3 py-1 text-sm" title={hover}>
						<Icon class="size-4 shrink-0 text-gold-400" />
						<span class="font-semibold text-white tabular-nums">{value}</span>
						<span class="text-gray-400">{label}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
	{#if controls}
		<div class="max-lg:w-full lg:shrink-0">{@render controls()}</div>
	{/if}
</header>
