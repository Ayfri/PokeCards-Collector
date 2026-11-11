<script lang="ts">
	import { DRAG_TYPE, readDrag, setDrag } from '#helpers/binder.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import PlusIcon from '@lucide/svelte/icons/plus';

	let dragOver = $state(-1);

	function handleDrop(event: DragEvent, index: number) {
		event.preventDefault();
		dragOver = -1;
		const payload = readDrag(event);
		if (payload?.kind === 'page') binder.movePage(payload.index, index);
	}
</script>

<div class="flex shrink-0 items-center gap-2 overflow-x-auto pb-1">
	{#each binder.pages as sheet, index (index)}
		{@const filled = sheet.filter(Boolean).length}
		{@const current = binder.visiblePages.includes(index)}
		<div
			class="shrink-0"
			draggable="true"
			ondragleave={() => { if (dragOver === index) dragOver = -1; }}
			ondragover={event => {
				if (!event.dataTransfer?.types.includes(DRAG_TYPE)) return;
				event.preventDefault();
				dragOver = index;
			}}
			ondragstart={event => setDrag(event, { index, kind: 'page' })}
			ondrop={event => handleDrop(event, index)}
			role="presentation"
		>
			<button
				{@attach (button: HTMLButtonElement) => { if (current) button.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}
				aria-current={current ? 'true' : undefined}
				aria-label="Page {index + 1}, {filled} of {sheet.length} filled"
				class={[
					'focus-ring flex flex-col items-center gap-1 rounded-md border-2 p-1 transition-colors',
					dragOver === index ? 'border-gold-400 bg-gold-400/10' : current ? 'border-gold-400' : 'border-gray-700 hover:border-gray-500'
				]}
				onclick={() => binder.goTo(index)}
				type="button"
			>
				<span
					class="grid w-9 grid-cols-[repeat(var(--columns),minmax(0,1fr))] grid-rows-[repeat(var(--rows),minmax(0,1fr))] gap-px"
					style:--columns={binder.columns}
					style:--rows={binder.rows}
					style:aspect-ratio="{binder.columns * 2.5} / {binder.rows * 3.5}"
				>
					{#each sheet as slot, position (position)}
						<span class={['rounded-[1px]', slot ? 'bg-gold-400' : 'bg-gray-700']}></span>
					{/each}
				</span>
				<span class={['text-[0.65rem] tabular-nums', current ? 'text-gold-400' : 'text-gray-400']}>{index + 1}</span>
			</button>
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
