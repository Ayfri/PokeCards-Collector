<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import Modal from '@components/ui/Modal.svelte';
	import SearchXIcon from '@lucide/svelte/icons/search-x';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { detectColumns, MAX_IMPORT_ROWS, toImportRows } from '$helpers/collection-import';
	import { invalidateAll } from '$app/navigation';
	import { parseDelimited } from '$helpers/csv';
	import type { Set as CardSet } from '$lib/types';
	import type { UserCardsKind } from '$helpers/user-cards-page';

	interface Summary {
		added: number;
		failure?: string;
		matchedCards: number;
		skipped: number;
		unmatchedBySet: { count: number; set: string }[];
		unmatchedCount: number;
	}

	interface Props {
		kind: UserCardsKind;
		onClose: () => void;
		open: boolean;
		sets: CardSet[];
	}

	let { kind, onClose, open, sets }: Props = $props();

	let busy = $state(false);
	let fault = $state('');
	let fileName = $state('');
	let imported = $state(false);
	let rows = $state<ReturnType<typeof toImportRows>>([]);
	let needsSet = $state(false);
	let setOverride = $state('');
	let summary = $state<Summary | null>(null);

	const sortedSets = $derived([...sets].sort((a, b) => a.name.localeCompare(b.name)));

	function reset() {
		fault = '';
		fileName = '';
		imported = false;
		needsSet = false;
		rows = [];
		summary = null;
	}

	async function onFile(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;

		reset();
		fileName = file.name;
		const table = parseDelimited(await file.text());
		if (table.length < 2) {
			fault = 'That file holds no data line under its header.';
			return;
		}

		const columns = detectColumns(table[0]);
		if (columns.number < 0 && columns.code < 0) {
			fault = `No card number column in that file. Its columns are: ${table[0].join(', ')}.`;
			return;
		}

		needsSet = columns.set < 0 && columns.code < 0;
		rows = toImportRows(table.slice(1, MAX_IMPORT_ROWS + 1), columns);
		if (rows.length === 0) fault = 'Every line of that file holds zero copies.';
	}

	async function send(dryRun: boolean) {
		busy = true;
		fault = '';
		try {
			const response = await fetch('/api/collection/import', {
				body: JSON.stringify({ dryRun, kind, rows, setOverride: setOverride || undefined }),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			});
			const payload = await response.json() as Summary & { message?: string };
			if (!response.ok && response.status !== 207) {
				fault = payload?.message ?? `Import failed (${response.status}).`;
				return;
			}
			summary = payload;
			if (!dryRun) {
				imported = true;
				await invalidateAll();
			}
		} catch (cause) {
			fault = cause instanceof Error ? cause.message : 'Import failed.';
		} finally {
			busy = false;
		}
	}

	function close() {
		reset();
		onClose();
	}
</script>

<Modal containerClass="max-w-xl" onClose={close} {open} title={`Import ${kind === 'wishlist' ? 'wishlist' : 'collection'}`}>
	<div class="flex flex-col gap-4 text-sm text-gray-200">
		<p class="text-gray-400">
			Takes the CSV a Pokécardex, Cardmarket or TCGCollector export gives you, in any of the six languages they print set names in.
			Columns and separator are read from the file. Cards you already own are topped up, never duplicated past 99 copies.
		</p>

		<label class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-600 px-4 py-6 text-gold-400 hover:border-gold-400">
			<UploadIcon size={18} />
			{fileName || 'Choose a file'}
			<input accept=".csv,.tsv,.txt,text/csv,text/plain" class="hidden" onchange={onFile} type="file" />
		</label>

		{#if rows.length > 0}
			<p class="text-gray-400">{rows.length} card line{rows.length === 1 ? '' : 's'} read from {fileName}.</p>
		{/if}

		{#if needsSet}
			<label class="flex flex-col gap-1 text-xs text-gray-400">
				That file names no set, so every line is read as a card of:
				<select bind:value={setOverride} class="rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-white">
					<option value="">Pick a set</option>
					{#each sortedSets as set (set.setId ?? set.name)}
						<option value={set.setId ?? set.name}>{set.name}</option>
					{/each}
				</select>
			</label>
		{/if}

		{#if summary}
			<div class="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
				<div class="flex items-center gap-3">
					<span class={['flex size-10 shrink-0 items-center justify-center rounded-full', summary.added > 0 ? 'bg-gold-400/15 text-gold-400' : 'bg-gray-700/60 text-gray-400']}>
						{#if summary.added > 0}<CircleCheckIcon size={20} />{:else}<SearchXIcon size={20} />{/if}
					</span>
					<div class="min-w-0">
						<p class="text-base text-white">
							{#if summary.added > 0}
								{summary.added} card{summary.added === 1 ? '' : 's'} {imported ? `added to your ${kind}` : 'ready to import'}
							{:else}
								Nothing new to add
							{/if}
						</p>
						<p class="text-xs text-gray-400">
							{summary.matchedCards} card{summary.matchedCards === 1 ? '' : 's'} recognised{#if summary.skipped > 0}, {summary.skipped} cop{summary.skipped === 1 ? 'y' : 'ies'} you already had{/if}
						</p>
					</div>
				</div>

				{#if summary.unmatchedCount > 0}
					<details class="mt-4 border-t border-gray-700 pt-3">
						<summary class="flex cursor-pointer list-none items-center gap-2 text-gray-300 hover:text-white">
							<span class="grow">{summary.unmatchedCount} card{summary.unmatchedCount === 1 ? '' : 's'} we could not place</span>
							<ChevronDownIcon class="chevron shrink-0" size={16} />
						</summary>
						<p class="mt-2 text-xs text-gray-400">
							Their sets are not in our catalogue yet, or your file spells them differently. Everything else imports normally.
						</p>
						<ul class="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
							{#each summary.unmatchedBySet as group (group.set)}
								<li class="flex items-center justify-between gap-3 rounded-lg bg-gray-800/70 px-3 py-1.5">
									<span class="truncate text-gray-200">{group.set || 'Set not named'}</span>
									<span class="shrink-0 rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">{group.count}</span>
								</li>
							{/each}
						</ul>
					</details>
				{/if}

				{#if summary.failure}<p class="mt-3 text-red-400">Stopped early: {summary.failure}</p>{/if}
			</div>
		{/if}

		{#if fault}<p class="text-red-400">{fault}</p>{/if}
	</div>

	{#snippet footer()}
		<button class="rounded-lg px-4 py-2 text-gray-300 hover:text-white" onclick={close} type="button">Close</button>
		<button
			class="rounded-lg bg-gray-700 px-4 py-2 text-white disabled:opacity-40"
			disabled={busy || rows.length === 0 || (needsSet && !setOverride)}
			onclick={() => send(true)}
			type="button"
		>
			Preview
		</button>
		<button
			class="rounded-lg bg-gold-400 px-4 py-2 font-medium text-gray-900 disabled:opacity-40"
			disabled={busy || !summary || imported || summary.added === 0}
			onclick={() => send(false)}
			type="button"
		>
			{busy ? 'Working...' : `Import ${summary?.added ?? 0}`}
		</button>
	{/snippet}
</Modal>

<style>
	/* The disclosure arrow is drawn by the icon, and it points up once the list is open. */
	summary::-webkit-details-marker {
		display: none;
	}

	summary :global(.chevron) {
		transition: transform 150ms ease;
	}

	details[open] :global(.chevron) {
		transform: rotate(180deg);
	}
</style>
