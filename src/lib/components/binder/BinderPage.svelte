<script lang="ts">
	import CardImage from '#components/card/CardImage.svelte';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import X from '@lucide/svelte/icons/x';
	import type { BinderSlot } from '#lib/types.js';

	interface Props {
		columns: number;
		/** Highlights the slot a click-to-place would land in, `-1` when nothing is armed. */
		nextEmpty?: number;
		/** Without these three handlers the sheet is a static, non-interactive display. */
		onDrop?: (pageIndex: number, position: number, event: DragEvent) => void;
		onRemove?: (pageIndex: number, position: number) => void;
		onSlotClick?: (pageIndex: number, position: number) => void;
		pageIndex: number;
		rows: number;
		slots: Array<BinderSlot | null>;
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

	<!-- The sheet takes the tallest size that fits, so the cards are as big as the viewport allows. -->
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
						{dragOver === position ? 'border-gold-400 bg-gold-400/10' : isTarget ? 'border-gold-400/70 border-dashed bg-gold-400/5' : onDrop ? 'border-gray-700 hover:border-gray-500' : 'border-gray-700'}
						{card ? 'bg-gray-900' : 'bg-gray-900/40'}"
					ondragleave={onDrop && (() => { if (dragOver === position) dragOver = -1; })}
					ondragover={onDrop && (event => { event.preventDefault(); dragOver = position; })}
					ondrop={onDrop && (event => { event.preventDefault(); dragOver = -1; onDrop(pageIndex, position, event); })}
					role="gridcell"
					tabindex={onDrop ? 0 : undefined}
				>
					{#if card}
						<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
						<div
							class={['absolute inset-0 flex items-center justify-center p-px', onDrop && 'cursor-grab active:cursor-grabbing']}
							draggable={onDrop ? 'true' : undefined}
							ondragstart={onDrop && (event => handleDragStart(event, position))}
							role={onDrop ? 'button' : undefined}
							tabindex={onDrop ? -1 : undefined}
						>
							<CardImage
								alt="Binder card, page {pageIndex + 1} slot {position + 1}"
								class="max-h-full max-w-full rounded-[4%] object-contain {NO_IMAGES ? 'ring-1 ring-gold-400 ring-inset' : ''}"
								imageUrl={card.url}
								lazy={true}
							/>
							{#if onRemove}
								<button
									aria-label="Remove this card from the binder"
									class="absolute top-1 right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
									onclick={() => onRemove(pageIndex, position)}
									title="Remove this card from the binder"
								>
									<X size={14} />
								</button>
							{/if}
						</div>
					{:else}
						<!-- The click handler only exists on the button variant. -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<svelte:element
							class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-600"
							onclick={onSlotClick && (() => onSlotClick(pageIndex, position))}
							this={onSlotClick ? 'button' : 'div'}
							title={onSlotClick ? 'Place the selected card here' : undefined}
						>
							<span class="text-sm font-semibold tabular-nums">{pageIndex * slotsPerPage + position + 1}</span>
							{#if isTarget}<span class="text-[0.6rem] text-gold-400 uppercase">next</span>{/if}
						</svelte:element>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

