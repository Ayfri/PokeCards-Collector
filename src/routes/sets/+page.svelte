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
	import { CATALOGUES } from '#helpers/catalogues.ts';
	import { groupSetTiles, setCardCount, setPath, type SetTile } from '#helpers/card-utils.ts';

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

	const typedSets = $derived(data.setsWithPrices ?? []);

	function setSearchTerm(value: string) {
		searchTerm = value;
	}

	const sortDirection = $derived(shownSort.direction === 'desc' ? -1 : 1);
	/** localStorage can hold a sort value from an older build that `COMPARATORS` has no key for, so it falls back to `releaseDate`. */
	const comparator = $derived(COMPARATORS[shownSort.value] ?? COMPARATORS.releaseDate);

	/** Tiles are grouped before the search, so a sub-set found by name shows up as a chip of its parent's tile. A tile sorts by its own set (a kit's sums). */
	const sortedTiles = $derived(groupSetTiles(typedSets).sort((a, b) => comparator(a.set, b.set) * sortDirection));

	const filteredTiles = $derived.by(() => {
		const term = searchTerm.toLowerCase();
		return term
			? sortedTiles.filter(tile => tile.sets.some(set => set.name.toLowerCase().includes(term) || set.ptcgoCode?.toLowerCase().includes(term)))
			: sortedTiles;
	});

	const groupedTiles = $derived(filteredTiles.reduce((acc, tile) => {
		const series = tile.set.series || 'Other';
		acc[series] ??= [];
		acc[series].push(tile);
		return acc;
	}, {} as Record<string, SetTile[]>));

	/** Series are ordered by their first set, except when sorting by name, where the series name is what the user reads. */
	const seriesKeys = $derived(Object.keys(groupedTiles).sort((a, b) => {
		if (shownSort.value === 'name') return a.localeCompare(b) * sortDirection;

		const [firstTileA] = groupedTiles[a];
		const [firstTileB] = groupedTiles[b];
		if (!firstTileA || !firstTileB) return 0;
		return comparator(firstTileA.set, firstTileB.set) * sortDirection;
	}));

	const shownSetCount = $derived(filteredTiles.reduce((count, tile) => count + tile.sets.length, 0));

	/** The release years a group spans, a single year when all its sets came out the same year. */
	function yearSpan(sets: SetWithPrice[]): string {
		const years = sets.map(set => new Date(set.releaseDate).getFullYear());
		const [first, last] = [Math.min(...years), Math.max(...years)];
		return first === last ? `${first}` : `${first} - ${last}`;
	}
</script>

<div class="container mx-auto px-4 pt-2 pb-8">
	<div class="mb-8 flex flex-col sm:flex-row items-center justify-between">
		<div transition:fly={{ y: 50, duration: 400, delay: 200 }}>
			<PageTitle title="Pokémon TCG Sets" />
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
	<hr class="gold-rule my-4 border-0" transition:fade={{ duration: 400, delay: 250 }} />

	<p class="text-gray-300 mb-6" transition:fade={{ duration: 400, delay: 250 }}>
		Sets are collections of cards that are released together.<br>
		<span class="text-sm">Showing {shownSetCount} of {typedSets.length} sets.</span>
	</p>

	<div transition:fly={{ y: 50, duration: 400, delay: 400 }}>
		{#each seriesKeys as series, index (series)}
			{@const seriesSets = groupedTiles[series].flatMap(tile => tile.sets)}
			<div class="mb-8">
				<div class="mb-4">
					<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
						<h2 class="text-xl font-bold text-gold-400 md:text-2xl">{series}</h2>
						<p class="flex items-center gap-1.5 whitespace-nowrap text-sm text-gray-300" title="Release years"><CalendarDaysIcon size={14} /> {yearSpan(seriesSets)}</p>
						<p class="whitespace-nowrap text-sm text-gray-400">{seriesSets.length} sets</p>
						<p class="ml-auto whitespace-nowrap text-sm text-gold-400">{formatEuros(seriesSets.reduce((acc, set) => acc + set.totalPrice, 0))}</p>
					</div>
					<hr class="w-full border-t border-gray-700 my-2" />
				</div>
				
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" in:fly={{ y: 50, duration: 500, delay: 200 * index }}>
					{#each groupedTiles[series] as tile (tile.set.setId)}
						{@const set = tile.set}
						<div in:fly={{ y: 20, duration: 300, delay: 50 }} class="h-full">
							<div class="card-tile overflow-hidden h-full flex flex-col">
								<!-- A kit has no set page of its own: its halves are linked by the chips, so the tile body is not a link. -->
								<svelte:element
									this={tile.kit ? 'div' : 'a'}
									class="flex flex-1 flex-col"
									href={tile.kit ? undefined : setPath(set, CATALOGUES.en)}
									title={tile.kit ? undefined : `Browse every card in ${set.name}`}
								>
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
								</svelte:element>
								{#if tile.parts.length}
									<div class="flex flex-wrap gap-2 px-4 pb-4">
										{#each tile.parts as part (part.set.setId)}
											<a
												class="rounded-full border border-gold-500/40 bg-gray-700/60 px-2.5 py-0.5 text-xs text-gray-200 transition-colors hover:border-gold-400 hover:text-gold-300"
												href={setPath(part.set, CATALOGUES.en)}
												title={`Browse every card in ${part.set.name}`}
											>{part.label} · {setCardCount(part.set)} cards</a>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
