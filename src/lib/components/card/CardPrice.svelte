<script lang="ts">
	import type { FullCard, PriceData } from '#lib/types.js';
	import { cardPrice } from '#helpers/card-utils.ts';
	import { formatEuros } from '#helpers/format.ts';
	import CardmarketLogo from '#components/card/CardmarketLogo.svelte';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import Clock from '@lucide/svelte/icons/clock';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Repeat2 from '@lucide/svelte/icons/repeat-2';
	import Tag from '@lucide/svelte/icons/tag';

	interface Props {
		card: FullCard;
		cardPrices: PriceData;
	}

	let { card, cardPrices }: Props = $props();

	const mainPrice = $derived(cardPrice(cardPrices));

	const UPDATED_AT_FORMAT = new Intl.DateTimeFormat('en-GB', {dateStyle: 'long', timeStyle: 'short'});

	/** TCGdex sends the Cardmarket timestamp as an opaque string, so an unparseable value falls back to the raw text. */
	const updatedAt = $derived.by(() => {
		if (!card.cardMarketUpdatedAt) return null;
		const date = new Date(card.cardMarketUpdatedAt);
		return Number.isNaN(date.getTime()) ? card.cardMarketUpdatedAt : UPDATED_AT_FORMAT.format(date);
	});
</script>

{#snippet priceItem(label: string, value: number | undefined)}
	<div class="price-item bg-white/10">
		<span class="font-semibold">{label}</span>
		<span>{value}€</span>
	</div>
{/snippet}

<div class="flex max-h-[80vh] flex-col overflow-y-auto text-[0.95rem] bg-gray-800 border-2 border-gold-400 rounded-xl p-4 w-full max-w-125 h-full">
	{#if card.cardMarketUrl && card.cardMarketUrl.trim() !== ''}
		<a class="text-gold-400 font-bold text-xl mb-3 flex items-center justify-center gap-2 hover:text-gold-300 transition-colors duration-200" href={card.cardMarketUrl} rel="noopener noreferrer" target="_blank" title="Open this card on Cardmarket (new tab)">
			<CardmarketLogo class="shrink-0" size={24} />
			Cardmarket Prices
			<ExternalLink size={18} />
		</a>
	{:else}
		<h3 class="text-xl text-gold-400 font-bold mb-3 text-center">Card Prices</h3>
	{/if}

	<div class="bg-gray-900 border-2 border-gold-400 rounded-lg p-3 mb-4 text-center">
		<span class="text-2xl font-bold">
			{mainPrice ? formatEuros(mainPrice) : 'Priceless'}
		</span>
		<span class="text-sm text-gray-400 block">Main Price</span>
	</div>

	<div class="grow overflow-y-auto max-h-[56vh]">
		<h4 class="text-base text-gold-400 font-bold mb-2 flex items-center justify-center gap-2" title="Current Cardmarket listings for the normal print"><Tag size={16} /> Market Prices (€)</h4>
		<div class="grid grid-cols-2 gap-3">
			{#if cardPrices.simple}{@render priceItem('Average Sell:', cardPrices.simple)}{/if}
			{#if cardPrices.low}{@render priceItem('Low Price:', cardPrices.low)}{/if}
			{#if cardPrices.trend}{@render priceItem('Trend Price:', cardPrices.trend)}{/if}
		</div>

		{#if cardPrices.reverseSimple !== undefined && cardPrices.reverseSimple > 0}
			<h4 class="text-base text-gold-400 font-bold mt-4 mb-2 flex items-center justify-center gap-2" title="Prices for the reverse holo print"><Repeat2 size={16} /> Reverse Prices</h4>
			<div class="grid grid-cols-2 gap-3">
				{@render priceItem('Reverse Simple:', cardPrices.reverseSimple)}
				{#if cardPrices.reverseLow !== undefined && cardPrices.reverseLow > 0}{@render priceItem('Reverse Low:', cardPrices.reverseLow)}{/if}
				{#if cardPrices.reverseTrend !== undefined && cardPrices.reverseTrend > 0}{@render priceItem('Reverse Trend:', cardPrices.reverseTrend)}{/if}
			</div>
		{/if}

		<h4 class="text-base text-gold-400 font-bold mt-4 mb-2 flex items-center justify-center gap-2" title="Average sale price over the last days"><ChartLine size={16} /> Average Prices</h4>
		<div class="grid grid-cols-2 gap-3">
			{#if cardPrices.avg1 !== undefined}{@render priceItem('Avg (1 day):', cardPrices.avg1)}{/if}
			{#if cardPrices.avg7 !== undefined}{@render priceItem('Avg (7 days):', cardPrices.avg7)}{/if}
			{#if cardPrices.avg30 !== undefined}{@render priceItem('Avg (30 days):', cardPrices.avg30)}{/if}
		</div>

		{#if (cardPrices.reverseAvg1 !== undefined && cardPrices.reverseAvg1 > 0) ||
			(cardPrices.reverseAvg7 !== undefined && cardPrices.reverseAvg7 > 0) ||
			(cardPrices.reverseAvg30 !== undefined && cardPrices.reverseAvg30 > 0)}
			<h4 class="text-base text-gold-400 font-bold mt-4 mb-2 flex items-center justify-center gap-2" title="Average sale price of the reverse holo print"><Repeat2 size={16} /> Reverse Averages</h4>
			<div class="grid grid-cols-2 gap-3">
				{#if cardPrices.reverseAvg1 !== undefined && cardPrices.reverseAvg1 > 0}{@render priceItem('R. Avg (1 day):', cardPrices.reverseAvg1)}{/if}
				{#if cardPrices.reverseAvg7 !== undefined && cardPrices.reverseAvg7 > 0}{@render priceItem('R. Avg (7 days):', cardPrices.reverseAvg7)}{/if}
				{#if cardPrices.reverseAvg30 !== undefined && cardPrices.reverseAvg30 > 0}{@render priceItem('R. Avg (30 days):', cardPrices.reverseAvg30)}{/if}
			</div>
		{/if}
	</div>

	{#if updatedAt}
		<p class="text-sm text-gray-400 mt-4 flex items-center justify-center gap-1.5" title="When Cardmarket last refreshed these prices"><Clock size={14} /> Last updated: {updatedAt}</p>
	{/if}
</div>

<style>
	.price-item {
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0.5rem;
		border-radius: 0.5rem;
		font-size: 0.9rem;
	}

	@media (max-width: 768px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
