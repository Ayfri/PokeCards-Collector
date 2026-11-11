<script lang="ts">
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import SearchXIcon from '@lucide/svelte/icons/search-x';

	interface Props {
		onPick: (setId: string) => void;
		term: string;
	}

	let { onPick, term }: Props = $props();

	const needle = $derived(term.trim().toLowerCase());
	const sets = $derived(needle ? binderCards.sets.filter(set => set.name.toLowerCase().includes(needle)) : binderCards.sets);
</script>

<div class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
	{#each sets as set (set.setId)}
		<button
			class="group focus-ring flex shrink-0 items-center gap-3 rounded-lg border border-gray-700 bg-gray-900/40 px-2 py-1.5 text-left text-sm transition-all hover:border-gold-400 hover:bg-gray-700/60 motion-safe:hover:-translate-y-px"
			onclick={() => onPick(set.setId)}
			type="button"
		>
			<span class="flex size-8 shrink-0 items-center justify-center">
				{#if set.symbol}<img alt="" class="max-h-full max-w-full object-contain" loading="lazy" src={set.symbol} />{/if}
			</span>
			<span class="min-w-0 flex-1">
				<span class="block truncate">{set.name}</span>
				<span class="block text-xs text-gray-400 tabular-nums">{set.releaseDate.slice(0, 4)} - {set.total} cards</span>
			</span>
			<ChevronRightIcon class="shrink-0 text-gray-500 transition-colors group-hover:text-gold-400" size={16} />
		</button>
	{:else}
		<div class="flex flex-col items-center gap-3 p-4 text-center text-sm text-gray-400">
			<SearchXIcon class="size-10 text-gray-600" />
			<p>{binderCards.sets.length ? 'No set matches the search.' : 'Loading the sets...'}</p>
		</div>
	{/each}
</div>
