<script lang="ts">
	import type {FullCard} from '$lib/types';
	import CardImage from '@components/card/CardImage.svelte';
	import {fade} from 'svelte/transition';
	import ExternalLink from 'lucide-svelte/icons/external-link';

	export let cards: FullCard[];
	export let currentPokemonId: number;
	export let onCardSelect: (card: FullCard) => void;

	// Sort cards by set name for a consistent display
	$: sortedCards = [...cards].filter(card => card.pokemon.id === currentPokemonId).sort((a, b) => a.set_name.localeCompare(b.set_name));
</script>

<div class="all-pokemon-cards">
	<h2 class="text-xl font-bold text-gold-400 mb-4">All {sortedCards.length > 0 ? sortedCards[0].pokemon.name.charAt(0).toUpperCase() + sortedCards[0].pokemon.name.slice(1) : ''} Cards</h2>

	<div class="cards-grid">
		{#each sortedCards as card}
			<div
				class="card-item"
				transition:fade={{ duration: 200 }}
				on:click={() => onCardSelect(card)}
			>
				<div class="card-container">
					<CardImage
						imageUrl={card.image}
						alt={card.pokemon.name}
						class="card-image"
						lazy={true}
					/>
					<div class="set-overlay">
						<img
							src={card.set.logo}
							alt={card.set.name}
							class="set-icon"
							title={card.set.name}
						/>
					</div>
				</div>
				<div class="card-info">
					<h2 class="text-center font-bold text-sm">{card.set.name}</h2>
					<div class="flex items-center justify-center">
						{#if 'cardmarket' in card && card.cardmarket && card.cardmarket.url && card.cardmarket.url.trim() !== ''}
							<a
								href={card.cardmarket.url}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:text-gold-300 transition-colors duration-200 text-center"
								on:click|stopPropagation
								aria-label="View on Cardmarket"
							>
								<div class="flex items-center justify-center whitespace-nowrap">
									<span class="text-sm">{card.price ? `${card.price} $` : 'Priceless'}</span>
									<span class="mx-1 text-sm">-</span>
									<span class="text-gold-400 font-bold underline text-sm flex items-center">
										Cardmarket
										<ExternalLink size={10} class="ml-1" />
									</span>
								</div>
							</a>
						{:else}
							<div>{card.price ? `${card.price} $` : 'Priceless'}</div>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style lang="postcss">
	.all-pokemon-cards {
		background-color: rgba(35, 35, 35, 0.75);
		border-color: #f3d02c;
		border-radius: 1rem;
		border-style: solid;
		border-width: 2px;
		padding: 1.5rem;
		margin-top: 2rem;
		width: 100%;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1.5rem;
	}

	.card-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		transition: transform 0.2s ease;
		cursor: pointer;
	}

	.card-item:hover {
		transform: translateY(-10px);
	}

	.card-container {
		position: relative;
		border-radius: 0.5rem;
		overflow: hidden;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
	}

	.card-image {
		width: 100%;
		aspect-ratio: 5/7;
		object-fit: cover;
	}

	.set-overlay {
		position: absolute;
		bottom: 5px;
		right: 5px;
		background-color: rgba(0, 0, 0, 0.7);
		border-radius: 50%;
		padding: 2px;
		border: 1px solid #f3d02c;
	}

	.set-icon {
		width: 30px;
		height: 30px;
		object-fit: contain;
	}

	.card-info {
		margin-top: 0.2rem;
		width: 100%;
		text-align: center;
		display: flex;
		flex-direction: column;
	}

	@media (max-width: 768px) {
		.cards-grid {
			grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
			gap: 1rem;
		}

		.set-icon {
			width: 24px;
			height: 24px;
		}
	}
</style>
