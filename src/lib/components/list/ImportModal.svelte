<script lang="ts">
	import Modal from '@components/ui/Modal.svelte';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { detectColumns, MAX_IMPORT_ROWS, toImportRows, type ColumnMapping, type ImportRow } from '$helpers/collection-import';
	import { invalidateAll } from '$app/navigation';
	import { parseDelimited } from '$helpers/csv';
	import type { Set as CardSet } from '$lib/types';
	import type { UserCardsKind } from '$helpers/user-cards-page';

	interface Summary {
		added: number;
		failure?: string;
		matchedCards: number;
		skipped: number;
		unmatched: ImportRow[];
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
	let columns = $state<ColumnMapping>({ code: -1, name: -1, number: -1, quantity: [], set: -1 });
	let dataRows = $state<string[][]>([]);
	let fault = $state('');
	let fileName = $state('');
	let headers = $state<string[]>([]);
	let imported = $state(false);
	let setOverride = $state('');
	let summary = $state<Summary | null>(null);

	const sortedSets = $derived([...sets].sort((a, b) => a.name.localeCompare(b.name)));
	const rows = $derived(toImportRows(dataRows, columns));
	const needsSet = $derived(columns.set < 0 && columns.code < 0);

	function reset() {
		columns = { code: -1, name: -1, number: -1, quantity: [], set: -1 };
		dataRows = [];
		fault = '';
		fileName = '';
		headers = [];
		imported = false;
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

		headers = table[0];
		dataRows = table.slice(1, MAX_IMPORT_ROWS + 1);
		columns = detectColumns(headers);
		if (columns.number < 0 && columns.code < 0) fault = `No card number column found among: ${headers.join(', ')}. Pick one below.`;
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
			summary = payload as Summary;
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

{#snippet picker(label: string, value: number, onPick: (index: number) => void)}
	<label class="flex flex-col gap-1 text-xs text-gray-400">
		{label}
		<select class="rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-white" onchange={event => onPick(Number(event.currentTarget.value))} {value}>
			<option value={-1}>None</option>
			{#each headers as header, index (index)}
				<option value={index}>{header || `Column ${index + 1}`}</option>
			{/each}
		</select>
	</label>
{/snippet}

<Modal containerClass="max-w-2xl" onClose={close} {open} title={`Import ${kind === 'wishlist' ? 'wishlist' : 'collection'}`}>
	<div class="flex flex-col gap-4 text-sm text-gray-200">
		<p class="text-gray-400">
			Takes a CSV, TSV or tab-separated clipboard dump - a Pokécardex export, a Cardmarket list, a spreadsheet of your own.
			Columns are detected from the header line and can be repointed below. Cards already owned are topped up, never duplicated past 99 copies.
		</p>

		<label class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-600 px-4 py-6 text-gold-400 hover:border-gold-400">
			<UploadIcon size={18} />
			{fileName || 'Choose a file'}
			<input accept=".csv,.tsv,.txt,text/csv,text/plain" class="hidden" onchange={onFile} type="file" />
		</label>

		{#if headers.length > 0}
			<div class="grid gap-3 sm:grid-cols-3">
				{@render picker('Card number', columns.number, index => (columns = { ...columns, number: index }))}
				{@render picker('Set', columns.set, index => (columns = { ...columns, set: index }))}
				{@render picker('Card name', columns.name, index => (columns = { ...columns, name: index }))}
			</div>

			{#if needsSet}
				<label class="flex flex-col gap-1 text-xs text-gray-400">
					The file names no set, so every line is read as one card of:
					<select bind:value={setOverride} class="rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-white">
						<option value="">Pick a set</option>
						{#each sortedSets as set (set.setId ?? set.name)}
							<option value={set.setId ?? set.name}>{set.name}</option>
						{/each}
					</select>
				</label>
			{/if}

			<p class="text-gray-400">
				{rows.length} importable line{rows.length === 1 ? '' : 's'}
				{#if columns.quantity.length > 0}, counting {columns.quantity.map(index => headers[index]).join(' + ')}{/if}
			</p>
		{/if}

		{#if summary}
			<div class="rounded-lg bg-gray-900/60 p-3">
				<p class="text-white">
					{#if imported}Added {summary.added} card{summary.added === 1 ? '' : 's'}{:else}{summary.added} card{summary.added === 1 ? '' : 's'} would be added{/if}
					over {summary.matchedCards} matched card{summary.matchedCards === 1 ? '' : 's'}.
				</p>
				{#if summary.skipped > 0}<p class="text-gray-400">{summary.skipped} copies skipped, already owned or over the 99 limit.</p>{/if}
				{#if summary.unmatchedCount > 0}
					<p class="mt-2 text-orange-400">{summary.unmatchedCount} line{summary.unmatchedCount === 1 ? '' : 's'} matched no card:</p>
					<ul class="mt-1 max-h-32 overflow-y-auto text-xs text-gray-400">
						{#each summary.unmatched as row, index (index)}
							<li>{row.set ? `${row.set} ` : ''}{row.number}{row.name ? ` - ${row.name}` : ''}</li>
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
