<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { TrainerGroupEntry } from './+page.server.ts';
	import { formatEuros, pluralize } from '#helpers/format.ts';
	import GroupHeading from '#components/list/GroupHeading.svelte';
	import PageHeader, { type PageStat } from '#components/PageHeader.svelte';
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import Disc3Icon from '@lucide/svelte/icons/disc-3';
	import FilterBar from '#components/filters/FilterBar.svelte';
	import GemIcon from '@lucide/svelte/icons/gem';
	import LandmarkIcon from '@lucide/svelte/icons/landmark';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import PackageIcon from '@lucide/svelte/icons/package';
	import RocketIcon from '@lucide/svelte/icons/rocket';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SortControl from '#components/filters/SortControl.svelte';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import SquareStackIcon from '@lucide/svelte/icons/square-stack';
	import TagsIcon from '@lucide/svelte/icons/tags';
	import TextInput from '#components/filters/TextInput.svelte';
	import TrainerGroupTile from '#components/list/TrainerGroupTile.svelte';
	import ScrollButton from '#components/list/ScrollButton.svelte';
	import TypeSymbolDefs from '#components/card/TypeSymbolDefs.svelte';
	import UserIcon from '@lucide/svelte/icons/user';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import { collection } from '#stores/collection.svelte.ts';
	import { persistedRecord } from '#stores/persisted.svelte.ts';
	import { onMount } from 'svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	/** The labels of `SUBTYPE_SECTIONS` plus the two catch-alls of the load; a label this map does not know still gets an icon. */
	const SECTION_ICONS: Record<string, LucideIcon> = {
		'Basic Energy': ZapIcon,
		'Items': PackageIcon,
		'Other Energy': ZapIcon,
		'Other Trainers': LayersIcon,
		"Rocket's Secret Machines": RocketIcon,
		'Special Energy': SparklesIcon,
		'Stadiums': LandmarkIcon,
		'Supporters': UserIcon,
		'Technical Machines': Disc3Icon,
		'Tools': WrenchIcon,
	};

	/** Shorter jump link labels, so the nine chips fit one row from 1440 px. */
	const JUMP_LABELS: Record<string, string> = {
		"Rocket's Secret Machines": "Rocket's Machines",
		'Technical Machines': 'TMs',
	};

	/** Totals reach five figures for a section, so cents are noise and are dropped from 100 EUR up. */
	const euros = (value: number) => formatEuros(value, value >= 100 ? 0 : 2);
	const sectionId = (label: string) => `section-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;

	let scrollY = $state(0);
	const DEFAULT_VIEW = { folded: [] as string[], search: '', sortBy: 'name', sortOrder: 'asc' as 'asc' | 'desc' };
	/** `persistedRecord` saves on property assignment, so `folded` is always reassigned, never mutated in place. */
	const view = persistedRecord('trainers-view', DEFAULT_VIEW);

	/**
	 * The server renders `DEFAULT_VIEW`, and hydration never patches an `img` `src`, so rendering the saved view during hydration would pair
	 * tiles with another tile's scan. The saved view applies once mounted.
	 */
	let mounted = $state(false);
	/** Starts empty like the server's field and takes the saved search once mounted, so the clear button does not flip during hydration. */
	let searchInput = $state('');
	onMount(() => {
		mounted = true;
		searchInput = view.search;
	});
	const shown = $derived(mounted ? view : DEFAULT_VIEW);

	function toggleSection(label: string, open: boolean) {
		view.folded = open ? view.folded.filter(folded => folded !== label) : [...new Set([...view.folded, label])];
	}

	/** A jump link into a folded section opens it first, or the browser would scroll to a bare heading. */
	function jumpTo(label: string) {
		if (shown.folded.includes(label)) toggleSection(label, true);
	}

	const compare: Record<string, (a: TrainerGroupEntry, b: TrainerGroupEntry) => number> = {
		cardCount: (a, b) => a.cardCount - b.cardCount,
		name: (a, b) => a.name.localeCompare(b.name),
		price: (a, b) => a.price - b.price,
	};

	/** The field shows every keystroke, the saved and applied search follows the debounced value: each change redraws the tiles and writes localStorage. */
	function setSearch(value: string) {
		view.search = value;
	}

	/** Every section is sorted on its own, on a sort change only: the search keeps that order, since filtering drops groups without moving any. */
	const sortedSections = $derived.by(() => {
		const direction = shown.sortOrder === 'asc' ? 1 : -1;
		const compareBy = compare[shown.sortBy] ?? compare.name;

		return data.sections.map(section => ({
			groups: section.groups.toSorted((a, b) => direction * compareBy(a, b)),
			label: section.label,
		}));
	});

	/** Lowercased once per data, not once per group per search. */
	const lowerNames = $derived(new Map(data.sections.flatMap(section => section.groups).map(group => [group, group.name.toLowerCase()])));

	/** Distinct prints of a group the viewer owns, 0 for a logged-out visitor: the codes are read from the store, so the server HTML never carries it. */
	const ownedOf = (group: TrainerGroupEntry) => (group.codes ?? [group.cardCode]).reduce((owned, code) => owned + (collection.count(code) > 0 ? 1 : 0), 0);

	/** Sections the search empties are dropped. The figures of a section follow the search, like its count. */
	const sections = $derived.by(() => {
		const term = shown.search.trim().toLowerCase();

		return sortedSections
			.map(section => {
				const groups = section.groups.filter(group => lowerNames.get(group)?.includes(term));
				return {
					groups,
					label: section.label,
					owned: groups.reduce((owned, group) => owned + ownedOf(group), 0),
					prints: groups.reduce((prints, group) => prints + group.cardCount, 0),
					top: groups.reduce((top, group) => Math.max(top, group.price), 0),
				};
			})
			.filter(section => section.groups.length > 0);
	});

	const totalGroups = $derived(data.sections.reduce((count, section) => count + section.groups.length, 0));
	const shownGroups = $derived(sections.reduce((count, section) => count + section.groups.length, 0));
	const countHint = $derived(shownGroups === totalGroups ? undefined : `${shownGroups.toLocaleString('en-US')} of ${totalGroups.toLocaleString('en-US')}`);

	/** Totals of the whole list, not of the search. */
	const stats = $derived.by((): PageStat[] => {
		const groups = data.sections.flatMap(section => section.groups);

		return [
			{ icon: LayersIcon, label: 'cards', title: 'Distinct Trainer and Energy cards, all prints of one card counted once', value: totalGroups.toLocaleString('en-US') },
			{ icon: SquareStackIcon, label: 'prints', title: 'Every printing of those cards', value: groups.reduce((prints, group) => prints + group.cardCount, 0).toLocaleString('en-US') },
			{ icon: TagsIcon, label: 'sections', value: data.sections.length.toLocaleString('en-US') },
			{ icon: GemIcon, label: 'priciest print', title: 'Cardmarket price of the most valuable print', value: euros(groups.reduce((top, group) => Math.max(top, group.price), 0)) },
		];
	});
</script>

<svelte:window bind:scrollY />

<div class="container mx-auto px-4 pb-8 text-white">
	<PageHeader
		class="mb-3"
		lede="Supporters, Items, Stadiums, Tools and Energy, each with all its prints. Jump to a section or search."
		{stats}
		title="Trainers & Energy"
	>
		{#snippet controls()}
			<FilterBar>
				{#snippet search()}
					<TextInput
						applyOnMount
						bind:value={searchInput}
						clearable
						hint={countHint}
						icon={SearchIcon}
						id="trainer-search"
						label="Search"
						onDebouncedInput={setSearch}
						placeholder="Search cards..."
					/>
				{/snippet}
				{#snippet sort()}
					<SortControl
						bind:sortDirection={view.sortOrder}
						bind:sortValue={view.sortBy}
						icon={ArrowUpDownIcon}
						options={[
							{ label: 'Name', value: 'name' },
							{ label: 'Card Count', value: 'cardCount' },
							{ label: 'Most Valuable', value: 'price' }
						]}
					/>
				{/snippet}
			</FilterBar>
		{/snippet}
	</PageHeader>

	<TypeSymbolDefs />

	{#if sections.length > 1}
		<nav aria-label="Sections" class="jump-links mt-3">
			{#each sections as section (section.label)}
				<a class="jump-link" href="#{sectionId(section.label)}" onclick={() => jumpTo(section.label)}>
					{JUMP_LABELS[section.label] ?? section.label}
					<span class="font-normal tabular-nums opacity-70">{section.groups.length.toLocaleString('en-US')}</span>
				</a>
			{/each}
		</nav>
	{/if}

	{#each sections as section, sectionIndex (section.label)}
		<!-- A native `<details>`: folding needs no state, and a folded section's tiles are not rendered by the browser.
		     Its group is named, since a bare `group` would fire every tile's `group-hover` on hovering the section.
		     The fixed header covers the top of the viewport, so `scroll-mt-28` lands a jump link's heading below it. -->
		<details class={['group/section scroll-mt-28', sectionIndex ? 'mt-8' : 'mt-4']} id={sectionId(section.label)} ontoggle={event => toggleSection(section.label, event.currentTarget.open)} open={!shown.folded.includes(section.label)}>
			<summary class="cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
				<GroupHeading
					chevron
					icon={SECTION_ICONS[section.label] ?? LayersIcon}
					meta={[pluralize(section.groups.length, 'card'), `${section.owned ? `${section.owned.toLocaleString('en-US')} / ` : ''}${pluralize(section.prints, 'print')}`]}
					name={section.label}
					value={section.top ? `up to ${euros(section.top)}` : undefined}
				/>
			</summary>
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
				{#each section.groups as group (group.cardCode)}
					<TrainerGroupTile {group} owned={ownedOf(group)} />
				{/each}
			</div>
		</details>
	{:else}
		<p class="mt-12 text-center text-gray-400">No Trainer or Energy card matches "{shown.search}".</p>
	{/each}
</div>

<ScrollButton direction="up" onclick={() => window.scrollTo({ behavior: 'smooth', top: 0 })} visible={scrollY > 100} />
<ScrollButton direction="down" onclick={() => window.scrollTo({ behavior: 'smooth', top: document.body.scrollHeight })} />
