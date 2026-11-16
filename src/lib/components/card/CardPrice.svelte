<script lang="ts" module>
	/** In UTC and labelled so: a local time would print one text on the server and another in the visitor's browser, which fails hydration. */
	const UPDATED_AT_FORMAT = new Intl.DateTimeFormat('en-GB', {dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC'});
</script>

<script lang="ts">
	import type { Card, PriceData } from '#lib/types.js';
	import { cardPrice } from '#helpers/card-utils.ts';
	import { formatEuros } from '#helpers/format.ts';
	import type { LucideIcon } from '@lucide/svelte';
	import CardmarketLogo from '#components/card/CardmarketLogo.svelte';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import Clock from '@lucide/svelte/icons/clock';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Repeat2 from '@lucide/svelte/icons/repeat-2';
	import Tag from '@lucide/svelte/icons/tag';

	interface Props {
		card: Card;
		cardPrices: PriceData;
	}

	let { card, cardPrices }: Props = $props();

	const mainPrice = $derived(cardPrice(cardPrices));

	/** TCGdex sends the Cardmarket timestamp as an opaque string, so an unparseable value falls back to the raw text. */
	const updatedAt = $derived.by(() => {
		if (!card.cardMarketUpdatedAt) return null;
		const date = new Date(card.cardMarketUpdatedAt);
		return Number.isNaN(date.getTime()) ? card.cardMarketUpdatedAt : `${UPDATED_AT_FORMAT.format(date)} UTC`;
	});

	const positive = (value?: number) => (value ?? 0) > 0;
	const defined = (value?: number) => value !== undefined;

	type PriceRows = [key: keyof PriceData, label: string][];

	/**
	 * `keep` picks the rows drawn. `shown` picks when the group is drawn: always, when any row is kept, or only when its first row is
	 * (the reverse prices need `reverseSimple`, even when `reverseLow` or `reverseTrend` has a value).
	 */
	const PRICE_GROUPS: { hint: string; icon: LucideIcon; keep: (value?: number) => boolean; rows: PriceRows; shown: 'always' | 'any' | 'first'; title: string }[] = [
		{ hint: 'Current Cardmarket listings for the normal print', icon: Tag, keep: positive, rows: [['simple', 'Average Sell:'], ['low', 'Low Price:'], ['trend', 'Trend Price:']], shown: 'always', title: 'Market Prices (€)' },
		{ hint: 'Prices for the reverse holo print', icon: Repeat2, keep: positive, rows: [['reverseSimple', 'Reverse Simple:'], ['reverseLow', 'Reverse Low:'], ['reverseTrend', 'Reverse Trend:']], shown: 'first', title: 'Reverse Prices' },
		{ hint: 'Average sale price over the last days', icon: ChartLine, keep: defined, rows: [['avg1', 'Avg (1 day):'], ['avg7', 'Avg (7 days):'], ['avg30', 'Avg (30 days):']], shown: 'always', title: 'Average Prices' },
		{ hint: 'Average sale price of the reverse holo print', icon: Repeat2, keep: positive, rows: [['reverseAvg1', 'R. Avg (1 day):'], ['reverseAvg7', 'R. Avg (7 days):'], ['reverseAvg30', 'R. Avg (30 days):']], shown: 'any', title: 'Reverse Averages' },
	];

	const groups = $derived(PRICE_GROUPS.flatMap(group => {
		const rows = group.rows.filter(([key]) => group.keep(cardPrices[key]));
		const isShown = group.shown === 'always' || (group.shown === 'first' ? rows[0]?.[0] === group.rows[0][0] : rows.length > 0);
		return isShown ? [{ ...group, rows }] : [];
	}));
</script>

<div class="flex max-h-[80vh] flex-col overflow-y-auto text-[0.95rem] bg-gray-800 border-2 border-gold-400 rounded-xl p-4 w-full max-w-125 h-full">
	{#if card.cardMarketUrl?.trim()}
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
		{#each groups as group (group.title)}
			<h4 class="text-base text-gold-400 font-bold mt-4 first:mt-0 mb-2 flex items-center justify-center gap-2" title={group.hint}><group.icon size={16} /> {group.title}</h4>
			<div class="grid grid-cols-2 max-md:grid-cols-1 gap-3">
				{#each group.rows as [key, label] (key)}
					<div class="flex justify-between rounded-lg bg-white/10 px-2 py-1 text-[0.9rem]">
						<span class="font-semibold">{label}</span>
						<span>{cardPrices[key]}€</span>
					</div>
				{/each}
			</div>
		{/each}
	</div>

	{#if updatedAt}
		<p class="text-sm text-gray-400 mt-4 flex items-center justify-center gap-1.5" title="When Cardmarket last refreshed these prices"><Clock size={14} /> Last updated: {updatedAt}</p>
	{/if}
</div>
