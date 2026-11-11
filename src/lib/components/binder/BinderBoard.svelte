<script lang="ts">
	import BinderCell from '#components/binder/BinderCell.svelte';
	import BinderPage from '#components/binder/BinderPage.svelte';
	import PageStrip from '#components/binder/PageStrip.svelte';
	import Popover from '#components/ui/Popover.svelte';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import EraserIcon from '@lucide/svelte/icons/eraser';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import type { BinderTile } from '#lib/types.js';

	/** Deleting the last page leaves a fresh empty one, so delete does nothing useful only when the binder is already a single empty page. */
	const nothingToDelete = $derived(binder.pages.length === 1 && !binder.pages[0].some(Boolean));

	const ITEM = 'focus-ring flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm whitespace-nowrap text-gray-300 transition-colors enabled:hover:bg-gray-700 enabled:hover:text-gold-400 disabled:opacity-50';
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3">
	<!-- The sheets sit on a dark cover, split by a ringed spine when both facing pages show. -->
	<div class="flex min-h-0 flex-1 justify-center rounded-2xl bg-gray-900 p-3 ring-1 ring-white/5 inset-shadow-sm">
		<div class="flex h-full w-full items-stretch justify-center gap-2">
			{#each binder.visiblePages as pageIndex, index (pageIndex)}
				{#if index === 1}
					<div class="flex w-6 shrink-0 flex-col items-center justify-center gap-6 rounded bg-black/40">
						{#each Array(3) as _, ring (ring)}
							<span class="size-3 rounded-full border-2 border-gray-600 bg-gray-800"></span>
						{/each}
					</div>
				{/if}
				{#snippet cell(position: number, tile: BinderTile | null)}
					<BinderCell
						at={{ page: pageIndex, position }}
						number={pageIndex * binder.slotsPerPage + position + 1}
						target={binder.nextEmpty === pageIndex * binder.slotsPerPage + position}
						{tile}
					/>
				{/snippet}
				<div class="min-w-0 flex-1">
					<BinderPage
						{cell}
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
									<button class={ITEM} onclick={() => { binder.emptyPage(pageIndex); close(); }} type="button"><EraserIcon size={16} /> Empty page</button>
									<button class={ITEM} disabled={pageIndex === 0} onclick={() => { binder.movePage(pageIndex, pageIndex - 1); close(); }} type="button"><ArrowLeftIcon size={16} /> Move earlier</button>
									<button class={ITEM} disabled={pageIndex === binder.pages.length - 1} onclick={() => { binder.movePage(pageIndex, pageIndex + 1); close(); }} type="button"><ArrowRightIcon size={16} /> Move later</button>
									<button class={ITEM} disabled={nothingToDelete} onclick={() => { binder.deletePage(pageIndex); close(); }} type="button"><Trash2Icon size={16} /> Delete page</button>
								{/snippet}
							</Popover>
						{/snippet}
					</BinderPage>
				</div>
			{/each}
		</div>
	</div>

	<PageStrip />
</div>
