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

<div class="w-full h-full p-2">
	<div class="grid-wrapper">
		<div class="binder-grid" style="grid-template-rows: repeat({$rows}, 1fr); grid-template-columns: repeat({$columns}, 1fr);">
			{#each Array($rows * $columns) as _, index}
				{@const rowIndex = Math.floor(index / $columns)}
				{@const colIndex = index % $columns}
				{@const card = index < $binderCards.length ? $binderCards[index] : null}
				
				<div 
					class="binder-cell-container"
					on:dragover={onDragOver}
					on:dragleave={onDragLeave}
					on:drop={(e) => onDrop(e, index)}
				>
					<div class="binder-cell">
						{#if card}
							<div
								class="card-content group"
								draggable="true"
								on:dragstart={(e) => onDragStart(e, card)}
							>
								<img 
									src={card.url} 
									alt="Pokémon card" 
									class="card-image"
									loading="lazy"
								/>
								<button 
									class="remove-btn"
									on:click={() => removeCard(index)}
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
										<path d="M18 6 6 18"></path>
										<path d="m6 6 12 12"></path>
									</svg>
								</button>
							</div>
						{:else}
							<div class="drop-placeholder">Drop card here</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.grid-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.binder-grid {
		display: grid;
		width: 100%;
		height: 100%;
		gap: 2px;
	}
	
	.binder-cell-container {
		position: relative;
		aspect-ratio: 2.5/3.5; /* Correct aspect ratio for Pokémon cards */
		justify-self: center;
		width: 100%;
	}
	
	.binder-cell {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #1f2937;
		border: 1px solid #374151;
		border-radius: 2px;
		padding: 1px;
	}
	
	.binder-cell:hover {
		border-color: #4b5563;
	}
	
	.card-content {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.card-image {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}
	
	.drop-placeholder {
		color: #6b7280;
		font-size: 0.75rem;
		text-align: center;
	}
	
	.remove-btn {
		position: absolute;
		top: 1px;
		right: 1px;
		background-color: #ef4444;
		border-radius: 9999px;
		padding: 1px;
		opacity: 0;
		transition: opacity 0.2s;
	}
	
	.group:hover .remove-btn {
		opacity: 1;
	}
	
	.drag-over {
		border-color: #FFB700 !important;
		background-color: rgba(255, 183, 0, 0.1);
		transform: scale(1.02);
	}
</style> 