<script lang="ts">
	import type { FullCard, CardMarketPrices } from '$lib/types';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import { slide } from 'svelte/transition';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';

	export let card: FullCard;
	export let cardmarket: CardMarketPrices;

	// State for toggling details visibility
	let showDetails = false;

	// Function to toggle details
	function toggleDetails() {
		showDetails = !showDetails;
	}
</script>

<div class="detailed-prices bg-gray-800 border-2 border-gold-400 rounded-xl p-4 mt-2 w-full max-w-[500px]">
	{#if card.cardMarketUrl && card.cardMarketUrl.trim() !== ''}
		<a href={card.cardMarketUrl} target="_blank" rel="noopener noreferrer" class="text-gold-400 font-bold text-xl mb-3 flex items-center justify-center hover:text-gold-300 transition-colors duration-200">
			Cardmarket Prices
			<ExternalLink size={18} class="ml-1" />
		</a>
	{:else}
		<h3 class="text-xl text-gold-400 font-bold mb-3 text-center">Card Prices</h3>
	{/if}

	<div class="main-price-display bg-gray-900 border-2 border-gold-400 rounded-lg p-3 mb-4 text-center">
		<span class="text-2xl font-bold">
			{card.price ? `${card.price} $` : 'Priceless'}
		</span>
		<span class="text-sm text-gray-400 block">Main Price</span>
	</div>

	<div class="text-center mb-3">
		<button
			on:click={toggleDetails}
			class="inline-flex items-center justify-center text-sm bg-gold-500 hover:bg-gold-600 text-white font-semibold py-1 px-3 rounded transition-colors duration-200"
			aria-expanded={showDetails}
		>
			{showDetails ? 'Show Less Details' : 'Show More Details'}
			{#if showDetails}
				<ChevronUp size={16} class="ml-1" />
			{:else}
				<ChevronDown size={16} class="ml-1" />
			{/if}
		</button>
	</div>

	{#if showDetails}
		<div transition:slide={{ duration: 300 }}>
			<h4 class="text-lg text-gold-400 font-bold mb-2 text-center">Market Prices (€)</h4>
			<div class="grid grid-cols-2 gap-3">
				{#if cardmarket.averageSellPrice !== undefined}
					<div class="price-item">
						<span class="font-semibold">Average Sell:</span>
						<span>{cardmarket.averageSellPrice}€</span>
					</div>
				{/if}
				{#if cardmarket.lowPrice !== undefined}
					<div class="price-item">
						<span class="font-semibold">Low Price:</span>
						<span>{cardmarket.lowPrice}€</span>
					</div>
				{/if}
				{#if cardmarket.trendPrice !== undefined}
					<div class="price-item">
						<span class="font-semibold">Trend Price:</span>
						<span>{cardmarket.trendPrice}€</span>
					</div>
				{/if}
				{#if cardmarket.germanProLow !== undefined && cardmarket.germanProLow > 0}
					<div class="price-item">
						<span class="font-semibold">German Pro Low:</span>
						<span>{cardmarket.germanProLow}€</span>
					</div>
				{/if}
				{#if cardmarket.suggestedPrice !== undefined && cardmarket.suggestedPrice > 0}
					<div class="price-item">
						<span class="font-semibold">Suggested Price:</span>
						<span>{cardmarket.suggestedPrice}€</span>
					</div>
				{/if}
				{#if cardmarket.lowPriceExPlus !== undefined}
					<div class="price-item">
						<span class="font-semibold">Low Price (EX+):</span>
						<span>{cardmarket.lowPriceExPlus}€</span>
					</div>
				{/if}
			</div>

			{#if cardmarket.reverseHoloLow !== undefined && cardmarket.reverseHoloLow > 0}
				<h4 class="text-lg text-gold-400 font-bold mt-4 mb-2 text-center">Reverse Holo Prices</h4>
				<div class="grid grid-cols-2 gap-3">
					{#if cardmarket.reverseHoloSell !== undefined && cardmarket.reverseHoloSell > 0}
						<div class="price-item">
							<span class="font-semibold">Reverse Holo Sell:</span>
							<span>{cardmarket.reverseHoloSell}€</span>
						</div>
					{/if}
					{#if cardmarket.reverseHoloLow !== undefined && cardmarket.reverseHoloLow > 0}
						<div class="price-item">
							<span class="font-semibold">Reverse Holo Low:</span>
							<span>{cardmarket.reverseHoloLow}€</span>
						</div>
					{/if}
					{#if cardmarket.reverseHoloTrend !== undefined && cardmarket.reverseHoloTrend > 0}
						<div class="price-item">
							<span class="font-semibold">Reverse Holo Trend:</span>
							<span>{cardmarket.reverseHoloTrend}€</span>
						</div>
					{/if}
				</div>
			{/if}

			<h4 class="text-lg text-gold-400 font-bold mt-4 mb-2 text-center">Average Prices</h4>
			<div class="grid grid-cols-2 gap-3">
				{#if cardmarket.avg1 !== undefined}
					<div class="price-item">
						<span class="font-semibold">Avg (1 day):</span>
						<span>{cardmarket.avg1}€</span>
					</div>
				{/if}
				{#if cardmarket.avg7 !== undefined}
					<div class="price-item">
						<span class="font-semibold">Avg (7 days):</span>
						<span>{cardmarket.avg7}€</span>
					</div>
				{/if}
				{#if cardmarket.avg30 !== undefined}
					<div class="price-item">
						<span class="font-semibold">Avg (30 days):</span>
						<span>{cardmarket.avg30}€</span>
					</div>
				{/if}
			</div>

			{#if (cardmarket.reverseHoloAvg1 !== undefined && cardmarket.reverseHoloAvg1 > 0) ||
				(cardmarket.reverseHoloAvg7 !== undefined && cardmarket.reverseHoloAvg7 > 0) ||
				(cardmarket.reverseHoloAvg30 !== undefined && cardmarket.reverseHoloAvg30 > 0)}
				<h4 class="text-lg text-gold-400 font-bold mt-4 mb-2 text-center">Reverse Holo Averages</h4>
				<div class="grid grid-cols-2 gap-3">
					{#if cardmarket.reverseHoloAvg1 !== undefined && cardmarket.reverseHoloAvg1 > 0}
						<div class="price-item">
							<span class="font-semibold">R. Holo Avg (1 day):</span>
							<span>{cardmarket.reverseHoloAvg1}€</span>
						</div>
					{/if}
					{#if cardmarket.reverseHoloAvg7 !== undefined && cardmarket.reverseHoloAvg7 > 0}
						<div class="price-item">
							<span class="font-semibold">R. Holo Avg (7 days):</span>
							<span>{cardmarket.reverseHoloAvg7}€</span>
						</div>
					{/if}
					{#if cardmarket.reverseHoloAvg30 !== undefined && cardmarket.reverseHoloAvg30 > 0}
						<div class="price-item">
							<span class="font-semibold">R. Holo Avg (30 days):</span>
							<span>{cardmarket.reverseHoloAvg30}€</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if card.cardMarketUpdatedAt}
		<p class="text-sm text-gray-400 mt-4 text-center">Last updated: {card.cardMarketUpdatedAt}</p>
	{/if}
</div>

<style>
	.price-item {
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0.5rem;
		background-color: rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		font-size: 0.9rem;
	}

	.detailed-prices {
		max-height: 80vh;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--gold-400) transparent;
		font-size: 0.95rem;
	}

	.detailed-prices h4 {
		font-size: 1rem;
	}

	.detailed-prices::-webkit-scrollbar {
		width: 8px;
	}

	.detailed-prices::-webkit-scrollbar-track {
		background: transparent;
	}

	.detailed-prices::-webkit-scrollbar-thumb {
		background-color: var(--gold-400);
		border-radius: 20px;
	}

	.main-price-display {
		/* Removing hover transition effect */
	}

	.main-price-display:hover {
		/* Remove transform scale effect */
		transform: none;
	}

	@media (max-width: 768px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
