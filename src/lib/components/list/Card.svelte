<script lang="ts">
	import type {FullCard, Pokemon, Set} from '$lib/types';
	import CardImage from '@components/card/CardImage.svelte';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import { NO_IMAGES } from '~/constants';

	export let card: FullCard;
	export let pokemons: Pokemon[];
	export let sets: Set[];

	const {
		image,
		price,
		rarity,
		pokemonNumber,
		setName,
		types,
		cardCode  // `${finalSupertype}_${pokemonId}_${normalizedSetCode}_${normalizedCardNumber}`
	} = card;

	// Get set code from set object or image name
	const setCode = cardCode.split('_')[2];
	const cardNumber = cardCode.split('_')[3];
	const pokemonId = cardCode.split('_')[1];

	const pokemon = pokemons.find(p => p.id === pokemonNumber)!!;
	const set = sets.find(s => s.name === setName)!!;
</script>

<a
	aria-label={`Go to the card page of ${pokemon.name}`}
	class="card-link text-white"
	draggable="false"
	href={`/card/${pokemonId}/?set=${setCode}&number=${cardNumber}`}
	rel="dofollow"
>
	<div class="card-pokestore group relative flex flex-col items-center w-fit cursor-pointer transition-transform duration-500 ease-out hover:scale-[1.025]">
		<div class:list={rarity.toLowerCase()}></div>
		{#if !NO_IMAGES}
			<div
				class={`aura h-[26rem] max-2xs:h-[22rem] w-[20rem] max-2xs:w-[16rem] absolute blur-[1.5rem] rounded-[15rem] -z-10 bg-[var(--type-color)]
				transition-all duration-700 ease-out group-hover:blur-[2.5rem] ${types.toLowerCase().split(',')}`}
			></div>
		{/if}
		<div class="relative h-[420px] max-2xs:h-[342px] w-[300px] max-2xs:w-[245px]">
			<CardImage
				imageUrl={image}
				alt={pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
				class="rounded-lg h-[420px] max-2xs:h-[342px] w-[300px] max-2xs:w-[245px] transition-opacity duration-300 absolute top-0 left-0"
				height={420}
				width={300}
				lazy={true}
			/>
		</div>
		<h2 class="text-center font-bold text-[1.3rem]">
			{pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
			<span class="uppercase">
				{#if setCode}
					{setCode}
				{/if}
				#{cardNumber}/{set?.printedTotal}
			</span>
		</h2>
		<div class="flex items-center justify-center">
			{#if card.cardMarketUrl && card.cardMarketUrl.trim() !== ''}
				<a
					href={card.cardMarketUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-center hover:text-gold-300 transition-colors duration-200"
					on:click|stopPropagation
					aria-label="View on Cardmarket"
				>
					<div class="flex items-center justify-center whitespace-nowrap">
						<span>{price && price !== 100_000 ? `${price} $` : 'Priceless'}</span>
						<span class="mx-1">-</span>
						<span class="text-gold-400 font-bold underline flex items-center">
							Cardmarket
							<ExternalLink size={12} class="ml-1" />
						</span>
					</div>
				</a>
			{:else}
				<h3 class="text-center">{price && price !== 100_000 ? `${price} $` : 'Priceless'}</h3>
			{/if}
		</div>
	</div>
</a>

<style>
	.loader {
		animation-duration: 4s;
		animation-fill-mode: forwards;
		animation-iteration-count: infinite;
		animation-name: placeHolderShimmer;
		animation-timing-function: linear;
		background: linear-gradient(to right, var(--card-color) 8%, color-mix(in oklab, var(--card-color), white 30%) 38%, var(--card-color) 54%);
		background-size: auto;
		border-radius: 0.5rem;
		z-index: -1;
	}
</style>
