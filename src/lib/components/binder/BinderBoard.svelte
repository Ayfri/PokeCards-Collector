<script lang="ts">
	import BinderPage from '@components/binder/BinderPage.svelte';
	import Button from '@components/filters/Button.svelte';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import EraserIcon from '@lucide/svelte/icons/eraser';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import type { BinderCards } from '$lib/types';

	interface Props {
		columns: number;
		currentPage: number;
		onAddPage: () => void;
		onClearPages: (pageIndices: number[]) => void;
		onDeletePages: (pageIndices: number[]) => void;
		onDrop: (pageIndex: number, position: number, event: DragEvent) => void;
		onDuplicatePages: (pageIndices: number[]) => void;
		onGoTo: (pageIndex: number) => void;
		onRemove: (pageIndex: number, position: number) => void;
		onSlotClick: (pageIndex: number, position: number) => void;
		pages: Array<Array<BinderCards | null>>;
		rows: number;
		/** Global index of the slot a click-to-place would fill, `-1` when nothing is armed. */
		nextEmpty?: number;
		/** Facing-pages view, as the binder actually opens. */
		spread: boolean;
	}

	let {
		columns,
		currentPage,
		nextEmpty = -1,
		onAddPage,
		onClearPages,
		onDeletePages,
		onDrop,
		onDuplicatePages,
		onGoTo,
		onRemove,
		onSlotClick,
		pages,
		rows,
		spread
	}: Props = $props();

	const slotsPerPage = $derived(rows * columns);
	/** A spread always opens on an even page, so page 1 sits left of page 2 the way the sheets are bound. */
	const leftIndex = $derived(spread ? currentPage - (currentPage % 2) : currentPage);
	const visible = $derived(spread ? [leftIndex, leftIndex + 1].filter(index => index < pages.length) : [currentPage]);
	const step = $derived(spread ? 2 : 1);
	/** The page actions work on whatever is on screen, so a spread is cleared or deleted as a whole. */
	const actionTarget = $derived(visible.length > 1 ? 'both pages on screen' : 'the current page');
	/** Deleting the last page leaves a fresh empty one, so the only pointless case is a binder that is already just that. */
	const nothingToDelete = $derived(pages.length === 1 && !pages[0].some(Boolean));

	function nextEmptyOn(pageIndex: number) {
		if (nextEmpty < 0) return -1;
		const page = Math.floor(nextEmpty / slotsPerPage);
		return page === pageIndex ? nextEmpty % slotsPerPage : -1;
	}
</script>

<div class="flex h-full flex-col gap-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<Button class="px-2" disabled={visible[0] === 0} onClick={() => onGoTo(Math.max(0, leftIndex - step))} title="Previous page">
				<ChevronLeftIcon size={16} />
			</Button>
			<div class="flex items-center gap-1 rounded-sm border-2 border-white/20 px-3 h-8 text-sm text-white tabular-nums">
				{#if visible.length > 1}
					{visible[0] + 1}-{visible[1] + 1}
				{:else}
					{currentPage + 1}
				{/if}
				<span class="text-gray-400">/ {pages.length}</span>
			</div>
			<Button class="px-2" disabled={leftIndex + step >= pages.length} onClick={() => onGoTo(Math.min(pages.length - 1, leftIndex + step))} title="Next page">
				<ChevronRightIcon size={16} />
			</Button>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<Button class="text-xs px-2" onClick={onAddPage} title="Append an empty page">
				<PlusIcon size={14} /> Page
			</Button>
			<Button class="text-xs px-2" onClick={() => onDuplicatePages(visible)} title="Duplicate {actionTarget}">
				<CopyIcon size={14} /> Duplicate
			</Button>
			<Button class="text-xs px-2" onClick={() => onClearPages(visible)} title="Empty every slot of {actionTarget}">
				<EraserIcon size={14} /> Clear
			</Button>
			<Button class="text-xs px-2" disabled={nothingToDelete} onClick={() => onDeletePages(visible)} title="Delete {actionTarget}">
				<Trash2Icon size={14} /> Delete
			</Button>
		</div>
	</div>

	<!-- Binder body: the sheets sit on a dark cover, split by a ringed spine when both facing pages show. -->
	<div class="flex min-h-0 flex-1 justify-center rounded-2xl bg-gray-900 p-3 ring-1 ring-white/5 inset-shadow-sm">
		<div class="flex h-full w-full items-stretch justify-center gap-2">
			{#each visible as pageIndex (pageIndex)}
				{#if spread && pageIndex === visible[1]}
					<div class="flex w-6 shrink-0 flex-col items-center justify-center gap-6 rounded bg-black/40">
						{#each Array(3) as _, ring (ring)}
							<span class="size-3 rounded-full border-2 border-gray-600 bg-gray-800"></span>
						{/each}
					</div>
				{/if}
				<div class="min-w-0 flex-1">
					<BinderPage
						{columns}
						nextEmpty={nextEmptyOn(pageIndex)}
						{onDrop}
						{onRemove}
						{onSlotClick}
						{pageIndex}
						{rows}
						slots={pages[pageIndex] ?? []}
					/>
				</div>
			{/each}
		</div>
	</div>
</div>
