<script lang="ts">
	import BinderCell from '#components/binder/BinderCell.svelte';
	import BinderPage from '#components/binder/BinderPage.svelte';
	import PageStrip from '#components/binder/PageStrip.svelte';
	import SlotMenu from '#components/binder/SlotMenu.svelte';
	import Popover, { ITEM } from '#components/ui/Popover.svelte';
	import { type BinderTab, dragLeft, isEditableTarget, type SlotRef } from '#helpers/binder.ts';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import type { LucideIcon } from '@lucide/svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import EraserIcon from '@lucide/svelte/icons/eraser';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UserRoundIcon from '@lucide/svelte/icons/user-round';
	import { tick, untrack } from 'svelte';

	interface Props {
		/** Called when a first-run tile opens a source, so a phone can flip to the cards panel. */
		onBrowse?: () => void;
	}

	let { onBrowse }: Props = $props();

	const STARTS: { icon: LucideIcon; label: string; tab: BinderTab }[] = [
		{ icon: LayersIcon, label: 'Fill from a set', tab: 'sets' },
		{ icon: UserRoundIcon, label: 'Use my cards', tab: 'mine' },
		{ icon: LayoutGridIcon, label: 'Browse all cards', tab: 'all' }
	];

	/** True while any binder drag is over the sheets, so the first-run callout gets out of the way of the pockets it covers. */
	let dragging = $state(false);

	/** Only after `load()`: the server and the first client render draw no callout, since they cannot know the binder is empty. */
	const showStart = $derived(binder.loaded && !binder.filledSlots && !binder.armed && !binder.held && !dragging);

	/** The sheets slide in from the side the page comes from. Keyed on the leftmost visible page, so turning inside a spread, and any edit, replay nothing. */
	let leftmost = untrack(() => binder.visiblePages[0]);
	let turnX = $state(0);
	let turned = $state(false);
	$effect.pre(() => {
		const left = binder.visiblePages[0];
		if (left === leftmost) return;
		turnX = left > leftmost ? 12 : -12;
		turned = true;
		leftmost = left;
	});

	/** Deleting the last page leaves a fresh empty one, so delete does nothing useful only when the binder is already a single empty page. */
	const nothingToDelete = $derived(binder.pages.length === 1 && !binder.pages[0].some(Boolean));

	const PAGE_KEYS: Readonly<Record<string, -1 | 1>> = { ArrowLeft: -1, ArrowRight: 1, PageDown: 1, PageUp: -1 };

	/** One slot menu for the whole board, anchored on the pocket it is open on. Raw: it holds a reference that is only ever replaced. */
	let menuAt = $state.raw<SlotRef | null>(null);

	let root = $state<HTMLDivElement>();

	/**
	 * The keys of a text field, an open popover, a dialog and the cards panel's tabs belong to them: the page keys would fight their own.
	 * Escape disarms from anywhere, since the armed card is picked in the panel. The page keys only act when focus is on the board or on nothing,
	 * so the list of the cards panel scrolls with them, and not while the board is hidden behind the panel on a phone.
	 */
	async function handleKeydown(event: KeyboardEvent) {
		if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isEditableTarget(event.target)) return;
		if (event.target instanceof Element && event.target.closest(':popover-open, [role="dialog"], [role="tablist"]')) return;

		if (event.key === 'Escape') {
			binder.armed = null;
			binder.held = null;
			return;
		}

		const board = root;
		const direction = PAGE_KEYS[event.key];
		if (!direction || !board?.checkVisibility()) return;
		if (event.target !== document.body && !(event.target instanceof Node && board.contains(event.target))) return;
		event.preventDefault();

		/**
		 * The focused pocket belongs to a page that the turn destroys, so focus would fall to the page: it moves to the same position on the same side of the
		 * new spread, left staying left and right staying right. The last spread of an odd page count has no right page, so the left one takes the focus.
		 */
		const [page, position] = (event.target instanceof Element ? event.target.closest<HTMLElement>('[data-slot]') : null)?.dataset.slot?.split('-') ?? [];
		const side = Math.max(0, binder.visiblePages.indexOf(Number(page)));
		const before = binder.visiblePages[0];
		binder.goBy(direction);
		if (position === undefined || binder.visiblePages[0] === before) return;

		await tick();
		const target = binder.visiblePages[side] ?? binder.visiblePages.at(-1);
		board.querySelector<HTMLElement>(`[data-slot="${target}-${position}"] button`)?.focus();
	}
</script>

<!-- A cancelled drag never leaves the sheets with a `dragleave`, so its end, which bubbles up from the source, clears the flag too. -->
<svelte:window onkeydown={handleKeydown} ondragend={() => (dragging = false)} />

<div bind:this={root} class="flex min-h-0 flex-1 flex-col gap-3">
	<!-- The sheets sit on a dark cover, split by a ringed spine when both facing pages show. -->
	<div
		class="relative flex min-h-0 flex-1 justify-center rounded-2xl bg-gray-900 p-3 ring-1 ring-white/5 inset-shadow-sm"
		ondragleave={event => { if (dragLeft(event)) dragging = false; }}
		ondragover={() => (dragging = true)}
		ondrop={() => (dragging = false)}
		role="presentation"
	>
		{#key binder.visiblePages[0]}
			<div class={['flex h-full w-full items-stretch justify-center gap-2', turned && 'motion-safe:animate-page-turn']} style:--turn-x="{turnX}px">
				{#each binder.visiblePages as pageIndex, index (pageIndex)}
					{#if index === 1}
						<div class="flex w-6 shrink-0 flex-col items-center justify-center gap-6 rounded bg-black/40">
							{#each Array(3) as _, ring (ring)}
								<span class="size-3 rounded-full border-2 border-gray-600 bg-gray-800"></span>
							{/each}
						</div>
					{/if}
					<div class="min-w-0 flex-1">
						<BinderPage
							columns={binder.columns}
							{pageIndex}
							rows={binder.rows}
							slots={binder.pages[pageIndex].map(key => (key === null ? null : binderCards.tile(key)))}
						>
							{#snippet actions()}
								<Popover class="p-1!" label="Page {pageIndex + 1} actions" triggerClass="h-6! px-1.5!">
									{#snippet trigger()}
										<EllipsisIcon size={14} />
									{/snippet}
									{#snippet children(close)}
										<button class={ITEM} onclick={() => { binder.duplicatePage(pageIndex); close(); }} type="button"><CopyIcon size={16} /> Duplicate page</button>
										<button class={ITEM} disabled={!binder.pages[pageIndex].some(Boolean)} onclick={() => { binder.emptyPage(pageIndex); close(); }} type="button"><EraserIcon size={16} /> Empty page</button>
										<button class={ITEM} disabled={pageIndex === 0} onclick={() => { binder.movePage(pageIndex, pageIndex - 1); close(); }} type="button"><ArrowLeftIcon size={16} /> Move earlier</button>
										<button class={ITEM} disabled={pageIndex === binder.pages.length - 1} onclick={() => { binder.movePage(pageIndex, pageIndex + 1); close(); }} type="button"><ArrowRightIcon size={16} /> Move later</button>
										<button class={ITEM} disabled={nothingToDelete} onclick={() => { binder.deletePage(pageIndex); close(); }} type="button"><Trash2Icon size={16} /> Delete page</button>
									{/snippet}
								</Popover>
							{/snippet}
							{#snippet cell(position, tile)}
								<BinderCell
									at={{ page: pageIndex, position }}
									menuOpen={menuAt?.page === pageIndex && menuAt.position === position}
									number={pageIndex * binder.slotsPerPage + position + 1}
									onMenu={at => (menuAt = at)}
									target={binder.nextEmpty === pageIndex * binder.slotsPerPage + position}
									{tile}
								/>
							{/snippet}
						</BinderPage>
					</div>
				{/each}
			</div>
		{/key}

		<!-- Its wrapper takes no pointer events, so a card can still be dropped on the pockets behind it: only the tiles take clicks. -->
		{#if showStart}
			<div class="pointer-events-none absolute inset-0 z-10 grid place-items-center p-3">
				<div class="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl bg-gray-900/90 p-4 text-center ring-1 ring-gold-400/30 backdrop-blur-sm motion-safe:animate-pop">
					<p class="text-lg font-semibold text-gold-400">Start your binder</p>
					<p class="text-sm text-gray-300">Pick a source, then drag cards onto the pockets or let Fill do it</p>
					<div class="grid w-full grid-cols-3 gap-2">
						{#each STARTS as { icon: Icon, label, tab } (tab)}
							<button
								class="pointer-events-auto focus-ring flex flex-col items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-1 py-3 text-xs text-gray-200 transition-all hover:border-gold-400 hover:text-gold-400 motion-safe:hover:-translate-y-0.5"
								onclick={async () => {
									binder.setView({ tab });
									onBrowse?.();
									/** On a phone the panel only shows after the update. */
									await tick();
									document.getElementById(`cards-tab-${tab}`)?.focus();
								}}
								type="button"
							>
								<Icon size={20} />
								{label}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<PageStrip />
</div>

<SlotMenu at={menuAt} onClose={() => (menuAt = null)} />
