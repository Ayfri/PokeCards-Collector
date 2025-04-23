<script lang="ts">
	import type { PageData } from './$types';
	import { NO_IMAGES } from '$lib/images';
	import SortControl from '$lib/components/filters/SortControl.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import CardImage from '$lib/components/card/CardImage.svelte';
	import TextInput from '$lib/components/filters/TextInput.svelte';
	import type { Card } from '$lib/types';
	import { findSetByCardCode } from '$helpers/set-utils';

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
    let debounceTimeout: number;

    function debounce(fn: Function, delay: number) {
        return (...args: any[]) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = window.setTimeout(() => {
                fn(...args);
            }, delay);
        };
    }

    const debouncedSetSearchTerm = debounce((value: string) => {
        searchTerm = value;
    }, 300);

	// Group cards by artist
	$: artistsWithCards = data.artists.map(artist => {
		// Find all cards by this artist
		const cards = data.allCards.filter(card => card.artist === artist);

		// Sort cards by price (most expensive first)
		const sortedByPrice = [...cards].sort((a, b) => {
			// Treat null or undefined prices as 0
			const priceA = data.prices[a.cardCode]?.simple ?? 0;
			const priceB = data.prices[b.cardCode]?.simple ?? 0;
			return priceB - priceA;
		});

		// Take the top 3 most expensive cards for display
		const showcaseCards = sortedByPrice.slice(0, 3);

		// Count total cards
		const totalCards = cards.length;

		const firstReleaseDate = cards.reduce((earliest, card) => {
			const set = findSetByCardCode(card.cardCode, data.sets);
			const cardReleaseDate = set ? new Date(set.releaseDate) : new Date('0000-01-01');
			return cardReleaseDate < earliest ? cardReleaseDate : earliest;
		}, new Date('9999-01-01'));

		const lastReleaseDate = cards.reduce((latest, card) => {
			const set = findSetByCardCode(card.cardCode, data.sets);
			const cardReleaseDate = set ? new Date(set.releaseDate) : new Date('0000-01-01');
			return cardReleaseDate > latest ? cardReleaseDate : latest;
		}, new Date('0000-01-01'));

		return {
			name: artist,
			showcaseCards,
			totalCards,
			firstReleaseDate,
			lastReleaseDate
		} as ArtistWithCards;
	});

	$: sortedArtists = [...artistsWithCards].sort((a, b) => {
		if (sortValue === 'name') {
			return sortDirection === 'desc'
				? b.name.localeCompare(a.name)
				: a.name.localeCompare(b.name);
		} else if (sortValue === 'totalCards') {
			return sortDirection === 'desc'
				? b.totalCards - a.totalCards
				: a.totalCards - b.totalCards;
		} else if (sortValue === 'firstReleaseDate') {
			return sortDirection === 'desc'
				? b.firstReleaseDate.getTime() - a.firstReleaseDate.getTime()
				: a.firstReleaseDate.getTime() - b.firstReleaseDate.getTime();
		} else if (sortValue === 'lastReleaseDate') {
			return sortDirection === 'desc'
				? b.lastReleaseDate.getTime() - a.lastReleaseDate.getTime()
				: a.lastReleaseDate.getTime() - b.lastReleaseDate.getTime();
		}
		return 0;
	});
    
    // Filter artists based on search term
    $: filteredArtists = searchTerm 
        ? sortedArtists.filter(artist => 
            artist.name.toLowerCase().includes(searchTerm.toLowerCase())
          ) 
        : sortedArtists;
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex flex-col sm:flex-row items-center justify-between">
		<PageTitle title="Artists" />

		<div class="flex items-center gap-2">
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
	<hr class="w-full border-t-[3px] border-gold-400 my-4" />

	<p class="text-gray-400 mb-6">
		Artists are the creators of the cards, they are responsible for the design and artwork of the cards.<br>
		<span class="text-sm">Showing {filteredArtists.length} of {sortedArtists.length} artists.</span>
	</p>

	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
		{#each filteredArtists as artist}
			<a href="/?artist={encodeURIComponent(artist.name.toLowerCase())}" class="block h-full">
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
		{/each}
	</div>
</div>

<style>
	.perspective-500 {
		perspective: 500px;
	}
</style>
