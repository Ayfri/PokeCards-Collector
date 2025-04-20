<script lang="ts">
	import PageTitle from '@components/PageTitle.svelte';
	import type {FullCard, Pokemon, CardMarketPrices, Set} from '$lib/types';
	import CardPrice from './CardPrice.svelte';

	export let set: Set;
	export let card: FullCard;
	export let pokemon: Pokemon | undefined = undefined;
	export let cardmarket: CardMarketPrices | undefined = undefined;

	const cardNumber = card.cardCode.split('_')[3];

	// Compute the display name: Pokemon name if available, otherwise card name
	$: displayName = pokemon ? (pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)) : card?.name;
	// Compute description: Pokemon description if available, otherwise card rules/basic info
	$: displayDescription = pokemon ? pokemon.description : ((card as any).rules?.join('\n') || `Details for ${card?.name}`);
</script>

<div class="pokemon-info-container mb-8 flex flex-col items-center gap-4 max-lg:gap-0">
	<PageTitle title={displayName}/>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-[800px]">
		<!-- Left Column: Card Details -->
		<div class="flex flex-col items-center md:items-start gap-4 text-xl">
			<div
				class="flex gap-4 flex-wrap justify-center md:justify-start"
				id="card-types"
			>
				{#if card?.types}
					{#each card.types.toLowerCase().split(',') as type}
						<p class={`card-type ${type}`}>{type}</p>
					{/each}
				{:else if card?.supertype}
					<p class={`card-type ${card.supertype.toLowerCase()}`}>{card.supertype}</p>
				{/if}
			</div>

			<div class="card-details mt-4 text-base w-full text-center md:text-left space-y-2">
				<p><span class="font-semibold text-gold-300">Artist:</span> {card.artist}</p>
				<p><span class="font-semibold text-gold-300">Rarity:</span> {card.rarity}</p>
				{#if cardNumber && set.printedTotal}
					<p><span class="font-semibold text-gold-300">Number:</span> {cardNumber} / {set.printedTotal}</p>
				{/if}
			</div>

			<p class="text-center md:text-left mt-4 text-base whitespace-pre-line">{displayDescription}</p>

		</div>

		<!-- Right Column: Prices -->
		<div class="flex flex-col items-center">
			{#if cardmarket !== undefined}
				<CardPrice {card} {cardmarket} />
			{:else}
				<!-- Fallback display if cardmarket data is not available -->
				<p
					class="px-5 py-2 bg-gray-800 border-[3px] border-gold-400 rounded-[1rem] text-2xl mt-2"
					id="card-price"
				>
					{card.price ? `${card.price} $` : 'Priceless'}
				</p>
			{/if}
		</div>
	</div>

	<div class="separator w-full max-w-[800px] my-6 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"></div>
</div>

<style>
	.separator {
		opacity: 0.5;
	}

	.pokemon-info-container {
		margin-top: 2rem;
	}

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

	/* Styles for Pokemon Type Tags */
	.card-type {
		background-color: var(--type-color, #777); /* Use type color, fallback gray */
		color: white;
		padding: 0.2rem 0.8rem; /* Adjusted padding */
		border-radius: 9999px; /* Pill shape */
		font-size: 0.9rem; /* Adjusted font size */
		font-weight: 500; /* Medium weight */
		text-transform: capitalize;
		box-shadow: 0 1px 3px rgba(0,0,0,0.2);
		border: 1px solid rgba(0,0,0,0.2);
		text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
	}

	.card-details p {
		color: #ccc; /* Light gray text for details */
	}

	@media (max-width: 768px) {
		.pokemon-info-container {
			margin-top: 1rem; /* Reduced margin for smaller screens */
		}
		.grid {
			gap: 1rem; /* Reduced gap */
		}
		.card-details {
			text-align: center; /* Center details text on small screens */
		}
	}
</style>
