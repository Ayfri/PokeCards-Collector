<script lang="ts">
	import { goto } from '$app/navigation';
	import BinderPage from '#components/binder/BinderPage.svelte';
	import UnpublishButton from '#components/binder/UnpublishButton.svelte';
	import PageHeader, { type PageStat } from '#components/PageHeader.svelte';
	import { binder } from '#stores/binder.svelte.ts';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import UserRoundIcon from '@lucide/svelte/icons/user-round';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let busy = $state(false);
	let failure = $state<string | null>(null);

	const stats = $derived<PageStat[]>([
		{ icon: LayersIcon, label: 'cards', value: String(data.cardCount) },
		{ icon: BookOpenIcon, label: 'pages', value: String(data.pages.length) },
		{ icon: LayoutGridIcon, label: 'pockets per page', value: `${data.pocketColumns} x ${data.pocketRows}` }
	]);

	/** The store is only touched here, never while rendering: the server draws this page without a `localStorage`. */
	function copyToMine() {
		binder.load();
		binder.importBinder({
			columns: data.pocketColumns,
			name: data.name,
			pages: data.pages.map(sheet => sheet.map(tile => tile?.key ?? null)),
			rows: data.pocketRows
		});
		goto('/binder');
	}

	/** A 404 means the share is already gone, which is what the owner asked for. */
	async function unpublish() {
		busy = true;
		failure = null;
		try {
			const response = await fetch(`/api/binder/shares/${data.shareId}`, { method: 'DELETE' });
			if (!response.ok && response.status !== 404) {
				failure = ((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? 'The binder could not be unpublished.';
				return;
			}

			binder.load();
			binder.clearShare(data.shareId);
			await goto('/binder');
		} catch {
			failure = 'The binder could not be unpublished. Check your connection.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="container mx-auto px-4 pb-8">
	<PageHeader class="mb-4" lede="A public read-only binder: open any card to see its page, or copy the binder to edit your own." {stats} title={data.name}>
		{#snippet meta()}
			<p class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300">
				<span class="flex items-center gap-1.5"><UserRoundIcon class="text-gold-400" size={16} /> {data.username}</span>
				<span class="flex items-center gap-1.5"><CalendarIcon class="text-gold-400" size={16} /> {data.sharedAt}</span>
			</p>
		{/snippet}
		{#snippet controls()}
			<div class="flex flex-wrap items-center gap-2">
				<button class="btn-gold" onclick={copyToMine} type="button"><CopyIcon size={16} /> Copy to my binders</button>
				{#if data.isOwner}
					<UnpublishButton disabled={busy} onConfirm={unpublish} />
					{#if busy}<LoaderCircleIcon class="animate-spin text-gray-400" size={16} />{/if}
				{/if}
			</div>
		{/snippet}
	</PageHeader>

	{#if failure}<p class="mb-3 text-sm text-red-400" role="alert">{failure}</p>{/if}

	<!-- The same dark cover as the builder. A sheet is as tall as its wrapper, which is sized from the pocket grid plus the sheet's header row. -->
	<div class="grid gap-4 rounded-2xl bg-gray-900 p-3 ring-1 ring-white/5 inset-shadow-sm md:grid-cols-2">
		{#each data.pages as slots, pageIndex (pageIndex)}
			<div class="min-w-0" style:aspect-ratio="{data.pocketColumns * 2.5} / {data.pocketRows * 3.5 + 0.6}">
				<BinderPage columns={data.pocketColumns} {pageIndex} rows={data.pocketRows} {slots} />
			</div>
		{/each}
	</div>
</div>
