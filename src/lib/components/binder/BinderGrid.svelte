<script lang="ts">
	import { type Writable } from 'svelte/store';
	import CardImage from '@components/card/CardImage.svelte';
	import { NO_IMAGES } from '$lib/images';
	import { X } from 'lucide-svelte';

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
			const sourceCard = $binderCards[sourcePosition];
			if (!sourceCard) return;
			
			// Get the card at the target position (if any)
			const targetCard = $binderCards[position];
			
			// Create updated array
			const updatedBinderCards = [...$binderCards];
			
			// If there's a card at the target position, swap the cards
			if (targetCard) {
				// Place target card at source position with updated position property
				updatedBinderCards[sourcePosition] = { ...targetCard, position: sourcePosition };
				// Place source card at target position with updated position property
				updatedBinderCards[position] = { ...sourceCard, position };
			} else {
				// If target position is empty, just move the card
				updatedBinderCards[sourcePosition] = null;
				updatedBinderCards[position] = { ...sourceCard, position };
			}
			
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
	<!-- This div handles scrolling -->
	<div class="h-full overflow-y-auto">
		<div 
			class="grid gap-[2px] mx-auto max-w-full"
			style="grid-template-rows: repeat({$rows}, minmax(0, 1fr)); grid-template-columns: repeat({$columns}, minmax(0, 1fr));"
		>
			{#each Array($rows * $columns) as _, index}
				{@const card = index < $binderCards.length ? $binderCards[index] : null}
				
				<div 
					class="relative aspect-[2.5/3.7] justify-self-center w-full"
					role="gridcell"
					tabindex="0"
					on:dragover={onDragOver}
					on:dragleave={onDragLeave}
					on:drop={(e) => onDrop(e, index)}
				>
					<div class="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-900 border border-gray-700 rounded-sm p-px hover:border-gray-600">
						{#if card}
							<div
								class="relative w-full h-full flex items-center justify-center group"
								draggable="true"
								role="button"
								tabindex="-1"
								on:dragstart={(e) => onDragStart(e, card)}
							>
								<CardImage
									imageUrl={card.url}
									alt="Pokémon card" 
									class="card-image {NO_IMAGES ? 'ring-1 ring-gold-400 ring-inset' : ''}"
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
							<div class="text-gray-500 text-xs text-center">Drop card here</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div> 