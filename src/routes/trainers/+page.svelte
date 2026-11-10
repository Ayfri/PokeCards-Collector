<script lang="ts">
	import type { PageData } from './$types';
	import type { TrainerGroupEntry } from './+page.server.ts';
	import PageTitle from '#components/PageTitle.svelte';
	import SortControl from '#components/filters/SortControl.svelte';
	import TextInput from '#components/filters/TextInput.svelte';
	import TrainerGroupTile from '#components/list/TrainerGroupTile.svelte';
	import ScrollButton from '#components/list/ScrollButton.svelte';
	import { persistedRecord } from '#stores/persisted.svelte.ts';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { onMount } from 'svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let scrollY = $state(0);
	const DEFAULT_VIEW = { folded: [] as string[], search: '', sortBy: 'name', sortOrder: 'asc' as 'asc' | 'desc' };
	/** `persistedRecord` saves on property assignment, so `folded` is always reassigned, never mutated in place. */
	const view = persistedRecord('trainers-view', DEFAULT_VIEW);

	/**
	 * The server renders `DEFAULT_VIEW`, and hydration never patches an `img` `src`, so rendering the saved view during hydration would pair
	 * tiles with another tile's scan. The saved view applies once mounted.
	 */
	let mounted = $state(false);
	onMount(() => { mounted = true; });
	const shown = $derived(mounted ? view : DEFAULT_VIEW);

	function toggleSection(label: string, open: boolean) {
		view.folded = open ? view.folded.filter(folded => folded !== label) : [...new Set([...view.folded, label])];
	}

	const compare: Record<string, (a: TrainerGroupEntry, b: TrainerGroupEntry) => number> = {
		cardCount: (a, b) => a.cardCount - b.cardCount,
		name: (a, b) => a.name.localeCompare(b.name),
	};

	/** Sections the search empties are dropped, and every other one is sorted on its own. */
	const sections = $derived.by(() => {
		const term = shown.search.trim().toLowerCase();
		const direction = shown.sortOrder === 'asc' ? 1 : -1;

		return data.sections
			.map(section => ({
				groups: section.groups.filter(group => group.name.toLowerCase().includes(term)).sort((a, b) => direction * (compare[shown.sortBy] ?? compare.name)(a, b)),
				label: section.label,
			}))
			.filter(section => section.groups.length > 0);
	});
</script>

<svelte:window bind:scrollY />

<div class="container mx-auto px-4 py-8 text-white">
	<div class="flex flex-wrap justify-between items-center gap-x-4 gap-y-6 mb-4">
		<div class="shrink-0">
			<PageTitle title="Trainers & Energy" />
		</div>
		<div class="flex items-end gap-4 w-full md:w-auto">
			<TextInput
				bind:value={view.search}
				id="trainer-search"
				label="Search Trainer and Energy cards"
				labelClass="sr-only"
				placeholder="Search Trainers & Energy..."
			/>
			<SortControl
				bind:sortDirection={view.sortOrder}
				bind:sortValue={view.sortBy}
				options={[
					{ label: 'Name', value: 'name' },
					{ label: 'Card Count', value: 'cardCount' }
				]}
			/>
		</div>
	</div>
	<div class="gold-rule my-6"></div>

	{#each sections as section (section.label)}
		<!-- A native `<details>`: folding needs no state, and a folded section's tiles are not rendered by the browser.
		     Its group is named, since a bare `group` would fire every tile's `group-hover` on hovering the section. -->
		<details class="group/section mt-8" ontoggle={event => toggleSection(section.label, event.currentTarget.open)} open={!shown.folded.includes(section.label)}>
			<summary class="mb-4 flex cursor-pointer list-none items-center gap-2 select-none [&::-webkit-details-marker]:hidden">
				<ChevronDownIcon class="size-6 shrink-0 -rotate-90 text-gold-400 transition-transform group-open/section:rotate-0" />
				<h2 class="text-xl md:text-2xl font-bold text-gold-400">
					{section.label}
					<span class="text-sm font-normal text-gray-400">({section.groups.length})</span>
				</h2>
			</summary>
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
				{#each section.groups as group (group.cardCode)}
					<TrainerGroupTile {group} />
				{/each}
			</div>
		</details>
	{:else}
		<p class="mt-12 text-center text-gray-400">No Trainer or Energy card matches "{shown.search}".</p>
	{/each}
</div>

<ScrollButton direction="up" onclick={() => window.scrollTo({ behavior: 'smooth', top: 0 })} visible={scrollY > 100} />
<ScrollButton direction="down" onclick={() => window.scrollTo({ behavior: 'smooth', top: document.body.scrollHeight })} />
