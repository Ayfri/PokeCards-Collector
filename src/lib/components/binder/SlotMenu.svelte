<script lang="ts">
	import { ITEM, PANEL } from '#components/ui/Popover.svelte';
	import type { SlotRef } from '#helpers/binder.ts';
	import { cardPath, isCardCode } from '#helpers/card-utils.ts';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import ArrowRightLeftIcon from '@lucide/svelte/icons/arrow-right-left';
	import BetweenHorizontalStartIcon from '@lucide/svelte/icons/between-horizontal-start';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import FoldHorizontalIcon from '@lucide/svelte/icons/fold-horizontal';
	import InboxIcon from '@lucide/svelte/icons/inbox';

	interface Props {
		/** The pocket the menu is open on, anchored through the `--binder-slot` anchor name its cell carries. `null` when closed. */
		at: SlotRef | null;
		onClose: () => void;
	}

	let { at, onClose }: Props = $props();

	let panel = $state<HTMLDivElement>();

	const key = $derived(at ? binder.pages[at.page]?.[at.position] ?? null : null);
	/** Only a card code the catalogue or the viewer's lists resolve has a page to open. */
	const card = $derived(key !== null && isCardCode(key) ? binderCards.get(key) : undefined);

	/** Shows the menu for the pocket and hides it when the pocket no longer holds a card, such as after an undo. A shown popover does not take focus by itself. */
	$effect(() => {
		if (!panel) return;
		const wanted = at !== null && key !== null;
		const open = panel.matches(':popover-open');
		if (wanted && !open) {
			panel.showPopover();
			panel.querySelector<HTMLElement>('a, button')?.focus();
		} else if (!wanted && open) panel.hidePopover();
	});

	/** Escape, a click outside and the items all end up here. Focus goes back to the pocket unless the user clicked on something else. */
	function handleToggle() {
		if (!at || panel?.matches(':popover-open')) return;
		if (document.activeElement === document.body) document.querySelector<HTMLElement>(`[data-slot="${at.page}-${at.position}"] button`)?.focus();
		onClose();
	}

	function act(run: (slot: SlotRef) => void) {
		if (at) run(at);
		panel?.hidePopover();
	}
</script>

<div
	bind:this={panel}
	aria-label="Slot actions"
	class={[PANEL, 'p-1! supports-[position-area:bottom]:[position-area:bottom]']}
	ontoggle={handleToggle}
	popover="auto"
	role="group"
	style:position-anchor="--binder-slot"
>
	{#if card}
		<a class={ITEM} href={cardPath(card.language ?? 'en', card)} onclick={() => panel?.hidePopover()}><ExternalLinkIcon size={16} /> Open card page</a>
	{/if}
	<button class={ITEM} onclick={() => act(slot => { binder.armed = null; binder.held = slot; })} type="button"><ArrowRightLeftIcon size={16} /> Move to another slot</button>
	<button class={ITEM} onclick={() => act(slot => binder.remove(slot))} type="button"><InboxIcon size={16} /> Back to the tray</button>
	<button class={ITEM} onclick={() => act(slot => binder.shift(slot, 'insert'))} type="button"><BetweenHorizontalStartIcon size={16} /> Insert an empty slot here</button>
	<button class={ITEM} onclick={() => act(slot => binder.shift(slot, 'close'))} type="button"><FoldHorizontalIcon size={16} /> Remove and close the gap</button>
</div>
