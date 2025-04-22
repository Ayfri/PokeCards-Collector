<script lang="ts">
	import type { PageData } from './$types';
	import { NO_IMAGES } from '$lib/images';
	
	export let data: PageData;
	
	// Regrouper les cartes par artiste
	$: artistsWithCards = data.artists.map(artist => {
		// Trouver toutes les cartes de cet artiste
		const cards = data.allCards.filter(card => card.artist === artist);
		
		// Trier les cartes par prix (du plus cher au moins cher)
		const sortedByPrice = [...cards].sort((a, b) => {
			// Traiter les prix null ou undefined comme 0
			const priceA = a.price ?? 0;
			const priceB = b.price ?? 0;
			return priceB - priceA;
		});
		
		// Prendre les 3 cartes les plus chères pour l'affichage
		const showcaseCards = sortedByPrice.slice(0, 3);
		
		// Compter le nombre total de cartes
		const totalCards = cards.length;
		
		return {
			name: artist,
			showcaseCards,
			totalCards
		};
	});
	
	// Trier les artistes par ordre alphabétique par défaut
	let sortOrder = 'az'; // 'az' ou 'za' ou 'cards'
	
	$: sortedArtists = [...artistsWithCards].sort((a, b) => {
		if (sortOrder === 'az') {
			return a.name.localeCompare(b.name);
		} else if (sortOrder === 'za') {
			return b.name.localeCompare(a.name);
		} else { // 'cards'
			return b.totalCards - a.totalCards;
		}
	});
	
	function changeSortOrder(newOrder: string): void {
		sortOrder = newOrder;
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex flex-col sm:flex-row items-center justify-between">
		<h1 class="text-3xl font-bold mb-4 sm:mb-0">Pokémon TCG Artists</h1>
		
		<div class="flex items-center gap-2">
			<button 
				on:click={() => changeSortOrder('az')}
				class="px-4 py-2 rounded-full transition-colors {sortOrder === 'az' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'}"
			>
				A-Z
			</button>
			<button 
				on:click={() => changeSortOrder('za')}
				class="px-4 py-2 rounded-full transition-colors {sortOrder === 'za' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'}"
			>
				Z-A
			</button>
			<button 
				on:click={() => changeSortOrder('cards')}
				class="px-4 py-2 rounded-full transition-colors {sortOrder === 'cards' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'}"
			>
				Most Cards
			</button>
		</div>
	</div>
	
	<p class="text-gray-400 mb-6">
		Showing {sortedArtists.length} Pokémon TCG artists
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