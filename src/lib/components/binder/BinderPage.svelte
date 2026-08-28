<script lang="ts">
	import CardImage from '@components/card/CardImage.svelte';
	import { NO_IMAGES } from '$lib/images';
	import X from '@lucide/svelte/icons/x';
	import type { BinderCards } from '$lib/types';

	interface Props {
		columns: number;
		/** Highlights the slot a click-to-place would land in, `-1` when nothing is armed. */
		nextEmpty?: number;
		onDrop: (pageIndex: number, position: number, event: DragEvent) => void;
		onRemove: (pageIndex: number, position: number) => void;
		onSlotClick: (pageIndex: number, position: number) => void;
		pageIndex: number;
		rows: number;
		slots: Array<BinderCards | null>;
	}

	let { columns, nextEmpty = -1, onDrop, onRemove, onSlotClick, pageIndex, rows, slots }: Props = $props();

	let dragOver = $state(-1);

	const slotsPerPage = $derived(rows * columns);
	const filled = $derived(slots.filter(Boolean).length);

	function handleDragStart(event: DragEvent, position: number) {
		if (!event.dataTransfer) return;
		event.dataTransfer.setData('text/plain', `${pageIndex}:${position}`);
		event.dataTransfer.setData('source-type', 'binder');
		event.dataTransfer.setData('source-page', pageIndex.toString());
		event.dataTransfer.setData('source-position', position.toString());
		event.dataTransfer.effectAllowed = 'move';
	}
</script>

<div class="flex h-full min-h-0 flex-col gap-2 rounded-xl bg-gray-800/70 p-3 ring-1 ring-white/5">
	<div class="flex items-baseline justify-between px-1 text-xs">
		<span class="font-semibold text-gold-400">Page {pageIndex + 1}</span>
		<span class="text-gray-400">{filled}/{slotsPerPage}</span>
	</div>

	<!-- The sheet grows to the tallest size that still fits, so the cards are as big as the viewport allows. -->
	<div class="grid min-h-0 flex-1 place-items-center [container-type:size]">
		<div
			class="grid max-h-full w-full gap-2 grid-cols-[repeat(var(--columns),minmax(0,1fr))] grid-rows-[repeat(var(--rows),minmax(0,1fr))]"
			style:--columns={columns}
			style:--rows={rows}
			style:aspect-ratio="{columns * 2.5} / {rows * 3.5}"
			style:width="min(100%, calc(100cqh * {columns * 2.5} / {rows * 3.5}))"
		>
			{#each Array(slotsPerPage) as _, position (position)}
				{@const card = slots[position] ?? null}
				{@const isTarget = nextEmpty === position}
				<div
					class="group relative min-h-0 rounded-md border transition-colors
						{dragOver === position ? 'border-gold-400 bg-gold-400/10' : isTarget ? 'border-gold-400/70 border-dashed bg-gold-400/5' : 'border-gray-700 hover:border-gray-500'}
						{card ? 'bg-gray-900' : 'bg-gray-900/40'}"
					role="gridcell"
					tabindex="0"
					ondragover={event => { event.preventDefault(); dragOver = position; }}
					ondragleave={() => { if (dragOver === position) dragOver = -1; }}
					ondrop={event => { event.preventDefault(); dragOver = -1; onDrop(pageIndex, position, event); }}
				>
					{#if card}
						<div
							class="absolute inset-0 flex cursor-grab items-center justify-center p-px active:cursor-grabbing"
							draggable="true"
							role="button"
							tabindex="-1"
							ondragstart={event => handleDragStart(event, position)}
						>
							<CardImage
								alt={card.cardCode ?? 'Binder card'}
								class="max-h-full max-w-full rounded-[4%] object-contain {NO_IMAGES ? 'ring-1 ring-gold-400 ring-inset' : ''}"
								imageUrl={card.url}
								lazy={true}
							/>
							<button
								aria-label="Remove this card from the binder"
								class="absolute top-1 right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
								onclick={() => onRemove(pageIndex, position)}
								title="Remove this card from the binder"
							>
								<X size={14} />
							</button>
						</div>
					{:else}
						<button
							class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-600"
							onclick={() => onSlotClick(pageIndex, position)}
							title="Place the selected card here"
						>
							<span class="text-sm font-semibold tabular-nums">{pageIndex * slotsPerPage + position + 1}</span>
							{#if isTarget}<span class="text-[0.6rem] text-gold-400 uppercase">next</span>{/if}
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

