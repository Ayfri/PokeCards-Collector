<script lang="ts">
	import type { PageData } from './$types';
	import type { TrainerGroupEntry } from './+page.server';
	import PageTitle from '#components/PageTitle.svelte';
	import SortControl from '#components/filters/SortControl.svelte';
	import TextInput from '#components/filters/TextInput.svelte';
	import TrainerGroupTile from '#components/list/TrainerGroupTile.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let searchTerm = $state('');
	let sortBy = $state('name');
	let sortOrder: 'asc' | 'desc' = $state('asc');

	const compare: Record<string, (a: TrainerGroupEntry, b: TrainerGroupEntry) => number> = {
		cardCount: (a, b) => a.cardCount - b.cardCount,
		name: (a, b) => a.name.localeCompare(b.name),
	};

	/** Sections the search empties are dropped, and every other one is sorted on its own. */
	const sections = $derived.by(() => {
		const term = searchTerm.trim().toLowerCase();
		const direction = sortOrder === 'asc' ? 1 : -1;

		return data.sections
			.map(section => ({
				groups: section.groups.filter(group => group.name.toLowerCase().includes(term)).sort((a, b) => direction * (compare[sortBy] ?? compare.name)(a, b)),
				label: section.label,
			}))
			.filter(section => section.groups.length > 0);
	});
</script>

<div class="container mx-auto px-4 py-8 text-white">
	<div class="flex justify-between items-center mb-4">
		<div class="shrink-0">
			<PageTitle title="Trainers & Energy" />
		</div>
		<div class="flex items-end gap-4">
			<TextInput
				id="trainer-search"
				label="Search Trainer and Energy cards"
				labelClass="sr-only"
				bind:value={searchTerm}
				placeholder="Search Trainers & Energy..."
			/>
			<SortControl
				bind:sortValue={sortBy}
				bind:sortDirection={sortOrder}
				options={[
					{ value: 'name', label: 'Name' },
					{ value: 'cardCount', label: 'Card Count' }
				]}
			/>
		</div>
	</div>
	<div class="w-full max-w-200 mx-auto my-6 h-1 bg-linear-to-r from-transparent via-gold-400 to-transparent"></div>

	{#each sections as section (section.label)}
		<section class="mt-8">
			<h2 class="text-xl md:text-2xl font-bold text-gold-400 mb-4">
				{section.label}
				<span class="text-sm font-normal text-gray-400">({section.groups.length})</span>
			</h2>
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 align-items-start align-content-start">
				{#each section.groups as group (group.cardCode)}
					<TrainerGroupTile {group} />
				{/each}
			</div>
		</section>
	{:else}
		<p class="mt-12 text-center text-gray-400">No Trainer or Energy card matches "{searchTerm}".</p>
	{/each}
</div>
