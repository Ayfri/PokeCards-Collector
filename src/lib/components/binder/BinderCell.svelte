<script lang="ts">
	import CardImage from '#components/card/CardImage.svelte';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import { DRAG_TYPE, readDrag, setDrag, type SlotRef } from '#helpers/binder.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import X from '@lucide/svelte/icons/x';
	import type { BinderTile } from '#lib/types.js';

	interface Props {
		at: SlotRef;
		/** The pocket's number across the whole binder, the sleeving order. */
		number: number;
		/** The slot a click-to-place would fill. */
		target: boolean;
		tile: BinderTile | null;
	}

	let { at, number, target, tile }: Props = $props();

	let dragOver = $state(false);

	/** The kind of a drag is unreadable until `drop`, so the cell lights up for any binder drag and `drop` ignores the kinds it does not handle. */
	function handleDragOver(event: DragEvent) {
		if (!event.dataTransfer?.types.includes(DRAG_TYPE)) return;
		event.preventDefault();
		dragOver = true;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const payload = readDrag(event);
		if (payload?.kind === 'card') binder.place(at, payload.key);
		else if (payload?.kind === 'slot') binder.move({ page: payload.page, position: payload.position }, at);
	}

	function handleClick() {
		if (binder.held) binder.move(binder.held, at);
		else if (binder.armed) binder.place(at, binder.armed);
	}
</script>

<div
	class={[
		'group relative min-h-0 rounded-md border transition-colors',
		dragOver ? 'border-gold-400 bg-gold-400/10' : target ? 'border-dashed border-gold-400/70 bg-gold-400/5' : 'border-gray-700 hover:border-gray-500',
		tile ? 'bg-gray-900' : 'bg-gray-900/40'
	]}
	draggable={Boolean(tile)}
	ondragleave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) dragOver = false; }}
	ondragover={handleDragOver}
	ondragstart={event => setDrag(event, { kind: 'slot', ...at })}
	ondrop={handleDrop}
	role="presentation"
>
	<button
		aria-label={tile ? `Slot ${number}, ${tile.name}` : `Empty slot ${number}`}
		class={['focus-ring absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-md p-px', tile ? 'cursor-grab active:cursor-grabbing' : 'text-gray-600']}
		onclick={handleClick}
		type="button"
	>
		{#if tile}
			<CardImage
				alt=""
				class="max-h-full max-w-full rounded-[4%] object-contain {NO_IMAGES ? 'ring-1 ring-gold-400 ring-inset' : ''}"
				imageUrl={tile.image}
				lazy={true}
				types={tile.types}
			/>
		{:else}
			<span class="text-sm font-semibold tabular-nums">{number}</span>
			{#if target}<span class="text-[0.6rem] text-gold-400 uppercase">next</span>{/if}
		{/if}
	</button>
	{#if tile}
		<button
			aria-label="Remove {tile.name} from the binder"
			class="absolute top-1 right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
			onclick={() => binder.remove(at)}
			title="Remove this card from the binder"
			type="button"
		>
			<X size={14} />
		</button>
	{/if}
</div>
