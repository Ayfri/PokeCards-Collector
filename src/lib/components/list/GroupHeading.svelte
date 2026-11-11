<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		/** The fold chevron of a `<details>` section: it turns with the `group/section` of the enclosing element. */
		chevron?: boolean;
		class?: ClassValue;
		icon?: LucideIcon;
		/** Small grey facts after the name, already formatted and joined by a dot. */
		meta?: readonly string[];
		name: string;
		/** Right-aligned in gold, such as the total value of the group. */
		value?: string;
	}

	let { chevron = false, class: classNames, icon: Icon, meta = [], name, value }: Props = $props();
</script>

<!-- The one heading of a group of tiles (a series of sets, a generation of Pokémon, a Trainer section): one line, so the three lists look alike. The figures sit
     beside the `<h2>`, not in it, which keeps the name short for the outline and for crawlers. -->
<div class={['mb-4 flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-gray-700 pb-2', classNames]}>
	{#if chevron}
		<ChevronDownIcon class="size-6 shrink-0 -rotate-90 text-gold-400 transition-transform group-open/section:rotate-0" />
	{/if}
	{#if Icon}
		<Icon class="size-6 shrink-0 text-gold-400" />
	{/if}
	<h2 class="text-xl font-bold text-gold-400 md:text-2xl">{name}</h2>
	{#if meta.length}
		<p class="flex flex-wrap gap-x-2 text-sm text-gray-400 tabular-nums">
			{#each meta as item, index (item)}
				{#if index}<span aria-hidden="true">·</span>{/if}
				<span>{item}</span>
			{/each}
		</p>
	{/if}
	{#if value}
		<p class="ml-auto text-sm text-gold-400 tabular-nums">{value}</p>
	{/if}
</div>
