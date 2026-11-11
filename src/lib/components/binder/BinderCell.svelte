<script lang="ts">
	import CardImage from '#components/card/CardImage.svelte';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import { DIMMED, DRAG_TYPE, dragLeft, readDrag, setDrag, type SlotRef } from '#helpers/binder.ts';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import X from '@lucide/svelte/icons/x';
	import type { BinderTile } from '#lib/types.js';
	import { untrack } from 'svelte';

	interface Props {
		at: SlotRef;
		/** True while the board's slot menu is open on this pocket: it is the anchor of the menu. */
		menuOpen: boolean;
		/** The pocket's number across the whole binder, the sleeving order. */
		number: number;
		onMenu: (at: SlotRef) => void;
		/** The slot a click-to-place would fill. */
		target: boolean;
		tile: BinderTile | null;
	}

	let { at, menuOpen, number, onMenu, target, tile }: Props = $props();

	let dragOver = $state(false);
	let hovered = $state(false);
	let focused = $state(false);

	/** The slot picked up with the menu's Move: it keeps a ring until its destination is chosen. */
	const held = $derived(binder.held?.page === at.page && binder.held.position === at.position);

	/**
	 * The card an armed click or a move would drop here, drawn faint where it would land: the next empty slot and the pocket under the pointer
	 * or the focus. No other pocket builds one, so arming a card costs two images, not one per pocket.
	 */
	const ghostKey = $derived.by(() => {
		if (binder.held) return !held && (hovered || focused) ? binder.pages[binder.held.page]?.[binder.held.position] : null;
		return binder.armed && (target || hovered || focused) ? binder.armed : null;
	});
	const ghost = $derived(ghostKey ? binderCards.tile(ghostKey) : null);

	/**
	 * A card already in the pocket when it mounts (a page change, the stored binder arriving) does not pop: only a later change of key does, so
	 * the animation never replays on a re-render. A fill delays each pocket a little, capped so the page settles within about 400 ms.
	 */
	let lastKey = untrack(() => tile?.key);
	let wasLoaded = untrack(() => binder.loaded);
	let pop = $state.raw<{ delay: number; key: string } | null>(null);
	$effect.pre(() => {
		const key = tile?.key;
		const settled = wasLoaded;
		wasLoaded = binder.loaded;
		if (key === lastKey) return;
		lastKey = key;
		const filling = untrack(() => binder.lastEditFilled);
		pop = settled && key ? { delay: filling ? Math.min(at.position * 25, 220) : 0, key } : null;
	});

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
		else if (tile) onMenu(at);
	}

	/** The ContextMenu key and Shift+F10 fire this natively. An empty pocket keeps the browser's own menu. */
	function handleContextMenu(event: MouseEvent) {
		if (!tile) return;
		event.preventDefault();
		onMenu(at);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!tile || (event.key !== 'Delete' && event.key !== 'Backspace')) return;
		event.preventDefault();
		binder.remove(at);
	}
</script>

<div
	class={[
		'group relative min-h-0 rounded-md border transition',
		dragOver ? 'z-10 border-gold-400 bg-gold-400/10 ring-2 ring-gold-400 motion-safe:scale-[1.03]' : target ? 'border-dashed border-gold-400/70 bg-gold-400/5' : 'border-gray-700 hover:border-gray-500',
		held && 'outline-2 outline-dashed outline-gold-400',
		tile ? 'bg-gray-900' : 'bg-gray-900/40'
	]}
	data-slot="{at.page}-{at.position}"
	draggable={Boolean(tile)}
	ondragleave={event => { if (dragLeft(event)) dragOver = false; }}
	ondragover={handleDragOver}
	ondragstart={event => setDrag(event, { kind: 'slot', ...at })}
	ondrop={handleDrop}
	onfocusin={() => (focused = true)}
	onfocusout={() => (focused = false)}
	onpointerenter={() => (hovered = true)}
	onpointerleave={() => (hovered = false)}
	role="presentation"
	style:anchor-name={menuOpen ? '--binder-slot' : undefined}
>
	<button
		aria-label={tile ? `Slot ${number}, ${tile.name}` : `Empty slot ${number}`}
		class={['focus-ring absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-md p-px', tile ? 'cursor-grab active:cursor-grabbing' : 'text-gray-600']}
		onclick={handleClick}
		oncontextmenu={handleContextMenu}
		onkeydown={handleKeydown}
		type="button"
	>
		{#if tile}
			{#key tile.key}
				<CardImage
					alt=""
					class="max-h-full max-w-full rounded-[4%] object-contain {NO_IMAGES ? 'ring-1 ring-gold-400 ring-inset' : ''} {tile.dimmed ? DIMMED : ''} {pop?.key === tile.key ? 'motion-safe:animate-pop' : ''}"
					imageUrl={tile.image}
					lazy={true}
					style={pop?.key === tile.key && pop.delay ? `animation-delay: ${pop.delay}ms` : undefined}
					types={tile.types}
				/>
			{/key}
		{:else}
			<span class="relative z-1 text-sm font-semibold tabular-nums">{number}</span>
			{#if target}<span class="relative z-1 text-[0.6rem] text-gold-400 uppercase">next</span>{/if}
		{/if}
	</button>
	{#if ghost}
		<span aria-hidden="true" class="pointer-events-none absolute inset-0 rounded-md border border-dashed border-gold-400">
			<span class="flex size-full items-center justify-center p-px opacity-40">
				<CardImage alt="" class="max-h-full max-w-full rounded-[4%] object-contain" imageUrl={ghost.image} lazy={false} types={ghost.types} />
			</span>
		</span>
	{/if}
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
