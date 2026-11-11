<script lang="ts">
	import CardImage from '#components/card/CardImage.svelte';
	import ProgressBar from '#components/binder/ProgressBar.svelte';
	import { formatEuros } from '#helpers/format.ts';
	import { isCardCode } from '#helpers/card-utils.ts';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import CircleEuroIcon from '@lucide/svelte/icons/circle-euro';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		/** The owned overlay compares with the viewer's collection, so it only exists when signed in. */
		loggedIn: boolean;
	}

	let { loggedIn }: Props = $props();

	let noticeDismissed = $state(false);

	/**
	 * Everything here reads the store, which draws its one-page default on the server and in the first client render, so the figures
	 * match until `load()` runs. The notice, the last action and the save error only exist after it.
	 */
	const totalSlots = $derived(binder.pages.length * binder.slotsPerPage);
	const placedValue = $derived(binder.pages.flat().reduce((sum, key) => sum + (key ? binderCards.get(key)?.price ?? 0 : 0), 0));

	const overlay = $derived(binder.view.ownedOverlay);
	/** Nothing is drawn before the stored binder and the catalogue are in, since the figures would count empty pockets and unpriced cards. */
	const showCompletion = $derived(loggedIn && overlay && binder.loaded && binderCards.ready && binderCards.ownedCodes !== null);

	/** Counts every slot holding a catalogue card, so a card placed twice is owned or missing twice. URL slots have no owner and no price. */
	const completion = $derived.by(() => {
		let owned = 0;
		let toComplete = 0;
		let total = 0;
		for (const key of binder.pages.flat()) {
			if (!key || !isCardCode(key)) continue;
			total++;
			if (binderCards.ownedCodes?.has(key)) owned++;
			else toComplete += binderCards.get(key)?.price ?? 0;
		}
		return { owned, toComplete, total };
	});

	const heldKey = $derived(binder.held ? binder.pages[binder.held.page]?.[binder.held.position] : null);
	const heldTile = $derived(heldKey ? binderCards.tile(heldKey) : null);
</script>

<div class="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300">
	<span class="flex items-center gap-1.5 tabular-nums">
		<LayoutGridIcon class="shrink-0 text-gray-400" size={12} />
		{binder.filledSlots}/{totalSlots} slots filled
		<ProgressBar fill="bg-gold-400" label="Slots filled" max={totalSlots} value={binder.filledSlots} />
	</span>
	<span class="flex items-center gap-1.5 tabular-nums"><InboxIcon class="shrink-0 text-gray-400" size={12} /> {binder.trayLeft} in the tray to place</span>
	<span class="flex items-center gap-1.5 tabular-nums"><CircleEuroIcon class="shrink-0 text-gray-400" size={12} /> {formatEuros(placedValue)} placed</span>

	{#if loggedIn}
		<button
			aria-pressed={overlay}
			class={['focus-ring flex items-center gap-1 rounded border px-2 py-0.5 transition-colors', overlay ? 'border-gold-400 text-gold-400' : 'border-gray-600 hover:border-gold-400 hover:text-gold-400']}
			onclick={() => binder.setView({ ownedOverlay: !overlay })}
			title="Fade the cards you do not own"
			type="button"
		>
			<EyeIcon size={12} /> Owned
		</button>
		{#if showCompletion && completion.total}
			<span class="flex items-center gap-1.5 tabular-nums">
				<ProgressBar fill="bg-green-500" label="Placed cards you own" max={completion.total} value={completion.owned} />
				You own {completion.owned} of {completion.total} placed cards, about {formatEuros(completion.toComplete)} to complete
			</span>
		{/if}
	{/if}

	{#if binder.armed}
		{@const armed = binderCards.tile(binder.armed)}
		<span class="flex items-center gap-2 text-gold-400">
			{#if armed.image}<CardImage alt="" class="w-5 shrink-0 rounded-[2px]" imageUrl={armed.image} lazy={false} lowRes />{/if}
			Placing {armed.name}: click a slot, Esc cancels
			<button class="focus-ring rounded border border-gold-400/60 px-2 py-0.5 hover:bg-gold-400/10" onclick={() => (binder.armed = null)} type="button">Cancel</button>
		</span>
	{/if}

	{#if binder.held}
		<span class="flex items-center gap-2 text-gold-400">
			{#if heldTile?.image}<CardImage alt="" class="w-5 shrink-0 rounded-[2px]" imageUrl={heldTile.image} lazy={false} lowRes />{/if}
			Moving {heldTile?.name ?? 'a card'}: click or press Enter on a slot, Esc cancels
			<button class="focus-ring rounded border border-gold-400/60 px-2 py-0.5 hover:bg-gold-400/10" onclick={() => (binder.held = null)} type="button">Cancel</button>
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
