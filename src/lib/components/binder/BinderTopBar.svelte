<script lang="ts">
	import Button from '#components/filters/Button.svelte';
	import NumberInput from '#components/filters/NumberInput.svelte';
	import Popover from '#components/ui/Popover.svelte';
	import { downloadDataUrl, renderBinderImage } from '#helpers/binder-export.ts';
	import { MAX_POCKETS } from '#helpers/binder.ts';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import EraserIcon from '@lucide/svelte/icons/eraser';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import Redo2Icon from '@lucide/svelte/icons/redo-2';
	import Undo2Icon from '@lucide/svelte/icons/undo-2';

	interface Props {
		/** Stamped in the corner of the exported image. */
		username?: string;
	}

	let { username }: Props = $props();

	/** The pocket layouts real binders actually ship in. */
	const PRESETS = [
		{ columns: 2, label: '4', rows: 2 },
		{ columns: 3, label: '9', rows: 3 },
		{ columns: 3, label: '12', rows: 4 },
		{ columns: 4, label: '16', rows: 4 }
	];

	/** Drafts follow the store, so an undo or a clamp rewrites the field, and are committed once per finished edit (`change`, not each keystroke). */
	let columnsDraft = $derived(binder.columns);
	let rowsDraft = $derived(binder.rows);

	/** The store clamps and ignores an empty field. Writing its value back also resets a field the clamp left unchanged, such as 12 typed over 8. */
	function commitLayout() {
		binder.setLayout({ columns: columnsDraft, rows: rowsDraft });
		columnsDraft = binder.columns;
		rowsDraft = binder.rows;
	}

	let exporting = $state(false);
	let exportError = $state<string | null>(null);

	/** The pages on screen are consecutive, so their label and file name are a first-last range. */
	const visibleNumbers = $derived(binder.visiblePages.map(index => index + 1));
	const visibleRange = $derived(visibleNumbers.length > 1 ? `${visibleNumbers[0]}-${visibleNumbers.at(-1)}` : `${visibleNumbers[0]}`);

	async function exportPages(indices: readonly number[], filename: string, close: () => void) {
		exporting = true;
		exportError = null;
		try {
			const pages = indices.map(index => ({
				images: binder.pages[index].map(key => (key === null ? null : binderCards.get(key)?.image ?? null)),
				number: index + 1
			}));
			downloadDataUrl(await renderBinderImage({ columns: binder.columns, pages, rows: binder.rows, username }), filename);
			close();
		} catch (error) {
			console.error('Error generating binder image:', error);
			exportError = 'An error occurred while generating the image.';
		} finally {
			exporting = false;
		}
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<Button class="px-2" disabled={!binder.canUndo} onClick={() => binder.undo()} title="Undo (Ctrl+Z)">
		<Undo2Icon size={16} />
	</Button>
	<Button class="px-2" disabled={!binder.canRedo} onClick={() => binder.redo()} title="Redo (Ctrl+Shift+Z)">
		<Redo2Icon size={16} />
	</Button>

	<Popover label="Pocket layout and spread">
		{#snippet trigger()}
			<LayoutGridIcon size={16} /> <span class="max-sm:sr-only">Layout</span>
		{/snippet}
		<div class="flex w-64 flex-col gap-3">
			<div class="flex flex-col gap-1">
				<span class="text-xs text-gray-300">Pocket layout:</span>
				<div class="grid grid-cols-4 gap-1">
					{#each PRESETS as preset (preset.label)}
						<Button
							class="px-1 text-xs"
							isActive={binder.rows === preset.rows && binder.columns === preset.columns}
							onClick={() => binder.setLayout({ columns: preset.columns, rows: preset.rows })}
							title="{preset.rows} x {preset.columns} pages, {preset.label} pockets"
						>
							{preset.label}
						</Button>
					{/each}
				</div>
			</div>

			<div class="flex gap-2">
				<NumberInput bind:value={rowsDraft} id="binder-rows" label="Rows:" max={MAX_POCKETS} min={1} onChange={commitLayout} />
				<NumberInput bind:value={columnsDraft} id="binder-columns" label="Columns:" max={MAX_POCKETS} min={1} onChange={commitLayout} />
			</div>

			<div class="flex flex-col gap-1">
				<button
					aria-pressed={binder.spread}
					class={[
						'focus-ring flex h-8 items-center justify-center gap-2 rounded border-2 bg-transparent px-3 text-sm transition-colors hover:border-gold-400',
						binder.spread ? 'border-gold-400 text-gold-400' : 'border-white text-white'
					]}
					onclick={() => binder.setSpread(!binder.spread)}
					title="Show both facing pages, the way the binder opens"
					type="button"
				>
					<BookOpenIcon size={16} /> Spread
				</button>
				<span class="text-xs text-gray-400">Phones show one page at a time</span>
			</div>
		</div>
	</Popover>

	<Popover label="Download the binder as a PNG">
		{#snippet trigger()}
			{#if exporting}<LoaderCircleIcon class="animate-spin" size={16} />{:else}<DownloadIcon size={16} />{/if}
			<span class="max-sm:sr-only">Export</span>
		{/snippet}
		{#snippet children(close)}
			<div class="flex w-72 flex-col gap-3">
				<p class="text-sm text-gray-300">Pages render at 300px per card, numbered slot by slot so you can follow the sheet while filling the real binder.</p>
				{#if binder.filledSlots < binder.slotsPerPage * binder.pages.length}
					<p class="rounded-sm bg-gray-900 p-2 text-xs text-gray-400">Some slots are still empty - they export as numbered placeholders.</p>
				{/if}
				<div class="flex flex-col gap-2">
					<Button
						disabled={exporting}
						onClick={() => exportPages(binder.visiblePages, `binder-page${visibleNumbers.length > 1 ? 's' : ''}-${visibleRange}.png`, close)}
					>
						Page{visibleNumbers.length > 1 ? 's' : ''} on screen ({visibleRange})
					</Button>
					<Button
						disabled={exporting}
						onClick={() => exportPages(binder.pages.map((_, index) => index), 'binder-all-pages.png', close)}
					>
						All {binder.pages.length} pages
					</Button>
				</div>
				{#if exportError}<p class="text-xs text-red-400" role="alert">{exportError}</p>{/if}
			</div>
		{/snippet}
	</Popover>

	<Popover label="More actions">
		{#snippet trigger()}
			<EllipsisIcon size={16} />
		{/snippet}
		{#snippet children(close)}
			<button
				class="focus-ring flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm whitespace-nowrap text-gray-300 transition-colors hover:bg-gray-700 hover:text-gold-400"
				onclick={() => { binder.emptyAllPages(); close(); }}
				type="button"
			>
				<EraserIcon size={16} /> Empty every page
			</button>
		{/snippet}
	</Popover>
</div>
