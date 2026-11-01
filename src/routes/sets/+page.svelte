<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import type { PageData } from './$types';
	import { formatEuros } from '#helpers/format.ts';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import SortControl from '#components/filters/SortControl.svelte';
	import PageTitle from '#components/PageTitle.svelte';
	import TextInput from '#components/filters/TextInput.svelte';
	import { persistedRecord } from '#stores/persisted.svelte.ts';
	import type { SetWithPrice } from '#lib/types.js';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import CircleEuroIcon from '@lucide/svelte/icons/circle-euro';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import SetLogo from '#components/SetLogo.svelte';
	import { setCardCount } from '#helpers/card-utils.ts';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	type SetSortValue = 'cardCount' | 'code' | 'name' | 'releaseDate' | 'totalPrice';

	/** Every comparator sorts ascending, and the direction flips the result so no comparator needs a descending branch. */
	const COMPARATORS: Record<SetSortValue, (a: SetWithPrice, b: SetWithPrice) => number> = {
		cardCount: (a, b) => setCardCount(a) - setCardCount(b),
		code: (a, b) => (a.ptcgoCode || '').localeCompare(b.ptcgoCode || ''),
		name: (a, b) => a.name.localeCompare(b.name),
		releaseDate: (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime(),
		totalPrice: (a, b) => a.totalPrice - b.totalPrice,
	};

	const DEFAULT_SORT = {
		direction: 'desc' as 'asc' | 'desc',
		value: 'releaseDate' as SetSortValue,
	};
	const setsSort = persistedRecord('sets-sort', DEFAULT_SORT);

	/**
	 * The server renders `DEFAULT_SORT`, and hydration never patches an `img` `src`, so sorting by the saved value during hydration would pair
	 * logos with another set's name. The saved sort applies once mounted.
	 */
	let mounted = $state(false);
	onMount(() => { mounted = true; });
	const shownSort = $derived(mounted ? setsSort : DEFAULT_SORT);

	let searchTerm = $state('');

	const typedSets = $derived(data.setsWithPrices);

	function setSearchTerm(value: string) {
		searchTerm = value;
	}

	const sortDirection = $derived(shownSort.direction === 'desc' ? -1 : 1);
	/** localStorage can hold a sort value from an older build that `COMPARATORS` has no key for, so it falls back to `releaseDate`. */
	const comparator = $derived(COMPARATORS[shownSort.value] ?? COMPARATORS.releaseDate);
	const sortedSets = $derived([...(typedSets ?? [])].sort((a, b) => comparator(a, b) * sortDirection));

	const filteredSets = $derived(searchTerm
		? sortedSets.filter(set =>
				set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				(set.ptcgoCode && set.ptcgoCode.toLowerCase().includes(searchTerm.toLowerCase()))
			)
		: sortedSets);

	const groupedSets = $derived(filteredSets.reduce((acc, set) => {
		const series = set.series || 'Other';
		acc[series] ??= [];
		acc[series].push(set);
		return acc;
	}, {} as Record<string, SetWithPrice[]>));

	/** Series are ordered by their first set, except when sorting by name, where the series name is what the user reads. */
	const seriesKeys = $derived(Object.keys(groupedSets).sort((a, b) => {
		if (shownSort.value === 'name') return a.localeCompare(b) * sortDirection;

		const [firstSetA] = groupedSets[a];
		const [firstSetB] = groupedSets[b];
		if (!firstSetA || !firstSetB) return 0;
		return comparator(firstSetA, firstSetB) * sortDirection;
	}));

	/** The release years a group spans, a single year when all its sets came out the same year. */
	function yearSpan(sets: SetWithPrice[]): string {
		const years = sets.map(set => new Date(set.releaseDate).getFullYear());
		const [first, last] = [Math.min(...years), Math.max(...years)];
		return first === last ? `${first}` : `${first} - ${last}`;
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex flex-col sm:flex-row items-center justify-between">
		<div transition:fly={{ y: 50, duration: 400, delay: 200 }}>
			<PageTitle title="Sets" />
		</div>

		<div class="flex items-center gap-2" transition:fly={{ y: 50, duration: 500, delay: 250 }}>
			<div class="w-48">
				<TextInput
					id="setSearch"
					label="Search"
					bind:value={searchTerm}
					placeholder="Search sets..."
					debounceFunction={setSearchTerm}
				/>
			</div>
			<SortControl
				bind:sortDirection={setsSort.direction}
				bind:sortValue={setsSort.value}
				options={[
					{ value: 'code', label: 'Code' },
					{ value: 'name', label: 'Name' },
					{ value: 'cardCount', label: 'Total Cards' },
					{ value: 'totalPrice', label: 'Total Value' },
					{ value: 'releaseDate', label: 'Release Date' }
				]}
			/>
		</div>
	</div>
	<hr class="w-full border-t-[3px] border-gold-400 my-4" transition:fade={{ duration: 400, delay: 250 }} />

	<p class="text-gray-400 mb-6" transition:fade={{ duration: 400, delay: 250 }}>
		Sets are collections of cards that are released together.<br>
		<span class="text-sm">Showing {filteredSets.length} of {sortedSets.length} sets.</span>
	</p>

	<div transition:fly={{ y: 50, duration: 400, delay: 400 }}>
		{#each seriesKeys as series, index (series)}
			<div class="mb-8">
				<div class="mb-4">
					<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
						<h2 class="text-xl font-bold text-gold-400">{series}</h2>
						<p class="flex items-center gap-1.5 whitespace-nowrap text-sm text-gray-300" title="Release years"><CalendarDaysIcon size={14} /> {yearSpan(groupedSets[series])}</p>
						<p class="whitespace-nowrap text-sm text-gray-400">{groupedSets[series].length} sets</p>
						<p class="ml-auto whitespace-nowrap text-sm text-gold-400">{formatEuros(groupedSets[series].reduce((acc, set) => acc + set.totalPrice, 0))}</p>
					</div>
					<hr class="w-full border-t border-gray-700 my-2" />
				</div>
				
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" in:fly={{ y: 50, duration: 500, delay: 200 * index }}>
					{#each groupedSets[series] as set (set.name)}
						<div in:fly={{ y: 20, duration: 300, delay: 50 }}>
							<a href="/cards-list?set={encodeURIComponent(set.name)}" class="block h-full" title={`Browse every card in ${set.name}`}>
								<div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-[-4px] border border-transparent hover:border-gold-400 h-full flex flex-col">
									<div class="h-36 bg-gray-900 flex items-center justify-center p-4 {NO_IMAGES ? 'hidden' : ''}">
										<SetLogo class="max-h-full object-contain" {set}>
											{#snippet fallback()}<LayersIcon class="text-gray-600" size={56} />{/snippet}
										</SetLogo>
									</div>
									<div class="p-4 flex-1 flex flex-col">
										<h2 class="text-lg font-semibold text-white">{set.name}</h2>
										<div class="flex justify-between mt-2 text-sm text-gray-400">
											<span class="flex items-center gap-1.5" title="Cards in this set"><LayersIcon size={14} /> {setCardCount(set)} cards</span>
											<span class="flex items-center gap-1.5 text-gold-400" title="Cardmarket value of a complete set"><CircleEuroIcon size={14} /> {formatEuros(set.totalPrice)}</span>
										</div>
										<div class="flex justify-between mt-1 text-sm text-gray-400">
											<span class="flex items-center gap-1.5" title="Release date"><CalendarDaysIcon size={14} /> {new Date(set.releaseDate).toLocaleDateString()}</span>
											{#if set.ptcgoCode}
												<span class="px-2 py-1 bg-gray-700 rounded-sm text-gold-400 text-xs" title="PTCGO set code">{set.ptcgoCode}</span>
											{:else}
												<span class="px-2 py-1 bg-transparent">&nbsp;</span>
											{/if}
										</div>
									</div>
								</div>
							</a>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
