<script lang="ts">
	import {NO_IMAGES} from '$lib/images';
	import {addCardToWishlist, removeCardFromWishlist} from '$lib/services/wishlists';
	import {authStore} from '$lib/stores/auth';
	import {wishlistStore} from '$lib/stores/wishlist';
	import type {FullCard, Pokemon, PriceData, Set} from '$lib/types';
	import { parseCardCode } from '$lib/helpers/card-utils';
	import CardImage from '@components/card/CardImage.svelte';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import Heart from 'lucide-svelte/icons/heart';
	import { onMount } from 'svelte';
	import { findSetByCardCode } from '$lib/helpers/set-utils';

	export let card: FullCard;
	export let pokemons: Pokemon[];
	export let prices: PriceData | undefined;
	export let sets: Set[];

	const {
		image,
		rarity,
		types,
		cardCode,  // `${finalSupertype}_${pokemonId}_${normalizedSetCode}_${normalizedCardNumber}`
	} = card;

	const { pokemonNumber, cardNumber } = parseCardCode(cardCode);	
	const pokemon = pokemons.find(p => p.id === pokemonNumber)!!;
	const set = findSetByCardCode(cardCode, sets)!!;
	if (!prices) {
		console.log(card);
	}

	// Détermine si la carte est dans la wishlist en fonction du store
	$: isInWishlist = $wishlistStore.has(cardCode);
	let isAddingToWishlist = false;

	async function toggleWishlist(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (!$authStore.user || !$authStore.profile) return;

		isAddingToWishlist = true;

		try {
			if (isInWishlist) {
				await removeCardFromWishlist($authStore.profile.username, cardCode);
				// Pas besoin de mettre à jour isInWishlist car removeCardFromWishlist met déjà à jour le store
			} else {
				await addCardToWishlist($authStore.profile.username, cardCode);
				// Pas besoin de mettre à jour isInWishlist car addCardToWishlist met déjà à jour le store
			}
		} catch (error) {
			console.error('Error toggling wishlist status:', error);
		} finally {
			isAddingToWishlist = false;
		}
	}

	const cardName = card.pokemonNumber ?
		pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1) :
		card.name.charAt(0).toUpperCase() + card.name.slice(1);
</script>

<a
	aria-label={`Go to the card page of ${cardName}`}
	class="card-link text-white"
	draggable="false"
	href={`/card/${cardCode}/`}
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
			{#if $authStore.user && $authStore.profile}
				<button
					aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
					class="absolute bottom-2 right-2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors duration-200"
					on:click={toggleWishlist}
					disabled={isAddingToWishlist}
				>
					<Heart
						size={24}
						class={isInWishlist ? 'text-red-500 fill-red-500' : 'text-white'}
					/>
				</button>
			{/if}
			<CardImage
				alt={cardName}
				class="rounded-lg h-[420px] max-2xs:h-[342px] w-[300px] max-2xs:w-[245px] transition-opacity duration-300 absolute top-0 left-0"
				height={420}
				imageUrl={image}
				lazy={true}
				width={300}
			/>
		</div>
		<h2 class="text-center font-bold text-lg text-pretty w-[300px] max-2xs:w-[245px] leading-none pt-2 flex flex-col gap-[0.1rem]">
			{#if card.pokemonNumber}
				{cardName}
			{:else}
				{cardName}
			{/if}
			<span class="uppercase text-sm opacity-85">
				{#if set.ptcgoCode}
					{set.ptcgoCode}
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
						<span>{prices?.simple && prices.simple !== 100_000 ? `${prices.simple} $` : 'Priceless'}</span>
						<span class="mx-1">-</span>
						<span class="text-gold-400 font-bold underline flex items-center">
							Cardmarket
							<ExternalLink size={12} class="ml-1"/>
						</span>
					</div>
				</a>
			{:else}
				<h3 class="text-center">{prices?.simple && prices.simple !== 100_000 ? `${prices.simple} $` : 'Priceless'}</h3>
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
