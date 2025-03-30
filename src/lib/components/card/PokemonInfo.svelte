<script lang="ts">
	import PageTitle from '@components/PageTitle.svelte';
	import type {FullCard} from '~/lib/types';

	export let card: FullCard;

	const pokemonName = card.pokemon.name;
	const capitalizedPokemonName = pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1);
</script>

<div class="pokemon-info-container mb-8 flex flex-col items-center gap-4 max-lg:gap-0">
	<PageTitle title={capitalizedPokemonName}/>

	<div class="flex flex-col items-center gap-4 max-lg:flex-col max-lg:items-center text-xl">
		<div
			class="flex gap-4"
			id="card-types"
		>
			{#each card.types.toLowerCase().split(',') as type}
				<p class={`card-type ${type}`}>{type}</p>
			{/each}
		</div>

		<p
			class="px-5 py-2 bg-gray-800 border-[3px] border-gold-400 rounded-[1rem] text-2xl mt-2"
			id="card-price"
			title="Average current price"
		>
			{card.price ? `${card.price} $` : 'Priceless'}
		</p>

		<p class="text-center mt-2">{card.pokemon.description}</p>
	</div>

	<!-- Add a visual separator between the description and the card collection -->
	<div class="separator w-full max-w-[800px] my-4 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent"></div>
</div>

<style>
	.separator {
		opacity: 0.5;
	}

	.pokemon-info-container {
		margin-top: 2rem;
	}

	@media (max-width: 768px) {
		.pokemon-info-container {
			margin-top: 3rem;
		}
	}
</style>
