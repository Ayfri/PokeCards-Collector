<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import type { PageData } from './$types';
	import { formatDate, formatEuros } from '#helpers/format.ts';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import FilterBar from '#components/filters/FilterBar.svelte';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SortControl from '#components/filters/SortControl.svelte';
	import PageTitle from '#components/PageTitle.svelte';
	import TextInput from '#components/filters/TextInput.svelte';
	import { persistedRecord } from '#stores/persisted.svelte.ts';
	import type { SetWithPrice } from '#lib/types.js';
	import SetLogo from '#components/SetLogo.svelte';
	import LanguageSwitch from '#components/LanguageSwitch.svelte';
	import { catalogueRoutes, CATALOGUES } from '#helpers/catalogues.ts';
	import { groupSetTiles, setCardCount, setPath, type SetTile } from '#helpers/card-utils.ts';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const catalogue = $derived(CATALOGUES[data.catalogueLanguage]);

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

	/** The field shows every keystroke, the filter only follows the debounced `searchTerm`: each change redraws the tiles and their logos. */
	let searchInput = $state('');
	let searchTerm = $state('');

	const typedSets = $derived(data.setsWithPrices ?? []);

	function setSearchTerm(value: string) {
		searchTerm = value;
	}

	const sortDirection = $derived(shownSort.direction === 'desc' ? -1 : 1);
	/** localStorage can hold a sort value from an older build that `COMPARATORS` has no key for, so it falls back to `releaseDate`. */
	const comparator = $derived(COMPARATORS[shownSort.value] ?? COMPARATORS.releaseDate);

	/** Tiles are grouped before the search, so a sub-set found by name shows up as a chip of its parent's tile. Grouping runs once per data, not per sort. */
	const tiles = $derived(groupSetTiles(typedSets));

	/** One lowercase text per tile, built once per data; a name and a code are joined by a newline, which a search term cannot hold. */
	const haystacks = $derived(new Map(tiles.map(tile => [tile, tile.sets.map(set => `${set.name}\n${set.ptcgoCode ?? ''}`).join('\n').toLowerCase()])));

	/** A tile sorts by its own set (a kit's sums). */
	const sortedTiles = $derived(tiles.toSorted((a, b) => comparator(a.set, b.set) * sortDirection));

	const filteredTiles = $derived.by(() => {
		const term = searchTerm.toLowerCase();
		return term ? sortedTiles.filter(tile => haystacks.get(tile)?.includes(term)) : sortedTiles;
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
	<div class="mb-8 flex flex-col sm:flex-row sm:flex-wrap sm:gap-4 items-center justify-between">
		<div class="flex flex-col items-center gap-2 sm:items-start xl:flex-row xl:items-center xl:gap-4" transition:fly={{ delay: 200, duration: 400, y: 50 }}>
			<PageTitle title={`${catalogue.routeCode ? `${catalogue.adjective} ` : ''}Pokémon TCG Sets`} />
			<LanguageSwitch language={data.catalogueLanguage} paths={catalogueRoutes('setsRoute')} />
		</div>

		<div class="max-sm:w-full" transition:fly={{ delay: 250, duration: 500, y: 50 }}>
			<FilterBar>
				{#snippet search()}
					<TextInput
						applyOnMount
						bind:value={searchInput}
						clearable
						icon={SearchIcon}
						id="setSearch"
						label="Search"
						onDebouncedInput={setSearchTerm}
						placeholder="Search sets..."
					/>
				{/snippet}
				{#snippet sort()}
					<SortControl
						bind:sortDirection={setsSort.direction}
						bind:sortValue={setsSort.value}
						icon={ArrowUpDownIcon}
						options={[
							{ label: 'Code', value: 'code' },
							{ label: 'Name', value: 'name' },
							{ label: 'Total Cards', value: 'cardCount' },
							{ label: 'Total Value', value: 'totalPrice' },
							{ label: 'Release Date', value: 'releaseDate' }
						]}
					/>
				{/snippet}
			</FilterBar>
		</div>
	</div>
	<hr class="gold-rule my-4 border-0" transition:fade={{ delay: 250, duration: 400 }} />

	<p class="text-gray-300 mb-6" transition:fade={{ delay: 250, duration: 400 }}>
		Sets are collections of cards that are released together.<br>
		<span class="text-sm">Showing {shownSetCount} of {typedSets.length} sets.</span>
	</p>

	<div transition:fly={{ delay: 400, duration: 400, y: 50 }}>
		{#each seriesKeys as series, index (series)}
			{@const seriesSets = groupedTiles[series].flatMap(tile => tile.sets)}
			<div class="mb-8">
				<div class="mb-4">
					<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
						<h2 class="text-xl font-bold text-gold-400 md:text-2xl">{series}</h2>
						<p class="flex items-center gap-1.5 whitespace-nowrap text-sm text-gray-300" title="Release years"><span aria-hidden="true" class="icon-calendar-days size-3.5 shrink-0"></span> {yearSpan(seriesSets)}</p>
						<p class="whitespace-nowrap text-sm text-gray-400">{seriesSets.length} sets</p>
						<p class="ml-auto whitespace-nowrap text-sm text-gold-400">{formatEuros(seriesSets.reduce((acc, set) => acc + set.totalPrice, 0))}</p>
					</div>
					<hr class="w-full border-t border-gray-700 my-2" />
				</div>
				
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" in:fly={{ delay: 200 * index, duration: 500, y: 50 }}>
					{#each groupedTiles[series] as tile, position (tile.set.setId)}
						{@const set = tile.set}
						<div class="card-tile overflow-hidden h-full flex flex-col">
							<!-- A kit has no set page of its own: its halves are linked by the chips, so the tile body is not a link. -->
							<svelte:element
								class="flex flex-1 flex-col"
								href={tile.kit ? undefined : setPath(set, catalogue)}
								this={tile.kit ? 'div' : 'a'}
								title={tile.kit ? undefined : `Browse every card in ${set.name}`}
							>
								<div class="h-36 bg-gray-900 flex items-center justify-center p-4 {NO_IMAGES ? 'hidden' : ''}">
									<SetLogo class="max-h-full object-contain" eager={index === 0 && position < 4} {set}>
										{#snippet fallback()}<span aria-hidden="true" class="icon-layers size-14 text-gray-600"></span>{/snippet}
									</SetLogo>
								</div>
								<div class="p-4 flex-1 flex flex-col">
									<h2 class="text-lg font-semibold text-white">{set.name}</h2>
									<div class="flex justify-between mt-2 text-sm text-gray-400">
										<span class="flex items-center gap-1.5" title="Cards in this set"><span aria-hidden="true" class="icon-layers size-3.5 shrink-0"></span> {setCardCount(set)} cards</span>
										<span class="flex items-center gap-1.5 text-gold-400" title="Cardmarket value of a complete set"><span aria-hidden="true" class="icon-circle-euro size-3.5 shrink-0"></span> {formatEuros(set.totalPrice)}</span>
									</div>
									<div class="flex justify-between mt-1 text-sm text-gray-400">
										<span class="flex items-center gap-1.5" title="Release date"><span aria-hidden="true" class="icon-calendar-days size-3.5 shrink-0"></span> {formatDate(set.releaseDate)}</span>
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
											href={setPath(part.set, catalogue)}
											title={`Browse every card in ${part.set.name}`}
										>{part.label} · {setCardCount(part.set)} cards</a>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
