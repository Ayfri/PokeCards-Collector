<script lang="ts">
	import {pascalCase} from '$helpers/strings.js';
	import PageTitle from '@components/PageTitle.svelte';
	import type {Card} from '~/types.js';

	export let card: Card;

	const pokemonName = card.pokemon.name;
	const capitalizedPokemonName = pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1);
</script>

<div class="mb-8 flex flex-col items-center gap-4 max-lg:gap-0">
	<p
		class="px-5 py-2 bg-gray-800 border-[3px] border-gold-400 rounded-[1rem] text-2xl"
		id="card-price"
		title="Average current price"
	>
		{card.price ? `${card.price} $` : 'Priceless'}
	</p>

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
		<p class="text-center">{card.pokemon.description}</p>
	</div>
</div>
