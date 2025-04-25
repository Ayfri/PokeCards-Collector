<script lang="ts">
	import { type Writable } from 'svelte/store';
	import Button from '$lib/components/filters/Button.svelte';
	import TrashIcon from 'lucide-svelte/icons/trash';
	
	export let cards: Writable<Array<{id: string; url: string}>>;
	
	// Handle drag start for stored cards
	function onDragStart(e: DragEvent, card: {id: string; url: string}) {
		if (!e.dataTransfer) return;
		
		e.dataTransfer.setData('text/plain', card.id);
		e.dataTransfer.setData('source-type', 'storage');
		e.dataTransfer.effectAllowed = 'copy';
	}
	
	// Remove card from storage
	function removeCard(id: string) {
		$cards = $cards.filter(card => card.id !== id);
	}
	
	// Clear all stored cards
	function clearStorage() {
		if (confirm('Are you sure you want to remove all stored cards?')) {
			$cards = [];
		}
	}
</script>

<div class="bg-gray-800 rounded-lg p-4 flex flex-col h-[calc(100%-88px)]">
	<div class="flex justify-between items-center mb-1">
		<h3 class="text-gold-400 text-lg">Storage ({$cards.length})</h3>
		
		{#if $cards.length > 0}
			<Button onClick={clearStorage} class="p-1">
				<TrashIcon size={14} />
			</Button>
		{/if}
	</div>
	
	<p class="text-xs text-gray-400 mb-3">
		Drag cards from here to position them in your binder grid.
	</p>
	
	<div class="overflow-y-auto flex-1 pr-1 -mr-1">
		{#if $cards.length === 0}
			<p class="text-gray-500 text-center py-4 text-sm">
				No cards in storage. Use the search bar at the top or the "Add set" button to add cards.
			</p>
		{:else}
			<div class="grid grid-cols-2 gap-2">
				{#each $cards as card}
					<div 
						class="relative aspect-[2/3] border-2 border-gray-700 rounded group transition-all duration-200 hover:border-gold-400"
						draggable="true"
						on:dragstart={(e) => onDragStart(e, card)}
					>
						<img 
							src={card.url} 
							alt="Pokémon card" 
							class="w-full h-full object-contain p-1"
							loading="lazy"
						/>
						<button 
							class="absolute top-1 right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
							on:click={() => removeCard(card.id)}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
								<path d="M18 6 6 18"></path>
								<path d="m6 6 12 12"></path>
							</svg>
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Custom scrollbar */
	.overflow-y-auto::-webkit-scrollbar {
		width: 6px;
	}
	
	.overflow-y-auto::-webkit-scrollbar-track {
		background: transparent;
	}
	
	.overflow-y-auto::-webkit-scrollbar-thumb {
		background-color: #4a4a4a;
		border-radius: 20px;
	}
	
	.overflow-y-auto::-webkit-scrollbar-thumb:hover {
		background-color: #FFB700;
	}
</style> 