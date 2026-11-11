<script lang="ts" module>
	import { persistedRecord } from '#stores/persisted.svelte.ts';

	type ArtistsSortValue = 'averageValue' | 'firstReleaseDate' | 'lastReleaseDate' | 'name' | 'totalCards' | 'totalValue';

	const DEFAULT_SORT = {
		direction: 'asc' as 'asc' | 'desc',
		value: 'name' as ArtistsSortValue,
	};
	const artistsSort = persistedRecord('artists-sort', DEFAULT_SORT);
</script>

<script lang="ts">
	import type { PageData } from './$types';
	import type { ArtistWithCards } from './+page.server';
	import { formatEuros } from '#helpers/format.ts';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import CircleEuroIcon from '@lucide/svelte/icons/circle-euro';
	import FilterBar from '#components/filters/FilterBar.svelte';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SortControl from '#components/filters/SortControl.svelte';
	import SquareStackIcon from '@lucide/svelte/icons/square-stack';
	import PageHeader, { type PageStat } from '#components/PageHeader.svelte';
	import CardImage from '#components/card/CardImage.svelte';
	import TextInput from '#components/filters/TextInput.svelte';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	/** Totals reach five figures, so cents are noise and are dropped from 100 EUR up. */
	const euros = (value: number) => formatEuros(value, value >= 100 ? 0 : 2);

	/** Cards drawn on the preview stack of an artist card. */
	const SHOWCASE_SIZE = 3;

	/** The tiles of the first row on a wide screen load their scans right away, the rest wait until they scroll near. */
	const FIRST_ROW = 4;

	/** Width the plate of a scanless card is laid out at, then scaled into the ~116 px slot: below 200 px the plate drops its details. */
	const PLATE_WIDTH = 245;

	/** Scans that failed to load: their card leaves the stack and the next candidate replaces it. */
	const failedImages = new SvelteSet<string>();

	/** The first candidates whose scan still loads, else the top ones drawn as "No artwork" plates. */
	function showcase(artist: ArtistWithCards): ArtistWithCards['showcaseCards'] {
		const loadable = artist.showcaseCards.filter(card => !failedImages.has(card.image)).slice(0, SHOWCASE_SIZE);
		return loadable.length ? loadable : artist.showcaseCards.slice(0, SHOWCASE_SIZE).map(card => ({ ...card, image: '' }));
	}

	/** The field shows every keystroke, the filter only follows the debounced `searchTerm`: each change redraws up to 411 tiles with three scans each. */
	let searchInput = $state('');
	let searchTerm = $state('');

	function setSearchTerm(value: string) {
		searchTerm = value;
	}

	function sortArtistList(artists: ArtistWithCards[], value: ArtistsSortValue, direction: 'asc' | 'desc'): ArtistWithCards[] {
		const sortKey = value === 'firstReleaseDate' ? 'firstReleaseYear' : value === 'lastReleaseDate' ? 'lastReleaseYear' : value;

		return [...artists].sort((a, b) => {
			const comparison = sortKey === 'name'
				? a.name.localeCompare(b.name)
				: a[sortKey] - b[sortKey];
			return direction === 'desc' ? -comparison : comparison;
		});
	}

	/** Lowercased once per data, not once per artist per search. */
	const lowerNames = $derived(new Map(data.artists.map(artist => [artist, artist.name.toLowerCase()])));

	function filterArtistList(artists: ArtistWithCards[], term: string): ArtistWithCards[] {
		if (!term.trim()) return artists;
		const lowerCaseTerm = term.toLowerCase();
		return artists.filter(artist => lowerNames.get(artist)?.includes(lowerCaseTerm));
	}

	/**
	 * The server renders `DEFAULT_SORT`, and hydration never patches an `img` `src`, so sorting by the saved value during hydration would pair
	 * scans with another artist's name. The saved sort applies once mounted.
	 */
	let mounted = $state(false);
	onMount(() => { mounted = true; });
	const shownSort = $derived(mounted ? artistsSort : DEFAULT_SORT);

	const sortedArtists = $derived(sortArtistList(data.artists, shownSort.value, shownSort.direction));
	const filteredArtists = $derived(filterArtistList(sortedArtists, searchTerm));
	const countHint = $derived(filteredArtists.length === data.artists.length ? undefined : `${filteredArtists.length.toLocaleString('en-US')} of ${data.artists.length.toLocaleString('en-US')}`);

	/** Totals of the whole list, not of the search. A year of 0 means the artist has no dated set. */
	const stats = $derived.by((): PageStat[] => {
		const first = Math.min(...data.artists.map(artist => artist.firstReleaseYear || Infinity));
		const last = Math.max(...data.artists.map(artist => artist.lastReleaseYear));

		return [
			{ icon: PaletteIcon, label: 'artists', value: data.artists.length.toLocaleString('en-US') },
			{ icon: SquareStackIcon, label: 'illustrated cards', title: 'Cards with a credited illustrator', value: data.artists.reduce((count, artist) => count + artist.totalCards, 0).toLocaleString('en-US') },
			{ icon: CircleEuroIcon, label: 'total value', title: 'Cardmarket value of every illustrated card', value: euros(data.artists.reduce((total, artist) => total + artist.totalValue, 0)) },
			...(Number.isFinite(first) && last ? [{ icon: CalendarDaysIcon, label: 'printed', title: 'Years the artwork was printed', value: first === last ? `${first}` : `${first} - ${last}` }] : []),
		];
	});
</script>

<div class="container mx-auto px-4 pb-8">
	<PageHeader
		class="mb-4"
		lede="The illustrators behind the cards: sort by cards drawn or value, then open one to browse their work."
		{stats}
		title="Card Artists"
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
						id="artistSearch"
						label="Search"
						onDebouncedInput={setSearchTerm}
						placeholder="Search artists..."
					/>
				{/snippet}
				{#snippet sort()}
					<SortControl
						bind:sortDirection={artistsSort.direction}
						bind:sortValue={artistsSort.value}
						icon={ArrowUpDownIcon}
						options={[
							{ label: 'Name', value: 'name' },
							{ label: 'Total Cards', value: 'totalCards' },
							{ label: 'Total Value', value: 'totalValue' },
							{ label: 'Average Card Price', value: 'averageValue' },
							{ label: 'First Release Date', value: 'firstReleaseDate' },
							{ label: 'Last Release Date', value: 'lastReleaseDate' }
						]}
					/>
				{/snippet}
			</FilterBar>
		{/snippet}
	</PageHeader>

	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" in:fly={{ delay: 400, duration: 400, y: 50 }}>
		{#each filteredArtists as artist, artistIndex (artist.name)}
			<!-- Offscreen tiles skip style and layout work until they scroll near, since most of the 411 are below the fold. The tile carries the containment itself:
			     on a wrapper, its paint clip would cut the tile's top border when the hover lifts it. -->
			<a
				class="card-tile overflow-hidden flex flex-col [contain-intrinsic-size:auto_290px] [content-visibility:auto]"
				href="/cards-list?artist={encodeURIComponent(artist.name.toLowerCase())}"
				title={`Browse every card illustrated by ${artist.name}`}
			>
				<div class="bg-gray-900 p-2 {NO_IMAGES ? 'hidden' : ''}">
					<div class="flex justify-center items-center gap-1 h-40 overflow-hidden perspective-[500px]">
						{#each showcase(artist) as card, index (card.cardCode)}
							<div
								class="h-full flex-1 relative {index > 0 ? '-ml-16' : ''}"
								style="z-index: {3 - index}"
							>
								<CardImage
									alt="{card.name} by {artist.name}"
									card={card.plate?.card}
									class="h-full w-auto max-w-none object-contain mx-auto transform-gpu"
									imageUrl={card.image}
									lazy={artistIndex >= FIRST_ROW}
									lowRes
									onerror={() => failedImages.add(card.image)}
									plateWidth={PLATE_WIDTH}
									set={card.plate?.set}
									style="transform: rotate({index * 10}deg) translateY({index * -5}px); filter: drop-shadow({index * 2}px {index * 3}px 10px rgb(0 0 0 / {70 - index * 15}%))"
									types={card.types}
								/>
							</div>
						{/each}
					</div>
				</div>
				<div class="p-4 flex-1 flex flex-col">
					<h2 class="text-lg font-semibold text-white">{artist.name}</h2>
					<div class="mt-2 text-sm text-gray-400 flex justify-between">
						<span class="flex items-center gap-1.5 text-gold-400" title="Cards illustrated by this artist"><span aria-hidden="true" class="icon-layers size-3.5 shrink-0"></span> {artist.totalCards} {artist.totalCards === 1 ? "card" : "cards"}</span>
						<span class="flex items-center gap-1.5" title="First and last year this artist was printed"><span aria-hidden="true" class="icon-calendar-days size-3.5 shrink-0"></span> {artist.firstReleaseYear} - {artist.lastReleaseYear}</span>
					</div>
					<div class="mt-1 text-sm text-gray-400 flex justify-between">
						<span class="flex items-center gap-1.5 text-green-400 font-semibold" title="Cardmarket value of every card by this artist"><span aria-hidden="true" class="icon-circle-euro size-3.5 shrink-0"></span> {euros(artist.totalValue)}</span>
						<span title="Average value of one card by this artist">{euros(artist.averageValue)} avg</span>
					</div>
				</div>
			</a>
		{/each}
	</div>
</div>
