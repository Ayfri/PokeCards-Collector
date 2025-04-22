<script lang="ts">
	import type { PageData } from './$types';
	import { NO_IMAGES } from '$lib/images';
	
	export let data: PageData;
	
	// Sort sets by release date (newest first by default)
	$: sortedSets = [...data.sets].sort((a, b) => 
		new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
	);

	let sortOrder = 'newest'; // 'newest' or 'oldest'
	
	function toggleSortOrder() {
		sortOrder = sortOrder === 'newest' ? 'oldest' : 'newest';
		sortedSets = [...data.sets].sort((a, b) => {
			const aTime = new Date(a.releaseDate).getTime();
			const bTime = new Date(b.releaseDate).getTime();
			return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
		});
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex flex-col sm:flex-row items-center justify-between">
		<h1 class="text-3xl font-bold mb-4 sm:mb-0">Pokémon TCG Sets</h1>
		
		<button 
			on:click={toggleSortOrder}
			class="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
		>
			<span>Sort: {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}</span>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
				<path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12z" />
				<path d="M15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
			</svg>
		</button>
	</div>
	
	<p class="text-gray-400 mb-6">
		Showing {sortedSets.length} Pokémon TCG sets in {sortOrder === 'newest' ? 'descending' : 'ascending'} release order.
	</p>
	
	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
		{#each sortedSets as set}
			<a href="/?set={encodeURIComponent(set.name)}" class="block h-full">
				<div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all hover:translate-y-[-4px] border border-transparent hover:border-gray-600 h-full flex flex-col">
					<div class="h-36 bg-gray-700 flex items-center justify-center p-4 {NO_IMAGES ? 'hidden' : ''}">
						{#if set.logo}
							<img src={set.logo} alt="{set.name} logo" class="max-h-full object-contain" loading="lazy" />
						{:else}
							<div class="text-gray-500 text-center">No image available</div>
						{/if}
					</div>
					<div class="p-4 flex-1 flex flex-col">
						<h2 class="text-lg font-semibold text-white">{set.name}</h2>
						<div class="flex justify-between mt-2 text-sm text-gray-400">
							<span>{set.printedTotal} cards</span>
							<span>{new Date(set.releaseDate).toLocaleDateString()}</span>
						</div>
						<div class="mt-2 text-sm flex-grow flex items-end">
							{#if set.ptcgoCode}
								<span class="px-2 py-1 bg-gray-700 rounded text-gray-300">Code: {set.ptcgoCode}</span>
							{:else}
								<span class="px-2 py-1 bg-transparent">&nbsp;</span>
							{/if}
						</div>
					</div>
				</div>
			</a>
		{/each}
	</div>
</div> 