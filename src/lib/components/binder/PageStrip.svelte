<script lang="ts">
	import { DRAG_TYPE, readDrag, setDrag } from '#helpers/binder.ts';
	import { cardTypeTint } from '#helpers/card-images.ts';
	import { isCardCode } from '#helpers/card-utils.ts';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import type { Attachment } from 'svelte/attachments';

	let dragOver = $state(-1);
	/** The page this strip is dragging, or -1. A `dragover` cannot read the payload, so the strip remembers its own drag to know on which side a page lands. */
	let dragFrom = $state(-1);

	/** Keeps the thumbnail of a page on screen inside the scrolling strip. */
	const reveal = (current: boolean): Attachment<HTMLButtonElement> => button => {
		if (current) button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	};

	function handleDrop(event: DragEvent, index: number) {
		event.preventDefault();
		dragOver = -1;
		dragFrom = -1;
		const payload = readDrag(event);
		if (payload?.kind === 'page') binder.movePage(payload.index, index);
	}
</script>

<div class="flex shrink-0 items-center gap-2 overflow-x-auto pb-1">
	{#each binder.pages as sheet, index (index)}
		{@const filled = sheet.filter(Boolean).length}
		{@const current = binder.visiblePages.includes(index)}
		{@const label = `Page ${index + 1}, ${filled} of ${sheet.length} filled`}
		<div
			class={['relative shrink-0 transition-opacity', dragFrom === index && 'opacity-50']}
			draggable="true"
			ondragend={() => { dragFrom = -1; dragOver = -1; }}
			ondragleave={() => { if (dragOver === index) dragOver = -1; }}
			ondragover={event => {
				if (dragFrom === -1 || !event.dataTransfer?.types.includes(DRAG_TYPE)) return;
				event.preventDefault();
				dragOver = index;
			}}
			ondragstart={event => {
				dragFrom = index;
				setDrag(event, { index, kind: 'page' });
			}}
			ondrop={event => handleDrop(event, index)}
			role="presentation"
		>
			<button
				{@attach reveal(current)}
				aria-current={current ? 'true' : undefined}
				aria-label={label}
				class={[
					'focus-ring flex flex-col items-center gap-1 rounded-md border-2 p-1 transition-colors',
					dragOver === index ? 'border-gold-400 bg-gold-400/10' : current ? 'border-gold-400' : 'border-gray-700 hover:border-gray-500'
				]}
				onclick={() => binder.goTo(index)}
				title={label}
				type="button"
			>
				<span
					class="grid w-9 grid-cols-[repeat(var(--columns),minmax(0,1fr))] grid-rows-[repeat(var(--rows),minmax(0,1fr))] gap-px"
					style:--columns={binder.columns}
					style:--rows={binder.rows}
					style:aspect-ratio="{binder.columns * 2.5} / {binder.rows * 3.5}"
				>
					<!-- A card takes its first type's colour from `colors.css`, gray when it has none or is unknown, and gold for an image URL. -->
					{#each sheet as slot, position (position)}
						<span
							class={['rounded-[1px]', !slot ? 'bg-gray-700' : isCardCode(slot) ? 'bg-[var(--tint-a,var(--color-gray-400))]' : 'bg-gold-400']}
							style={slot && isCardCode(slot) ? cardTypeTint(binderCards.get(slot)?.types) : undefined}
						></span>
					{/each}
				</span>
				<span class={['text-[0.65rem] tabular-nums', current ? 'text-gold-400' : 'text-gray-400']}>{index + 1}</span>
			</button>
			{#if dragOver === index && dragFrom !== index}
				<span aria-hidden="true" class={['pointer-events-none absolute inset-y-0 w-1 rounded-full bg-gold-400', dragFrom < index ? '-right-0.5' : '-left-0.5']}></span>
			{/if}
		</div>
	{/each}
	<button
		class="focus-ring flex h-full min-h-14 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-gray-700 px-3 text-gray-400 transition-colors hover:border-gold-400 hover:text-gold-400"
		onclick={() => binder.addPage()}
		title="Append an empty page"
		type="button"
	>
		<PlusIcon size={16} />
	</button>
</div>
