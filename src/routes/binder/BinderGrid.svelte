<script lang="ts">
	import { type Writable } from 'svelte/store';
	
	export let binderCards: Writable<Array<{id: string; url: string; position: number} | null>>;
	export let storedCards: Writable<Array<{id: string; url: string}>>;
	export let rows: Writable<number>;
	export let columns: Writable<number>;
	
	// Handle drag events
	function onDragOver(e: DragEvent) {
		e.preventDefault();
		const target = e.target as HTMLElement;
		if (target.classList.contains('binder-cell')) {
			target.classList.add('drag-over');
		}
	}
	
	function onDragLeave(e: DragEvent) {
		e.preventDefault();
		const target = e.target as HTMLElement;
		if (target.classList.contains('binder-cell')) {
			target.classList.remove('drag-over');
		}
	}
	
	function onDrop(e: DragEvent, position: number) {
		e.preventDefault();
		const target = e.target as HTMLElement;
		target.classList.remove('drag-over');
		
		const cardId = e.dataTransfer?.getData('text/plain');
		if (!cardId) return;
		
		// Check if this is a card from storage or from another cell
		const sourceType = e.dataTransfer?.getData('source-type');
		
		if (sourceType === 'storage') {
			// Find the card in storage
			const cardIndex = $storedCards.findIndex(card => card.id === cardId);
			if (cardIndex !== -1) {
				const card = $storedCards[cardIndex];
				
				// Update the binder grid
				const updatedBinderCards = [...$binderCards];
				updatedBinderCards[position] = { ...card, position };
				$binderCards = updatedBinderCards;
				
				// No need to remove from storage since we're just creating a copy
			}
		} else if (sourceType === 'binder') {
			// Find the source position
			const sourcePosition = parseInt(e.dataTransfer?.getData('source-position') || '-1');
			if (sourcePosition === -1) return;
			
			// Get the card from the source position
			const card = $binderCards[sourcePosition];
			if (!card) return;
			
			// Remove card from source position and add to target position
			const updatedBinderCards = [...$binderCards];
			updatedBinderCards[sourcePosition] = null;
			updatedBinderCards[position] = { ...card, position };
			$binderCards = updatedBinderCards;
		}
	}
	
	// Handle starting drag from a cell
	function onDragStart(e: DragEvent, card: {id: string; url: string; position: number}) {
		if (!e.dataTransfer) return;
		
		e.dataTransfer.setData('text/plain', card.id);
		e.dataTransfer.setData('source-type', 'binder');
		e.dataTransfer.setData('source-position', card.position.toString());
		e.dataTransfer.effectAllowed = 'move';
	}
	
	// Remove card from cell
	function removeCard(position: number) {
		const updatedBinderCards = [...$binderCards];
		updatedBinderCards[position] = null;
		$binderCards = updatedBinderCards;
	}
</script>

<div class="bg-gray-800 rounded-lg p-4 h-full flex justify-center">
	<table class="border-collapse w-full max-w-[1200px]">
		<tbody>
			{#each Array(Math.ceil($binderCards.length / $columns)) as _, rowIndex}
				<tr>
					{#each Array($columns) as _, colIndex}
						{@const index = rowIndex * $columns + colIndex}
						{@const card = index < $binderCards.length ? $binderCards[index] : null}
						<td 
							class="p-0 border border-gray-700 relative"
							style="height: 0; padding-bottom: calc(140% / {$columns});"
							on:dragover={onDragOver}
							on:dragleave={onDragLeave}
							on:drop={(e) => onDrop(e, index)}
						>
							<div class="absolute inset-0 flex items-center justify-center binder-cell">
								{#if card}
									<div
										class="absolute inset-0 flex items-center justify-center group"
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
											on:click={() => removeCard(index)}
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
												<path d="M18 6 6 18"></path>
												<path d="m6 6 12 12"></path>
											</svg>
										</button>
									</div>
								{:else}
									<div class="text-gray-600 text-sm">Drop card here</div>
								{/if}
							</div>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.binder-cell {
		background-color: #1f2937;
	}
	
	.drag-over {
		border-color: #FFB700 !important;
		background-color: rgba(255, 183, 0, 0.1);
		transform: scale(1.02);
	}
	
	:global(table) {
		border-spacing: 0;
	}
	
	:global(td) {
		overflow: hidden;
	}
</style> 