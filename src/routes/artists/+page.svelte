<script lang="ts">
	import type { PageData } from './$types';
	import type { ArtistWithCards } from './+page.server';
	import { NO_IMAGES } from '$lib/images';
	import SortControl from '@components/filters/SortControl.svelte';
	import PageTitle from '@components/PageTitle.svelte';
	import CardImage from '@components/card/CardImage.svelte';
	import TextInput from '@components/filters/TextInput.svelte';
	import { artistsSortDirection, artistsSortValue, type ArtistsSortValue } from '$stores/artistsSort';
	import { fade, fly } from 'svelte/transition';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import CircleEuroIcon from '@lucide/svelte/icons/circle-euro';
	import LayersIcon from '@lucide/svelte/icons/layers';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	/** Totals reach five figures, so cents are noise: they are dropped past 100 EUR. */
	function formatEuros(value: number): string {
		return `${value.toLocaleString('en-US', { maximumFractionDigits: value >= 100 ? 0 : 2 })} €`;
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

	const sortedArtists = $derived(sortArtistList(data.artists, $artistsSortValue, $artistsSortDirection));
	const filteredArtists = $derived(filterArtistList(sortedArtists, searchTerm));
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
                    debounceFunction={setSearchTerm}
                />
            </div>
			<SortControl
				bind:sortDirection={$artistsSortDirection}
				bind:sortValue={$artistsSortValue}
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

	<hr class="w-full border-t-[3px] border-gold-400 my-4" transition:fade={{ duration: 400, delay: 300 }} />

	<p class="text-gray-400 mb-6" transition:fade={{ duration: 400, delay: 300 }}>
		Artists are the creators of the cards, they are responsible for the design and artwork of the cards.<br>
		<span class="text-sm">Showing {filteredArtists.length} of {sortedArtists.length} artists.</span>
	</p>

	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" in:fly={{ y: 50, duration: 400, delay: 400 }}>
		{#each filteredArtists as artist (artist.name)}
			<div in:fly={{ y: 20, duration: 300, delay: 50 }}>
					<a href="/cards-list?artist={encodeURIComponent(artist.name.toLowerCase())}" class="block h-full" title={`Browse every card illustrated by ${artist.name}`}>
					<div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-[-4px] border border-transparent hover:border-gold-400 h-full flex flex-col">
						<div class="bg-gray-900 p-2 {NO_IMAGES ? 'hidden' : ''}">
							<div class="flex justify-center items-center gap-1 h-40 overflow-hidden perspective-[500px]">
								{#if artist.showcaseCards.length > 0}
									{#each artist.showcaseCards as card, index (card.cardCode)}
										<div
											class="h-full flex-1 relative {index > 0 ? '-ml-16' : ''}"
											style="z-index: {3 - index}"
										>
											<CardImage
												alt="{card.name} by {artist.name}"
												imageUrl={card.image}
												types={card.types}
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
								<span class="flex items-center gap-1.5 text-gold-400" title="Cards illustrated by this artist"><LayersIcon size={14} /> {artist.totalCards} {artist.totalCards === 1 ? "card" : "cards"}</span>
								<span class="flex items-center gap-1.5" title="First and last year this artist was printed"><CalendarDaysIcon size={14} /> {artist.firstReleaseYear} - {artist.lastReleaseYear}</span>
							</div>
							<div class="mt-1 text-sm text-gray-400 flex justify-between">
								<span class="flex items-center gap-1.5 text-green-400 font-semibold" title="Cardmarket value of every card by this artist"><CircleEuroIcon size={14} /> {formatEuros(artist.totalValue)}</span>
								<span title="Average value of one card by this artist">{formatEuros(artist.averageValue)} avg</span>
							</div>
						</div>
					</div>
				</a>
			</div>
		{/each}
	</div>
</div>
