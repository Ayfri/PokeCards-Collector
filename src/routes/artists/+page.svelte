<script lang="ts">
	import type { PageData } from './$types';
	import { NO_IMAGES } from '$lib/images';
	import SortControl from '$lib/components/filters/SortControl.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';

	export let data: PageData;

	// Group cards by artist
	$: artistsWithCards = data.artists.map(artist => {
		// Find all cards by this artist
		const cards = data.allCards.filter(card => card.artist === artist);

		// Sort cards by price (most expensive first)
		const sortedByPrice = [...cards].sort((a, b) => {
			// Treat null or undefined prices as 0
			const priceA = a.price ?? 0;
			const priceB = b.price ?? 0;
			return priceB - priceA;
		});

		// Take the top 3 most expensive cards for display
		const showcaseCards = sortedByPrice.slice(0, 3);

		// Count total cards
		const totalCards = cards.length;

		return {
			name: artist,
			showcaseCards,
			totalCards
		};
	});

	// Sorting state
	let sortDirection: 'asc' | 'desc' = 'asc'; // Default to A-Z
	let sortValue: 'name' | 'totalCards' = 'name'; // Default sort by name

	$: sortedArtists = [...artistsWithCards].sort((a, b) => {
		if (sortValue === 'name') {
			return sortDirection === 'desc'
				? b.name.localeCompare(a.name)
				: a.name.localeCompare(b.name);
		} else { // 'totalCards'
			return sortDirection === 'desc'
				? b.totalCards - a.totalCards
				: a.totalCards - b.totalCards;
		}
	});
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex flex-col sm:flex-row items-center justify-between">
		<PageTitle title="Pokémon TCG Artists" />

		<div class="flex items-center gap-2">
			<SortControl
				bind:sortDirection={sortDirection}
				bind:sortValue={sortValue}
				options={[
					{ value: 'name', label: 'Name' },
					{ value: 'totalCards', label: 'Total Cards' }
				]}
			/>
		</div>
	</div>
	<hr class="w-full border-t-[3px] border-white my-4" />

	<p class="text-gray-400 mb-6">
		Showing {sortedArtists.length} Pokémon TCG artists.
	</p>

	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
		{#each sortedArtists as artist}
			<a href="/?artist={encodeURIComponent(artist.name.toLowerCase())}" class="block h-full">
				<div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all hover:translate-y-[-4px] border border-transparent hover:border-gray-600 h-full flex flex-col">
					<div class="bg-gray-700 p-2 {NO_IMAGES ? 'hidden' : ''}">
						<div class="flex justify-center items-center gap-1 h-40 overflow-hidden perspective-500">
							{#if artist.showcaseCards.length > 0}
								{#each artist.showcaseCards as card, index}
									<div
										class="h-full flex-1 relative {index > 0 ? '-ml-16' : ''}"
										style="z-index: {3 - index}"
									>
										<img
											src={card.image}
											alt="{card.name} by {artist.name}"
											class="h-full w-auto max-w-none object-contain mx-auto transform-gpu"
											style="
												transform: rotate({index * 10}deg) translateY({index * -5}px);
												filter: drop-shadow({index * 2}px {index * 3}px 10px rgba(0, 0, 0, {0.7 - index * 0.15}));
											"
											loading="lazy"
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
						<div class="mt-2 text-sm text-gray-400">
							<span>{artist.totalCards} {artist.totalCards === 1 ? 'card' : 'cards'}</span>
						</div>
					</div>
				</div>
			</a>
		{/each}
	</div>
</div>
