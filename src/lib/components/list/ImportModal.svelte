<script lang="ts">
	import Modal from '@components/ui/Modal.svelte';
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
			<div class="rounded-lg bg-gray-900/60 p-3">
				<p class="text-white">
					{summary.added} card{summary.added === 1 ? '' : 's'} {imported ? 'added' : 'to add'}, over {summary.matchedCards} matched card{summary.matchedCards === 1 ? '' : 's'}.
				</p>
				{#if summary.skipped > 0}<p class="text-gray-400">{summary.skipped} cop{summary.skipped === 1 ? 'y' : 'ies'} skipped, already owned or over the 99 limit.</p>{/if}
				{#if summary.unmatchedCount > 0}
					<p class="mt-2 text-orange-400">{summary.unmatchedCount} line{summary.unmatchedCount === 1 ? '' : 's'} matched no card in the catalogue:</p>
					<ul class="mt-1 max-h-32 overflow-y-auto text-xs text-gray-400">
						{#each summary.unmatchedBySet as group (group.set)}
							<li>{group.set || 'no set named'} - {group.count}</li>
						{/each}
					</ul>
				{/if}
				{#if summary.failure}<p class="mt-2 text-red-400">Stopped early: {summary.failure}</p>{/if}
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
			class="rounded-lg bg-gold-500 px-4 py-2 font-medium text-gray-900 disabled:opacity-40"
			disabled={busy || !summary || imported || summary.added === 0}
			onclick={() => send(false)}
			type="button"
		>
			{busy ? 'Working...' : `Import ${summary?.added ?? 0}`}
		</button>
	{/snippet}
</Modal>
