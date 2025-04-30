<script lang="ts">
	import { type Writable } from 'svelte/store';
	import CardImage from '@components/card/CardImage.svelte';
	import { NO_IMAGES } from '$lib/images';
	import { X } from 'lucide-svelte';
	import type { BinderCards } from '$lib/types';

	export let binderCards: Writable<Array<BinderCards | null>>;
	export let rows: Writable<number>;
	export let columns: Writable<number>;
	
	// Handle drag events
	function onDragOver(e: DragEvent) {
		e.preventDefault();
		const target = e.target as HTMLElement;
		if (target.closest('.binder-cell')) {
			target.closest('.binder-cell')!.classList.add('drag-over');
		}
	}
	
	function onDragLeave(e: DragEvent) {
		e.preventDefault();
		const target = e.target as HTMLElement;
		if (target.closest('.binder-cell')) {
			target.closest('.binder-cell')!.classList.remove('drag-over');
		}
	}
	
	function onDrop(e: DragEvent, position: number) {
		e.preventDefault();
		const target = e.target as HTMLElement;
		if (target.closest('.binder-cell')) {
			target.closest('.binder-cell')!.classList.remove('drag-over');
		}
		
		const sourceType = e.dataTransfer?.getData('source-type');
		
		if (sourceType === 'storage') {
			// Get data directly from transfer
			const cardCode = e.dataTransfer?.getData('cardCode');
			const cardUrl = e.dataTransfer?.getData('cardUrl');
			
			if (cardCode && cardUrl) {
				// Update the binder grid
				const updatedBinderCards = [...$binderCards];
				// Create a new BinderCards object for the grid
				updatedBinderCards[position] = { 
					id: crypto.randomUUID(), // Assign a unique ID for this grid instance
					url: cardUrl, 
					cardCode: cardCode, 
					position: position 
				};
				$binderCards = updatedBinderCards;
				
				// No interaction with storedCards needed here anymore
			} else {
				console.error('Drop from storage missing cardCode or cardUrl in dataTransfer');
			}

		} else if (sourceType === 'storage-url') {
			// Handle drop from storage when it's just a URL
			const cardUrl = e.dataTransfer?.getData('cardUrl');

			if (cardUrl) {
				const updatedBinderCards = [...$binderCards];
				// Create a BinderCards object with only URL and position
				updatedBinderCards[position] = { 
					id: crypto.randomUUID(), 
					url: cardUrl, 
					cardCode: undefined, // Explicitly undefined for URL-only items
					position: position 
				};
				$binderCards = updatedBinderCards;
			} else {
				console.error('Drop from storage-url missing cardUrl in dataTransfer');
			}

		} else if (sourceType === 'binder') {
			// Handle drag/drop within the grid (swap or move)
			const sourcePosition = parseInt(e.dataTransfer?.getData('source-position') || '-1');
			if (sourcePosition === -1 || sourcePosition === position) return; // Ignore drop on same spot
			
			const sourceCard = $binderCards[sourcePosition];
			if (!sourceCard) return; // Source card doesn't exist (shouldn't happen)
			
			const targetCard = $binderCards[position]; // Card at the drop position
			
			const updatedBinderCards = [...$binderCards];
			
			if (targetCard) {
				// Swap cards: Place target card at source, source card at target
				updatedBinderCards[sourcePosition] = { ...targetCard, position: sourcePosition };
				updatedBinderCards[position] = { ...sourceCard, position: position };
			} else {
				// Move card: Clear source, place source card at target
				updatedBinderCards[sourcePosition] = null;
				updatedBinderCards[position] = { ...sourceCard, position: position };
			}
			
			$binderCards = updatedBinderCards;
		}
	}
	
	// Handle starting drag from a cell
	function onDragStart(e: DragEvent, card: BinderCards) {
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
	<div class="h-full overflow-y-auto">
		<div 
			class="grid gap-[2px] mx-auto max-w-full binder-grid"
			style:--rows={$rows} 
			style:--columns={$columns}
		>
			{#each Array($rows * $columns) as _, index (index)} 
				{@const card = index < $binderCards.length ? $binderCards[index] : null}
				<div 
					class="relative binder-cell justify-self-center w-full border border-gray-700 rounded-sm hover:border-gray-600 {card ? 'bg-gray-900' : 'bg-gray-800/50'}"
					style="aspect-ratio: 2.5 / 3.5;"
					role="gridcell"
					tabindex="0"
					on:dragover={onDragOver}
					on:dragleave={onDragLeave}
					on:drop={(e) => onDrop(e, index)}
				>
					{#if card}
						<div
							class="absolute inset-0 w-full h-full flex items-center justify-center group p-px"
							draggable="true"
							role="button"
							tabindex="-1"
							on:dragstart={(e) => onDragStart(e, card)}
						>
							<CardImage
								imageUrl={card.url}
								alt={card.cardCode}
								class="card-image max-w-full max-h-full object-contain {NO_IMAGES ? 'ring-1 ring-gold-400 ring-inset' : ''}"
								lazy={true}
								highRes={true}
							/>
							<button 
								class="absolute top-1 right-1 bg-red-500 rounded-full p-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
								on:click={() => removeCard(index)}
							>
								<X size={14} />
							</button>
						</div>
					{:else}
						<div class="absolute inset-0 flex items-center justify-center text-gray-600 text-xs text-center pointer-events-none">
							Drop here
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.binder-grid {
		display: grid;
		grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		gap: 2px;
	}
	.binder-cell:focus {
		outline: 2px solid #FFB700;
		outline-offset: 1px;
	}
</style> 