<script lang="ts">
	import { page } from '$app/state';
	import UnpublishButton from '#components/binder/UnpublishButton.svelte';
	import { MAX_SHARES_PER_USER } from '#helpers/binder.ts';
	import { formatDate } from '#helpers/format.ts';
	import type { BinderShareSummary } from '#lib/types.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	interface Props {
		busy: boolean;
		onUnpublish: (id: string) => void;
		shares: readonly BinderShareSummary[];
	}

	let { busy, onUnpublish, shares }: Props = $props();

	let copiedId = $state<string | null>(null);
	let copyFailed = $state(false);

	$effect(() => {
		if (copiedId === null) return;
		const timer = setTimeout(() => (copiedId = null), 1500);
		return () => clearTimeout(timer);
	});

	/** The clipboard rejects without a permission or a secure context: the Open link of the row is the way to the address then. */
	async function copy(id: string) {
		copyFailed = false;
		try {
			await navigator.clipboard.writeText(`${page.url.origin}/binder/${id}`);
			copiedId = id;
		} catch {
			copyFailed = true;
		}
	}
</script>

<section aria-labelledby="shared-binders-title" class="flex flex-col gap-2">
	<h3 class="font-semibold text-white" id="shared-binders-title">Your shared binders ({shares.length} of {MAX_SHARES_PER_USER})</h3>
	<ul class="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
		{#each shares as share (share.id)}
			<li class="flex flex-col gap-1.5 rounded-lg bg-gray-900/60 p-2">
				<p class="flex items-baseline justify-between gap-2">
					<span class="truncate font-medium text-white">{share.name}</span>
					<span class="shrink-0 text-xs text-gray-400">{formatDate(share.createdAt)}, {share.pageCount} page{share.pageCount > 1 ? 's' : ''}</span>
				</p>
				<div class="flex flex-wrap items-center gap-1.5">
					<a class="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-gray-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-600" href="/binder/{share.id}" rel="noopener" target="_blank">
						<ExternalLinkIcon size={14} /> Open
					</a>
					<button class="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-gray-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-600" onclick={() => copy(share.id)} type="button">
						{#if copiedId === share.id}<CheckIcon class="text-green-400" size={14} /> Copied{:else}<CopyIcon size={14} /> Copy link{/if}
					</button>
					<UnpublishButton compact disabled={busy} onConfirm={() => onUnpublish(share.id)} />
				</div>
			</li>
		{/each}
	</ul>
	{#if copyFailed}<p class="text-xs text-amber-300">The browser blocked the copy. Use Open and copy the address from there.</p>{/if}
</section>
