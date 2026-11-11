<script lang="ts">
	import { formatEuros } from '#helpers/format.ts';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import XIcon from '@lucide/svelte/icons/x';

	let noticeDismissed = $state(false);

	/**
	 * Everything here reads the store, which draws its one-page default on the server and in the first client render, so the figures
	 * match until `load()` runs. The notice, the last action and the save error only exist after it.
	 */
	const totalSlots = $derived(binder.pages.length * binder.slotsPerPage);
	const placedValue = $derived(binder.pages.flat().reduce((sum, key) => sum + (key ? binderCards.get(key)?.price ?? 0 : 0), 0));
</script>

<div class="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300">
	<span class="tabular-nums">{binder.filledSlots}/{totalSlots} slots filled</span>
	<span class="tabular-nums">{binder.trayLeft} in the tray to place</span>
	<span class="tabular-nums">{formatEuros(placedValue)} placed</span>

	{#if binder.armed}
		<span class="flex items-center gap-2 text-gold-400">
			Placing {binderCards.tile(binder.armed).name}: click a slot, Esc cancels
			<button class="focus-ring rounded border border-gold-400/60 px-2 py-0.5 hover:bg-gold-400/10" onclick={() => (binder.armed = null)} type="button">Cancel</button>
		</span>
	{/if}

	<span aria-live="polite">
		{#if binder.lastAction}{binder.lastAction}{#if binder.canUndo}<span class="ml-1 text-gray-500">Ctrl+Z to undo</span>{/if}{/if}
	</span>

	{#if binder.notice && !noticeDismissed}
		<span class="flex items-center gap-1 text-amber-300">
			{binder.notice}
			<button aria-label="Dismiss this message" class="focus-ring rounded p-0.5 hover:bg-white/10" onclick={() => (noticeDismissed = true)} title="Dismiss" type="button">
				<XIcon size={12} />
			</button>
		</span>
	{/if}

	{#if binder.saveError}
		<span class="text-red-400" role="alert">{binder.saveError}</span>
	{/if}
</div>
