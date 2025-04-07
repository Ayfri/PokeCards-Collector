<script lang="ts">
	import type {FullCard} from '$lib/types';
	import CardImage from '@components/card/CardImage.svelte';
	import { ExternalLink } from 'lucide-svelte';

	export let card: FullCard;

	const {
		image,
		pokemon,
		price,
		rarity,
		types,
		set
	} = card;

	// Get set code from set object or image name
	const setCode = set?.ptcgoCode ?? image.split('/').at(-2);
	// Get card code from image name, remove all non-numeric characters
	const cardCode = image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1');

	const {name} = pokemon;
</script>

<a
	aria-label={`Go to the card page of ${name}`}
	class="card-link text-white"
	draggable="false"
	href={`/card/${pokemon.id}/?set=${set?.ptcgoCode ?? ''}&number=${cardCode}`}
	rel="dofollow"
>
	<div class="card-pokestore group relative flex flex-col items-center w-fit cursor-pointer transition-transform duration-500 ease-out hover:scale-[1.025]">
		<div class:list={rarity.toLowerCase()}></div>
		<div
			class={`aura h-[26rem] max-2xs:h-[22rem] w-[20rem] max-2xs:w-[16rem] absolute blur-[1.5rem] rounded-[15rem] -z-10 bg-[var(--type-color)]
			transition-all duration-700 ease-out group-hover:blur-[2.5rem] ${types.toLowerCase().split(',')}`}
		></div>
		<div class="relative h-[420px] max-2xs:h-[342px] w-[300px] max-2xs:w-[245px]">
			<CardImage
				imageUrl={image}
				alt={name.charAt(0).toUpperCase() + name.slice(1)}
				class="rounded-lg h-[420px] max-2xs:h-[342px] w-[300px] max-2xs:w-[245px] transition-opacity duration-300 absolute top-0 left-0"
				height={420}
				width={300}
				lazy={true}
			/>
		</div>
		<h2 class="text-center font-bold text-[1.3rem]">
			{name.charAt(0).toUpperCase() + name.slice(1)}
			<span class="uppercase">
				{#if setCode}
					{setCode}
				{/if}
				#{cardCode}/{set?.printedTotal}
			</span>
		</h2>
		<div class="flex items-center justify-center">
			{#if card.cardmarket?.url && card.cardmarket.url.trim() !== ''}
				<a
					href={card.cardmarket.url}
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
