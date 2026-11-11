<script lang="ts">
	import { page } from '$app/state';
	import SharedBinders from '#components/binder/SharedBinders.svelte';
	import UnpublishButton from '#components/binder/UnpublishButton.svelte';
	import Modal from '#components/ui/Modal.svelte';
	import { parseShareInput, toShareInput } from '#helpers/binder.ts';
	import type { BinderShareSummary } from '#lib/types.js';
	import { binder } from '#stores/binder.svelte.ts';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import ImageOffIcon from '@lucide/svelte/icons/image-off';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import Share2Icon from '@lucide/svelte/icons/share-2';

	interface Props {
		onClose: () => void;
		open: boolean;
		/** Printed on the public page, so the dialog says whose name that is. */
		username: string;
	}

	interface Reply { error?: string; id?: string; ok: boolean; shares?: BinderShareSummary[]; status: number }

	let { onClose, open, username }: Props = $props();

	let busy = $state(false);
	let copied = $state(false);
	let copyFailed = $state(false);
	let failure = $state<string | null>(null);
	let field = $state<HTMLInputElement>();
	/** Raw: the list is only ever replaced by the next answer. `null` until the first one. */
	let shares = $state.raw<readonly BinderShareSummary[] | null>(null);
	let listError = $state<string | null>(null);
	let listLoading = $state(false);
	/** Link of a replaced share that could not be deleted, shown so it can be opened and unpublished. */
	let staleLink = $state<string | null>(null);
	/** Numbers the list requests, so an answer that arrives after a newer request is dropped. */
	let loads = 0;

	const shareId = $derived(binder.shareOf(binder.activeId, username));
	const link = $derived(`${page.url.origin}/binder/${shareId}`);
	/** Stringifies the binder, so it only runs while the dialog is open. */
	const prepared = $derived(open ? toShareInput(binder.active) : null);
	/** The server runs the same check, so the button is disabled for exactly the binders it would refuse. */
	const blocked = $derived.by(() => {
		const verdict = prepared && parseShareInput(prepared.input);
		return typeof verdict === 'string' ? verdict : null;
	});

	$effect(() => {
		if (!copied) return;
		const timer = setTimeout(() => (copied = false), 1500);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (open) loadShares();
	});

	function close() {
		failure = null;
		staleLink = null;
		copyFailed = false;
		onClose();
	}

	async function request(url: string, init: RequestInit = {}): Promise<Reply> {
		const response = await fetch(url, init);
		const body = (await response.json().catch(() => null)) as Pick<Reply, 'error' | 'id' | 'shares'> | null;
		return { ...body, ok: response.ok, status: response.status };
	}

	async function loadShares() {
		const load = ++loads;
		listLoading = true;
		listError = null;
		try {
			const reply = await request('/api/binder/shares');
			if (load !== loads) return;
			if (reply.ok && reply.shares) shares = reply.shares;
			else listError = reply.error ?? 'Your shared binders could not be loaded.';
		} catch {
			if (load === loads) listError = 'Your shared binders could not be loaded. Check your connection.';
		} finally {
			if (load === loads) listLoading = false;
		}
	}

	/** The new link is created before the old one is deleted, so a failed publish changes nothing. A 404 on the old one means it is already gone. */
	async function publish() {
		if (!prepared) return;
		const binderId = binder.activeId;
		const previous = shareId;
		busy = true;
		failure = null;
		staleLink = null;
		try {
			const created = await request('/api/binder/shares', { body: JSON.stringify(prepared.input), headers: { 'content-type': 'application/json' }, method: 'POST' });
			if (!created.ok || !created.id) {
				const message = created.error ?? 'The binder could not be shared.';
				failure = created.status === 403 ? `${message} Unpublishing one from the list below frees a slot.` : message;
				return;
			}

			binder.setShare(binderId, created.id, username);
			if (previous) {
				const removed = await request(`/api/binder/shares/${previous}`, { method: 'DELETE' });
				if (!removed.ok && removed.status !== 404) {
					staleLink = `${page.url.origin}/binder/${previous}`;
					failure = 'The new link is ready, but the old one could not be removed. Open it and unpublish it from its page, or from the list below:';
				}
			}
			await loadShares();
		} catch {
			failure = 'The binder could not be shared. Check your connection.';
		} finally {
			busy = false;
		}
	}

	/** Used by the current binder's button and by the list: the share leaves every binder entry that pointed at it, then the list is read again. */
	async function unpublish(id: string) {
		busy = true;
		failure = null;
		staleLink = null;
		try {
			const removed = await request(`/api/binder/shares/${id}`, { method: 'DELETE' });
			if (removed.ok || removed.status === 404) {
				binder.clearShare(id);
				await loadShares();
			} else failure = removed.error ?? 'The binder could not be unpublished.';
		} catch {
			failure = 'The binder could not be unpublished. Check your connection.';
		} finally {
			busy = false;
		}
	}

	/** The clipboard rejects without a permission or a secure context: the field is selected instead, so the link can be copied by hand. */
	async function copy() {
		copyFailed = false;
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
		} catch {
			copyFailed = true;
			field?.select();
		}
	}
</script>

<Modal containerClass="max-w-lg" onClose={close} {open} title="Share {binder.active.name}">
	<div class="flex flex-col gap-4 text-sm text-gray-200">
		<p class="flex items-start gap-3 rounded-lg bg-gray-900/60 p-3">
			<GlobeIcon class="mt-0.5 shrink-0 text-gold-400" size={18} />
			<span>
				A shared binder is public, not only reachable by its link: it is listed with your username (<strong class="text-white">{username}</strong>) and anyone can find and open it.
				It is a snapshot: later changes are not in it until you publish again.
			</span>
		</p>

		{#if prepared && prepared.dropped > 0}
			<p class="flex items-start gap-3 rounded-lg bg-amber-500/10 p-3 text-amber-200 ring-1 ring-amber-400/30">
				<ImageOffIcon class="mt-0.5 shrink-0" size={18} />
				<span>
					{prepared.dropped} card{prepared.dropped > 1 ? 's' : ''} added from an image URL {prepared.dropped > 1 ? 'are' : 'is'} left out of it, since a public page on this site only shows catalogue cards.
				</span>
			</p>
		{/if}

		{#if shareId}
			<div class="flex flex-col gap-2 rounded-lg bg-green-500/10 p-3 ring-1 ring-green-400/40">
				<p class="flex items-center gap-2 font-semibold text-green-300"><CircleCheckIcon size={18} /> Published</p>
				<input
					aria-label="Link to the shared binder"
					bind:this={field}
					class="focus-ring h-9 w-full rounded border-2 border-gray-600 bg-gray-900 px-2 text-white"
					onfocus={event => event.currentTarget.select()}
					readonly
					value={link}
				/>
				<div class="flex flex-wrap gap-2">
					<button class="btn-secondary px-3 py-1.5 text-sm" onclick={copy} type="button">
						{#if copied}<CheckIcon class="text-green-400" size={16} /> Copied{:else}<CopyIcon size={16} /> Copy link{/if}
					</button>
					<a class="btn-secondary px-3 py-1.5 text-sm" href={link} rel="noopener" target="_blank"><ExternalLinkIcon size={16} /> Open</a>
				</div>
				{#if copyFailed}<p class="text-xs text-amber-300">The browser blocked the copy. The link is selected: press Ctrl+C.</p>{/if}
			</div>
		{/if}

		{#if failure}
			<p class="flex items-start gap-3 rounded-lg bg-red-500/10 p-3 text-red-300 ring-1 ring-red-400/40" role="alert">
				<CircleAlertIcon class="mt-0.5 shrink-0" size={18} />
				<span>
					{failure}
					{#if staleLink}<a class="break-all underline" href={staleLink} rel="noopener" target="_blank">{staleLink}</a>{/if}
				</span>
			</p>
		{/if}

		<div class="flex flex-wrap items-center gap-2">
			<button class={shareId ? 'btn-secondary' : 'btn-gold'} disabled={busy || blocked !== null} onclick={publish} type="button">
				{#if busy}<LoaderCircleIcon class="motion-safe:animate-spin" size={16} />{:else if shareId}<RefreshCwIcon size={16} />{:else}<Share2Icon size={16} />{/if}
				{shareId ? 'Publish again (replaces this link)' : 'Publish'}
			</button>
			{#if shareId}<UnpublishButton disabled={busy} onConfirm={() => unpublish(shareId)} />{/if}
		</div>
		{#if blocked}<p class="text-xs text-gray-400">{blocked}</p>{/if}

		{#if shares?.length}
			<SharedBinders {busy} onUnpublish={unpublish} {shares} />
		{:else if listLoading && !shares}
			<p class="flex items-center gap-2 text-xs text-gray-400"><LoaderCircleIcon class="motion-safe:animate-spin" size={14} /> Loading your shared binders</p>
		{/if}
		{#if listError}
			<p class="flex flex-wrap items-center gap-2 text-xs text-red-300" role="alert">
				{listError}
				<button class="focus-ring rounded underline" disabled={listLoading} onclick={loadShares} type="button">Try again</button>
			</p>
		{/if}
	</div>
</Modal>
