<script lang="ts">
	import { createBubbler, stopPropagation } from 'svelte/legacy';

	const bubble = createBubbler();
	import {NO_IMAGES} from '$lib/images';
	import {addCardToWishlist, removeCardFromWishlist} from '$lib/services/wishlists';
	import {addCardToCollection, removeCardFromCollection} from '$lib/services/collections';
	import {wishlistStore} from '$lib/stores/wishlist';
	import {collectionStore} from '$lib/stores/collection';
	import { page } from '$app/state';
	import type {FullCard, Pokemon, PriceData, Set} from '$lib/types';
	import { parseCardCode } from '$lib/helpers/card-utils';
	import CardImage from '@components/card/CardImage.svelte';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Heart from '@lucide/svelte/icons/heart';
	import { findSetByCardCode } from '$lib/helpers/set-utils';
	import { Plus, Minus } from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import Button from '@components/filters/Button.svelte';
	import CardStackIcon from '@lucide/svelte/icons/layers';

	interface Props {
		card: FullCard;
		pokemons: Pokemon[];
		prices: PriceData | undefined;
		sets: Set[];
		customWidth?: number | null;
		customHeight?: number | null;
		lowRes?: boolean;
	}

	let {
		card,
		pokemons,
		prices,
		sets,
		customWidth = null,
		customHeight = null,
		lowRes = false
	}: Props = $props();

	const {
		// image, // We will use card.image directly
		rarity = 'Unknown',
		types = '',
		cardCode,
		name = '',
	} = card;

	// Calculer les dimensions réelles à utiliser
	let width = $derived(customWidth || 300);
	let height = $derived(customHeight || 420);
	let mobileWidth = $derived(customWidth ? Math.floor(customWidth * 0.82) : 245);
	let mobileHeight = $derived(customHeight ? Math.floor(customHeight * 0.82) : 342);

	const { pokemonNumber, cardNumber = '0' } = parseCardCode(cardCode);
	const pokemon = pokemonNumber ? pokemons.find(p => p.id === pokemonNumber) : null;
	const set = findSetByCardCode(cardCode, sets) || { name: 'Unknown Set', printedTotal: 0, ptcgoCode: null };

	// Access user and profile from page state
	let user = $derived(page.data.user);
	let profile = $derived(page.data.profile);

	// Détermine si la carte est dans la wishlist en fonction du store
	let isInWishlist = $derived($wishlistStore.has(cardCode));
	let isUpdatingWishlist = $state(false);

	// Get the count of the card in the collection from the store
	let collectionCount = $derived($collectionStore.get(cardCode) || 0);
	let isUpdatingCollection = $state(false);

	// Define the maximum quantity allowed (should match backend)
	const MAX_CARD_QUANTITY = 99;
	let isCollectionLimitReached = $derived(collectionCount >= MAX_CARD_QUANTITY);

	// Déterminer si nous sommes sur la page japonaise
	let isJapaneseCard = $derived(page.url.pathname.includes('/japan'));
	let cardLink = $derived(isJapaneseCard ? `/jp-card/${cardCode}/` : `/card/${cardCode}/`);

	async function toggleWishlist(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		// Use user/profile from $page.data
		if (!user || !profile) return;

		isUpdatingWishlist = true;

		try {
			if (isInWishlist) {
				// Use profile.username from $page.data
				await removeCardFromWishlist(profile.username, cardCode);
			} else {
				// Use profile.username from $page.data
				await addCardToWishlist(profile.username, cardCode);
			}
		} catch (error) {
			console.error('Error toggling wishlist status:', error);
		} finally {
			isUpdatingWishlist = false;
		}
	}

	async function handleAddCard(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		// Use user/profile from $page.data
		if (!user || !profile || isUpdatingCollection || isCollectionLimitReached) return;

		isUpdatingCollection = true;

		try {
			// Use profile.username from $page.data
			await addCardToCollection(profile.username, cardCode);
		} catch (error) {
			console.error('Error adding card to collection:', error);
		} finally {
			isUpdatingCollection = false;
		}
	}

	async function handleRemoveCard(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		// Use user/profile from $page.data
		if (!user || !profile || isUpdatingCollection || collectionCount === 0) return;

		isUpdatingCollection = true;

		try {
			// Use profile.username from $page.data
			await removeCardFromCollection(profile.username, cardCode);
		} catch (error) {
			console.error('Error removing card from collection:', error);
		} finally {
			isUpdatingCollection = false;
		}
	}

	const cardName = pokemon ? 
		pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1) : 
		(card.name ? card.name.charAt(0).toUpperCase() + card.name.slice(1) : 'Unknown');
</script>

<a
	aria-label={`Go to the card page of ${cardName}`}
	class="card-link text-white"
	draggable="false"
	href={cardLink}
	rel="dofollow"
>
	<div class="card-pokecards-collector group relative flex flex-col items-center w-fit cursor-pointer transition-transform duration-500 ease-out hover:scale-[1.025] hover:z-10" style="z-index: 1;">
		<div class:list={rarity.toLowerCase()}></div>
		{#if !NO_IMAGES}
			<div
				class={`aura absolute blur-[1.5rem] rounded-[15rem] -z-10 bg-(--type-color)
				transition-all duration-700 ease-out group-hover:blur-[2.5rem] ${types.toLowerCase().split(',')}`}
				style="width: {width * 0.8}px; height: {height * 0.85}px;"
			></div>
		{/if}
		<div class="relative" style="width: {width}px; height: {height}px; max-width: 100%;">
			{#if user && profile}
				<div class="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full bg-black/50 p-1">
					{#if collectionCount > 0}
						<button
							aria-label="Remove one copy from collection"
							class="p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
							onclick={handleRemoveCard}
							disabled={isUpdatingCollection}
							title="Remove one copy from collection"
						>
							<Minus
								size={Math.min(18, Math.floor(width/16))}
								class="text-white"
							/>
						</button>
						<span
							class="text-sm font-semibold text-green-400 px-1 min-w-[1.5ch] text-center select-none"
							title={`You have ${collectionCount} cop${collectionCount > 1 ? 'ies' : 'y'}`}
						>
							{collectionCount}
						</span>
					{/if}
					<button
						aria-label="Add one copy to collection"
						class="p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						onclick={handleAddCard}
						disabled={isUpdatingCollection || isCollectionLimitReached}
						title={isCollectionLimitReached ? `Limit (${MAX_CARD_QUANTITY}) reached` : 'Add to collection'}
					>
						<Plus
							size={Math.min(18, Math.floor(width/16))}
							class={collectionCount > 0 ? 'text-green-400' : 'text-white'}
						/>
					</button>

					<div class="w-px h-5 bg-white/30 mx-1"></div>

					<button
						aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
						class="p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						onclick={toggleWishlist}
						disabled={isUpdatingWishlist}
						title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
					>
						<Heart
							size={Math.min(18, Math.floor(width/16))}
							class={isInWishlist ? 'text-red-500 fill-red-500' : 'text-white'}
						/>
					</button>
				</div>
			{/if}
			<CardImage
				alt={cardName}
				class="rounded-lg transition-opacity duration-300 absolute top-0 left-0"
				style="width: {width}px; height: {height}px; max-width: 100%;"
				imageUrl={card.image}
				{lowRes}
				lazy={true}
				width={width}
				height={height}
			/>

			{#if set && set.name && set.name !== 'Unknown Set'}
				<a href={`/cards-list?set=${encodeURIComponent(set.name)}`} class="absolute bottom-2 left-2 z-10" onclick={stopPropagation(bubble('click'))} aria-label={`View all cards from set ${set.name}`} tabindex="-1">
					<button
						class="p-1 bg-black/50 border border-white/70 rounded-full hover:bg-white/20 transition-colors w-8 h-8 flex items-center justify-center"
						tabindex="-1"
						type="button"
						onclick={stopPropagation(bubble('click'))}
					>
						{#if 'logo' in set && set.logo}
							<img src={set.logo} alt={set.name} class="w-6 h-6 object-contain" />
						{:else}
							<CardStackIcon size={20} />
						{/if}
					</button>
				</a>
			{/if}
		</div>
		<div class="card-info-container h-[70px] bg-black/30 backdrop-blur-xs rounded-lg p-2 mt-1 flex flex-col justify-center" style="width: {width}px; max-width: 100%;">
			<h2 class="text-center font-bold text-md lg:text-lg text-pretty leading-none flex flex-wrap gap-x-2 items-center justify-center">
				{cardName}
				{#if set?.ptcgoCode}
					<span class="uppercase text-sm opacity-85">{set.ptcgoCode}</span>
				{/if}
				<span class="text-sm opacity-85"> #{cardNumber}/{set?.printedTotal || '?'}</span>
			</h2>
			<div class="flex items-center justify-center gap-2 mt-1">
				{#if card.cardMarketUrl && card.cardMarketUrl.trim() !== '' && (prices?.simple && prices.simple !== 100_000)}
					<a
						href={card.cardMarketUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="text-center text-sm lg:text-base hover:text-gold-300 transition-colors duration-200"
						onclick={stopPropagation(bubble('click'))}
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
					<h3 class="text-center text-sm lg:text-base">{prices?.simple && prices.simple !== 100_000 ? `${prices.simple} $` : 'Priceless'}</h3>
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
