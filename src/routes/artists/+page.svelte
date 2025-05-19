<script lang="ts">
	import type { PageData } from './$types';
	import { NO_IMAGES } from '$lib/images';
	import SortControl from '@components/filters/SortControl.svelte';
	import PageTitle from '@components/PageTitle.svelte';
	import CardImage from '@components/card/CardImage.svelte';
	import TextInput from '@components/filters/TextInput.svelte';
	import type { Card, Set } from '$lib/types';
	import { debounce } from '$helpers/debounce';
	import { buildSetLookupMap } from '$helpers/set-utils';
	import { parseCardCode } from '$helpers/card-utils';
	import { fade, fly } from 'svelte/transition';

	export let data: PageData;

	interface ArtistWithCards {
		firstReleaseDate: Date;
		lastReleaseDate: Date;
		name: string;
		showcaseCards: Card[];
		totalCards: number;
	}

	// Sorting state
	let sortDirection: 'asc' | 'desc' = 'asc'; // Default to A-Z
	let sortValue: 'firstReleaseDate' | 'lastReleaseDate' | 'name' | 'totalCards' = 'name'; // Default sort by name

    // Search state
    let searchTerm = '';

    const debouncedSetSearchTerm = debounce((value: string) => {
        searchTerm = value;
    }, 300);
	// --- Data Processing Functions ---

	// Groups cards by artist.
	// Assumes FullCard, PokemonSet, PriceData types are imported from '$lib/types'.
	function groupCardsByArtist(allCards: PageData['allCards']): Map<string, NonNullable<PageData['allCards']>[number][]> {
		const map = new Map<string, NonNullable<PageData['allCards']>[number][]>();
		if (allCards) {
			for (const card of allCards) {
				if (card.artist) {
					if (!map.has(card.artist)) {
						map.set(card.artist, []);
					}
					map.get(card.artist)!.push(card);
				}
			}
		}
		return map;
	}

	// Calculates release dates for all cards.
	function calculateCardReleaseDates(
		allCards: PageData['allCards'],
		sets: PageData['sets']
	): Map<string, Date> {
		const dates = new Map<string, Date>();
		if (!allCards || !sets) {
			return dates;
		}

		const setLookup = buildSetLookupMap(sets); // Build this once

		for (const card of allCards) {
			if (!card || !card.cardCode) {
				// Ensure card.cardCode exists before setting a default date for it
				if (card && card.cardCode) {
					dates.set(card.cardCode, new Date('0000-01-01'));
				}
				continue;
			}

			const parsed = parseCardCode(card.cardCode);
			if (!parsed || !parsed.setCode) {
				dates.set(card.cardCode, new Date('0000-01-01')); // Default for unparsable/no setCode
				continue;
			}

			const targetSetCodeLower = parsed.setCode.toLowerCase();
			const foundSet = setLookup.get(targetSetCodeLower);

			dates.set(card.cardCode, foundSet ? new Date(foundSet.releaseDate) : new Date('0000-01-01'));
		}
		return dates;
	}

	// Processes details for a single artist.
	function processArtistDetails(
		artistName: string,
		artistCardsList: NonNullable<PageData['allCards']>[number][], // Represents FullCard[]
		cardReleaseDatesMap: Map<string, Date>,
		prices: PageData['prices']
	): ArtistWithCards {
		const sortedByPrice = [...artistCardsList].sort((a, b) => {
			const priceA = prices?.[a.cardCode]?.simple ?? 0;
			const priceB = prices?.[b.cardCode]?.simple ?? 0;
			return priceB - priceA;
		});

		// ArtistWithCards.showcaseCards is Card[], FullCard[] is assignable to Card[]
		const showcaseCards: Card[] = sortedByPrice.slice(0, 3);
		const totalCards = artistCardsList.length;

		let firstReleaseDate = new Date('9999-01-01');
		let lastReleaseDate = new Date('0000-01-01'); // This can result in an Invalid Date

		if (artistCardsList.length > 0) {
			for (const card of artistCardsList) {
				const cardDate = cardReleaseDatesMap.get(card.cardCode);
				if (cardDate) { // Ensure cardDate was found
					// For firstReleaseDate:
					if (cardDate < firstReleaseDate) {
						firstReleaseDate = cardDate;
					}
					// For lastReleaseDate:
					if (cardDate > lastReleaseDate || isNaN(lastReleaseDate.getTime())) {
						if (!isNaN(cardDate.getTime())) { // Only update if cardDate itself is valid
							lastReleaseDate = cardDate;
						}
					}
				}
			}
		}

		return {
			name: artistName,
			showcaseCards,
			totalCards,
			firstReleaseDate,
			lastReleaseDate
		};
	}

	// Creates a list of artists with their processed card details.
	function createArtistsWithCardsList(
		artistNames: PageData['artists'], // This is string[] based on +page.server.ts
		cardsByArtist: Map<string, NonNullable<PageData['allCards']>[number][]>,
		cardReleaseDatesMap: Map<string, Date>,
		prices: PageData['prices']
	): ArtistWithCards[] {
		// data.artists from +page.server.ts is string[], so artistNames should always be defined.
		// However, (data.artists || []) was used before, suggesting caution.
		// If artistNames can truly be undefined from PageData, this check is useful.
		if (!artistNames) {
			return [];
		}
		return artistNames.map(name => {
			const currentArtistCards = cardsByArtist.get(name) || [];
			return processArtistDetails(name, currentArtistCards, cardReleaseDatesMap, prices);
		});
	}

	// Sorts the list of artists.
	function sortArtistList(
		artists: ArtistWithCards[],
		value: typeof sortValue, // 'name' | 'totalCards' | 'firstReleaseDate' | 'lastReleaseDate'
		direction: typeof sortDirection // 'asc' | 'desc'
	): ArtistWithCards[] {
		return [...artists].sort((a, b) => {
			let comparison = 0;
			switch (value) {
				case 'name':
					comparison = a.name.localeCompare(b.name);
					break;
				case 'totalCards':
					comparison = a.totalCards - b.totalCards;
					break;
				case 'firstReleaseDate':
				case 'lastReleaseDate': {
					const timeA = a[value].getTime();
					const timeB = b[value].getTime();
					const aIsNaN = isNaN(timeA);
					const bIsNaN = isNaN(timeB);

					if (aIsNaN && bIsNaN) comparison = 0;
					else if (aIsNaN) comparison = 1; // NaNs go "last"
					else if (bIsNaN) comparison = -1; // NaNs go "last"
					else comparison = timeA - timeB;
					break;
				}
				// No default needed as `value` is a constrained type
			}
			return direction === 'desc' ? comparison * -1 : comparison;
		});
	}

	// Filters the list of artists by search term.
	function filterArtistList(artists: ArtistWithCards[], term: string): ArtistWithCards[] {
		if (!term.trim()) { // Return all artists if search term is empty or whitespace
			return artists;
		}
		const lowerCaseTerm = term.toLowerCase();
		return artists.filter(artist =>
			artist.name.toLowerCase().includes(lowerCaseTerm)
		);
	}

	// --- Reactive Data Derivations ---
	$: cardsByArtistMap = groupCardsByArtist(data.allCards);
	$: cardReleaseDates = calculateCardReleaseDates(data.allCards, data.sets);

	$: artistsWithCards = createArtistsWithCardsList(
		data.artists,
		cardsByArtistMap,
		cardReleaseDates,
		data.prices
	);

	$: sortedArtists = sortArtistList(artistsWithCards, sortValue, sortDirection);
	$: filteredArtists = filterArtistList(sortedArtists, searchTerm);
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex flex-col sm:flex-row items-center justify-between">
		<div transition:fly={{ y: 50, duration: 400, delay: 200 }}>
			<PageTitle title="Artists" />
		</div>

		<div class="flex items-center gap-2" transition:fly={{ y: 50, duration: 500, delay: 250 }}>
            <div class="w-48">
                <TextInput
                    id="artistSearch"
                    label="Search"
                    bind:value={searchTerm}
                    placeholder="Search artists..."
                    debounceFunction={debouncedSetSearchTerm}
                />
            </div>
			<SortControl
				bind:sortDirection={sortDirection}
				bind:sortValue={sortValue}
				options={[
					{ value: 'name', label: 'Name' },
					{ value: 'totalCards', label: 'Total Cards' },
					{ value: 'firstReleaseDate', label: 'First Release Date' },
					{ value: 'lastReleaseDate', label: 'Last Release Date' }
				]}
			/>
		</div>
	</div>

	<hr class="w-full border-t-[3px] border-gold-400 my-4" transition:fade={{ duration: 400, delay: 300 }} />

	<p class="text-gray-400 mb-6" transition:fade={{ duration: 400, delay: 300 }}>
		Artists are the creators of the cards, they are responsible for the design and artwork of the cards.<br>
		<span class="text-sm">Showing {filteredArtists.length} of {sortedArtists.length} artists.</span>
	</p>

	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" in:fly={{ y: 50, duration: 400, delay: 400 }}>
		{#each filteredArtists as artist (artist.name)}
			<div in:fly={{ y: 20, duration: 300, delay: 50 }}>
				<a href="/cards-list?artist={encodeURIComponent(artist.name.toLowerCase())}" class="block h-full">
					<div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-[-4px] border border-transparent hover:border-gold-400 h-full flex flex-col">
						<div class="bg-gray-900 p-2 {NO_IMAGES ? 'hidden' : ''}">
							<div class="flex justify-center items-center gap-1 h-40 overflow-hidden perspective-500">
								{#if artist.showcaseCards.length > 0}
									{#each artist.showcaseCards as card, index}
										<div
											class="h-full flex-1 relative {index > 0 ? '-ml-16' : ''}"
											style="z-index: {3 - index}"
										>
											<CardImage
												alt="{card.name} by {artist.name}"
												imageUrl={card.image}
												highRes={false}
												lazy={true}
												class="h-full w-auto max-w-none object-contain mx-auto transform-gpu"
												style="
													transform: rotate({index * 10}deg) translateY({index * -5}px);
													filter: drop-shadow({index * 2}px {index * 3}px 10px rgba(0, 0, 0, {0.7 - index * 0.15}));
												"
											/>
										</div>
									{/each}
								{:else}
									<div class="text-gray-500 text-center">No cards available</div>
								{/if}
							</div>
						</div>
						<div class="p-4 flex-1 flex flex-col">
							<h2 class="text-lg font-semibold text-white">{artist.name}</h2>
							<div class="mt-2 text-sm text-gray-400 flex justify-between">
								<span class="text-gold-400">{artist.totalCards} {artist.totalCards === 1 ? 'card' : 'cards'}</span>
								<span>{artist.firstReleaseDate.getFullYear()} - {artist.lastReleaseDate.getFullYear()}</span>
							</div>
						</div>
					</div>
				</a>
			</div>
		{/each}
	</div>
</div>

<style>
	.perspective-500 {
		perspective: 500px;
	}
</style>
