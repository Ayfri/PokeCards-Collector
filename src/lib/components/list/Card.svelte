<script lang="ts">
	import {NO_IMAGES} from '$lib/images';
	import {addCardToWishlist, removeCardFromWishlist} from '$lib/services/wishlists';
	import {addCardToCollection, removeCardFromCollection} from '$lib/services/collections';
	import {authStore} from '$lib/stores/auth';
	import {wishlistStore} from '$lib/stores/wishlist';
	import {collectionStore} from '$lib/stores/collection';
	import type {FullCard, Pokemon, PriceData, Set} from '$lib/types';
	import { parseCardCode } from '$lib/helpers/card-utils';
	import CardImage from '@components/card/CardImage.svelte';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import Heart from 'lucide-svelte/icons/heart';
	import Package from 'lucide-svelte/icons/package';
	import { onMount } from 'svelte';
	import { findSetByCardCode } from '$lib/helpers/set-utils';
	import { Plus } from 'lucide-svelte';

	export let card: FullCard;
	export let pokemons: Pokemon[];
	export let prices: PriceData | undefined;
	export let sets: Set[];
	export let customWidth: number | null = null;
	export let customHeight: number | null = null;

	const {
		image,
		rarity,
		types,
		cardCode,  // `${finalSupertype}_${pokemonId}_${normalizedSetCode}_${normalizedCardNumber}`
	} = card;

	// Calculer les dimensions réelles à utiliser
	$: width = customWidth || 300;
	$: height = customHeight || 420;
	$: mobileWidth = customWidth ? Math.floor(customWidth * 0.82) : 245;
	$: mobileHeight = customHeight ? Math.floor(customHeight * 0.82) : 342;

	const { pokemonNumber, cardNumber } = parseCardCode(cardCode);	
	const pokemon = pokemons.find(p => p.id === pokemonNumber)!!;
	const set = findSetByCardCode(cardCode, sets)!!;
	if (!prices) {
		console.log(card);
	}

	// Détermine si la carte est dans la wishlist en fonction du store
	$: isInWishlist = $wishlistStore.has(cardCode);
	let isAddingToWishlist = false;

	// Détermine si la carte est dans la collection en fonction du store
	$: isInCollection = $collectionStore.has(cardCode);
	let isAddingToCollection = false;

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

	async function toggleCollection(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (!$authStore.user || !$authStore.profile) return;

		isAddingToCollection = true;

		try {
			if (isInCollection) {
				await removeCardFromCollection($authStore.profile.username, cardCode);
				// No need to update isInCollection as removeCardFromCollection already updates the store
			} else {
				await addCardToCollection($authStore.profile.username, cardCode);
				// No need to update isInCollection as addCardToCollection already updates the store
			}
		} catch (error) {
			console.error('Error toggling collection status:', error);
		} finally {
			isAddingToCollection = false;
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
	<div class="card-pokestore group relative flex flex-col items-center w-fit cursor-pointer transition-transform duration-500 ease-out hover:scale-[1.025] hover:z-10" style="margin-bottom: {Math.floor(height * 0.25)}px; z-index: 1;">
		<div class:list={rarity.toLowerCase()}></div>
		{#if !NO_IMAGES}
			<div
				class={`aura absolute blur-[1.5rem] rounded-[15rem] -z-10 bg-[var(--type-color)]
				transition-all duration-700 ease-out group-hover:blur-[2.5rem] ${types.toLowerCase().split(',')}`}
				style="width: {width * 0.8}px; height: {height * 0.85}px;"
			></div>
		{/if}
		<div class="relative" style="width: {width}px; height: {height}px; max-width: 100%;">
			{#if $authStore.user && $authStore.profile}
				<div class="absolute bottom-2 right-2 z-10 flex gap-2">
					<button
						aria-label={isInCollection ? 'Remove from collection' : 'Add to collection'}
						class="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors duration-200"
						on:click={toggleCollection}
						disabled={isAddingToCollection}
					>
						<Plus
							size={Math.min(24, Math.floor(width/12))}
							class={isInCollection ? 'text-green-500' : 'text-white'}
						/>
					</button>
					<button
						aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
						class="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors duration-200"
						on:click={toggleWishlist}
						disabled={isAddingToWishlist}
					>
						<Heart
							size={Math.min(24, Math.floor(width/12))}
							class={isInWishlist ? 'text-red-500 fill-red-500' : 'text-white'}
						/>
					</button>
				</div>
			{/if}
			<CardImage
				alt={cardName}
				class="rounded-lg transition-opacity duration-300 absolute top-0 left-0"
				style="width: {width}px; height: {height}px; max-width: 100%;"
				imageUrl={image}
				lazy={true}
				width={width}
				height={height}
			/>
		</div>
		<div class="card-info-container bg-black/30 backdrop-blur-sm rounded-lg p-2 mt-1" style="width: {width}px; max-width: 100%;">
			<h2 class="text-center font-bold text-lg text-pretty leading-none">
				{cardName}
				<span class="uppercase text-sm opacity-85 ml-2">{#if set.ptcgoCode}{set.ptcgoCode}{/if} #{cardNumber}/{set?.printedTotal}</span>
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
								<ExternalLink size={Math.min(12, Math.floor(width/25))} class="ml-1"/>
							</span>
						</div>
					</a>
				{:else}
					<h3 class="text-center">{prices?.simple && prices.simple !== 100_000 ? `${prices.simple} $` : 'Priceless'}</h3>
				{/if}
			</div>
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
