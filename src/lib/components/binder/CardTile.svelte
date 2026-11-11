<script lang="ts">
	import CardImage from '#components/card/CardImage.svelte';
	import RaritySymbol from '#components/card/RaritySymbol.svelte';
	import { DIMMED, setDrag } from '#helpers/binder.ts';
	import { formatCardNumber } from '#helpers/card-utils.ts';
	import { formatEuros } from '#helpers/format.ts';
	import type { BinderCard } from '#lib/types.js';
	import { binderCards } from '#stores/binder-cards.svelte.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		card: BinderCard;
		inTray: boolean;
		/** A card code no catalogue and no owned list resolves. */
		missing: boolean;
		/** Called when the tile gets armed, so a phone can flip back to the board. */
		onArm?: () => void;
	}

	let { card, inTray, missing, onArm }: Props = $props();

	const armed = $derived(binder.armed === card.cardCode);
	const placed = $derived(binder.placed.has(card.cardCode));
	const dimmed = $derived(binderCards.isDimmed(card.cardCode));
	/** Set ids repeat across languages, so only an English card reads its `printedTotal` from the English sets. */
	const set = $derived(card.language && card.language !== 'en' ? undefined : binderCards.setsById.get(card.setId));

	function toggleArm() {
		binder.armed = armed ? null : card.cardCode;
		if (binder.armed) {
			binder.held = null;
			onArm?.();
		}
	}
</script>

{#snippet removeButton()}
	<button
		aria-label="Remove from the tray"
		class="absolute top-1 right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
		onclick={() => binder.removeFromTray(card.cardCode)}
		title="Remove from the tray"
		type="button"
	>
		<XIcon size={14} />
	</button>
{/snippet}

{#if missing && !binderCards.ready}
	<div class="size-full motion-safe:animate-pulse rounded-sm border-2 border-gray-700 bg-gray-700/50"></div>
{:else if missing}
	<div class="group relative flex size-full items-center justify-center rounded-sm border-2 border-dashed border-red-700 p-1 text-center" title={card.cardCode}>
		<span class="text-xs text-red-400">Not in the English catalogue</span>
		{#if inTray}{@render removeButton()}{/if}
	</div>
{:else}
	<div
		class={[
			'group relative size-full rounded-sm border-2 transition-all duration-200 motion-safe:hover:-translate-y-0.5',
			armed ? 'border-gold-400 ring-2 ring-gold-400' : 'border-gray-700 hover:border-gold-400',
			placed && 'opacity-60'
		]}
		draggable="true"
		ondragstart={event => {
			setDrag(event, { key: card.cardCode, kind: 'card' });
			if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
		}}
		role="presentation"
	>
		<button
			aria-pressed={armed}
			class="focus-ring absolute inset-0 size-full cursor-pointer"
			onclick={toggleArm}
			title={armed ? 'Armed: click a slot to place it, or click again to cancel' : 'Arm this card, then click a slot'}
			type="button"
		>
			<CardImage alt={card.name} class="size-full rounded-[4%] object-contain p-1 {dimmed ? DIMMED : ''}" imageUrl={card.image} lazy={true} types={card.types} />
		</button>
		{#if placed}
			<span class="absolute top-1 left-1 rounded-full bg-green-600 p-0.5 text-white" title="Already placed in the binder"><CheckIcon size={12} /></span>
		{/if}
		{#if armed}
			<span class="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 rounded-full bg-gold-400 px-1.5 text-[0.6rem] font-semibold text-black motion-safe:animate-pulse">Placing</span>
		{/if}
		<!-- Arming a card also reveals its details, which is the only way to read them without a hover on touch screens. -->
		<div class={['pointer-events-none absolute right-0 bottom-0 left-0 bg-black/75 p-1 text-center text-[0.6rem] leading-tight text-white transition-opacity group-hover:opacity-100', armed ? 'opacity-100' : 'opacity-0']}>
			<div class="truncate font-semibold">{card.name}</div>
			{#if card.localId}
				<div class="truncate">#{formatCardNumber(card.localId, set?.printedTotal)}</div>
				<div class="flex items-center justify-center gap-1 truncate text-gray-300"><RaritySymbol decorative rarity={card.rarity} />{card.rarity}</div>
				<div class="truncate text-gold-400">{card.price ? formatEuros(card.price) : 'No price'}</div>
			{/if}
		</div>
		{#if inTray}{@render removeButton()}{/if}
	</div>
{/if}
