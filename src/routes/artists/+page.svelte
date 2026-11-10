<script lang="ts" module>
	import { persistedRecord } from '#stores/persisted.svelte.ts';

	type ArtistsSortValue = 'averageValue' | 'firstReleaseDate' | 'lastReleaseDate' | 'name' | 'totalCards' | 'totalValue';

	const artistsSort = persistedRecord('artists-sort', {
		direction: 'asc' as 'asc' | 'desc',
		value: 'name' as ArtistsSortValue,
	});
</script>

<script lang="ts">
	import type { PageData } from './$types';
	import type { ArtistWithCards } from './+page.server';
	import { formatEuros } from '#helpers/format.ts';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import SortControl from '#components/filters/SortControl.svelte';
	import PageTitle from '#components/PageTitle.svelte';
	import CardImage from '#components/card/CardImage.svelte';
	import TextInput from '#components/filters/TextInput.svelte';
	import { fade, fly } from 'svelte/transition';
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

	/** Scans that failed to load: their card leaves the stack and the next candidate replaces it. */
	const failedImages = new SvelteSet<string>();

	/** The first candidates whose scan still loads, else the top ones drawn as "No artwork" plates. */
	function showcase(artist: ArtistWithCards): ArtistWithCards['showcaseCards'] {
		const loadable = artist.showcaseCards.filter(card => !failedImages.has(card.image)).slice(0, SHOWCASE_SIZE);
		return loadable.length ? loadable : artist.showcaseCards.slice(0, SHOWCASE_SIZE).map(card => ({ ...card, image: '' }));
	}

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

	function filterArtistList(artists: ArtistWithCards[], term: string): ArtistWithCards[] {
		if (!term.trim()) return artists;
		const lowerCaseTerm = term.toLowerCase();
		return artists.filter(artist => artist.name.toLowerCase().includes(lowerCaseTerm));
	}

	const sortedArtists = $derived(sortArtistList(data.artists, artistsSort.value, artistsSort.direction));
	const filteredArtists = $derived(filterArtistList(sortedArtists, searchTerm));
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex flex-col sm:flex-row items-center justify-between">
		<div transition:fly={{ y: 50, duration: 400, delay: 200 }}>
			<PageTitle title="Card Artists" />
		</div>

		<div class="flex items-center gap-2" transition:fly={{ y: 50, duration: 500, delay: 250 }}>
            <div class="w-48">
                <TextInput
                    id="artistSearch"
                    label="Search"
                    bind:value={searchTerm}
                    placeholder="Search artists..."
                    debounceFunction={setSearchTerm}
                />
            </div>
			<SortControl
				bind:sortDirection={artistsSort.direction}
				bind:sortValue={artistsSort.value}
				options={[
					{ value: 'name', label: 'Name' },
					{ value: 'totalCards', label: 'Total Cards' },
					{ value: 'totalValue', label: 'Total Value' },
					{ value: 'averageValue', label: 'Average Card Price' },
					{ value: 'firstReleaseDate', label: 'First Release Date' },
					{ value: 'lastReleaseDate', label: 'Last Release Date' }
				]}
			/>
		</div>
	</div>

	<hr class="gold-rule my-4 border-0" transition:fade={{ duration: 400, delay: 300 }} />

	<p class="text-gray-300 mb-6" transition:fade={{ duration: 400, delay: 300 }}>
		Artists are the creators of the cards, they are responsible for the design and artwork of the cards.<br>
		<span class="text-sm">Showing {filteredArtists.length} of {sortedArtists.length} artists.</span>
	</p>

	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" in:fly={{ y: 50, duration: 400, delay: 400 }}>
		{#each filteredArtists as artist, artistIndex (artist.name)}
			<!-- Offscreen tiles skip style and layout work until they scroll near, since most of the 411 are below the fold. The tile carries the containment itself:
			     on a wrapper, its paint clip would cut the tile's top border when the hover lifts it. -->
			<a
				href="/cards-list?artist={encodeURIComponent(artist.name.toLowerCase())}"
				class="card-tile overflow-hidden flex flex-col [contain-intrinsic-size:auto_290px] [content-visibility:auto]"
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
									imageUrl={card.image}
									lazy={artistIndex >= FIRST_ROW}
									lowRes
									onerror={() => failedImages.add(card.image)}
									set={card.plate?.set}
									types={card.types}
									class="h-full w-auto max-w-none object-contain mx-auto transform-gpu"
									style="transform: rotate({index * 10}deg) translateY({index * -5}px); filter: drop-shadow({index * 2}px {index * 3}px 10px rgb(0 0 0 / {70 - index * 15}%))"
								/>
							</div>
						{/each}
					</div>
				</div>
				<div class="p-4 flex-1 flex flex-col">
					<h2 class="text-lg font-semibold text-white">{artist.name}</h2>
					<div class="mt-2 text-sm text-gray-400 flex justify-between">
						<span class="flex items-center gap-1.5 text-gold-400" title="Cards illustrated by this artist"><span class="icon-layers size-3.5 shrink-0" aria-hidden="true"></span> {artist.totalCards} {artist.totalCards === 1 ? "card" : "cards"}</span>
						<span class="flex items-center gap-1.5" title="First and last year this artist was printed"><span class="icon-calendar-days size-3.5 shrink-0" aria-hidden="true"></span> {artist.firstReleaseYear} - {artist.lastReleaseYear}</span>
					</div>
					<div class="mt-1 text-sm text-gray-400 flex justify-between">
						<span class="flex items-center gap-1.5 text-green-400 font-semibold" title="Cardmarket value of every card by this artist"><span class="icon-circle-euro size-3.5 shrink-0" aria-hidden="true"></span> {euros(artist.totalValue)}</span>
						<span title="Average value of one card by this artist">{euros(artist.averageValue)} avg</span>
					</div>
				</div>
			</a>
		{/each}
	</div>
</div>
