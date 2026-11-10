<script lang="ts">
	import { cardPath } from '#helpers/card-utils.ts';
	import type { Language } from '#helpers/catalogues.ts';
	import { formatEuros } from '#helpers/format.ts';
	import type { ChecklistEntry } from '#helpers/grid-payload.ts';
	import type { Set } from '#lib/types.js';

	interface Props {
		entries: ChecklistEntry[];
		language: Language;
		/** The set every entry belongs to: with each entry's number and name it gives the card page, which the entries do not carry. */
		set: Pick<Set, 'name' | 'setId'>;
	}

	let { entries, language, set }: Props = $props();
</script>

<!-- The virtual grid draws nothing on the server, so this folded list is the only card list in the HTML: every card of the set as a
     link with its number and price. It stays in the page once the grid loads, so crawlers and visitors read the same content. -->
{#if entries.length}
	<details class="mx-4 mb-2 shrink-0 rounded-lg bg-gray-800/60 text-sm text-gray-300 lg:mx-10">
		<summary class="cursor-pointer px-3 py-1.5 font-semibold text-gold-400 select-none">Checklist ({entries.length} cards)</summary>
		<ol class="max-h-64 columns-1 gap-x-8 overflow-y-auto px-3 pb-2 sm:columns-2 lg:columns-3 xl:columns-4">
			{#each entries as entry (entry.cardCode)}
				<li class="flex break-inside-avoid justify-between gap-2 border-b border-gray-700/60 py-0.5">
					<a class="truncate transition-colors hover:text-gold-400" href={cardPath(language, { localId: entry.localId, name: entry.name, setId: set.setId, setName: set.name })}>
						<span class="text-gray-500 tabular-nums">{entry.localId}</span> {entry.name}
					</a>
					<span class="shrink-0 tabular-nums">{entry.price ? formatEuros(entry.price) : '-'}</span>
				</li>
			{/each}
		</ol>
	</details>
{/if}
