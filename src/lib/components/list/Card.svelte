<script lang="ts">
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
	import { getCardSet } from '$helpers/card-grid';
	import { Plus, Minus } from '@lucide/svelte';
	import CardStackIcon from '@lucide/svelte/icons/layers';

	interface Props {
		card: FullCard;
		customHeight?: number | null;
		customWidth?: number | null;
		/** Loads the first screenful without waiting for the lazy-loading pass, so the LCP card is requested immediately. */
		eager?: boolean;
		lowRes?: boolean;
		/** Prebuilt by the grid: a linear `find` over ~1000 Pokémon per card was showing up on every scroll frame. */
		pokemonMap: Map<number, Pokemon>;
		prices: PriceData | undefined;
		sets: Set[];
	}

	let {
		card,
		customHeight = null,
		customWidth = null,
		eager = false,
		lowRes = false,
		pokemonMap,
		prices,
		sets
	}: Props = $props();

	/** Maximum quantity allowed per card, mirrors the backend limit. */
	const MAX_CARD_QUANTITY = 99;

	const rarity = $derived(card.rarity ?? 'Unknown');
	const types = $derived(card.types ?? '');
	const cardCode = $derived(card.cardCode);

	// Calculer les dimensions réelles à utiliser
	const width = $derived(customWidth || 300);
	const height = $derived(customHeight || 420);

	const parsedCardCode = $derived(parseCardCode(cardCode));
	const cardNumber = $derived(parsedCardCode.cardNumber ?? '0');
	const pokemon = $derived(parsedCardCode.pokemonNumber ? pokemonMap.get(parsedCardCode.pokemonNumber) : null);
	const set = $derived(getCardSet(cardCode, sets) || { name: 'Unknown Set', printedTotal: 0, ptcgoCode: null });

	// Access user and profile from page state
	const user = $derived(page.data.user);
	const profile = $derived(page.data.profile);

	// Détermine si la carte est dans la wishlist en fonction du store
	const isInWishlist = $derived($wishlistStore.has(cardCode));
	let isUpdatingWishlist = $state(false);

	// Get the count of the card in the collection from the store
	const collectionCount = $derived($collectionStore.get(cardCode) || 0);
	let isUpdatingCollection = $state(false);

	const isCollectionLimitReached = $derived(collectionCount >= MAX_CARD_QUANTITY);

	// Déterminer si nous sommes sur la page japonaise
	const isJapaneseCard = $derived(page.url.pathname.includes('/japan'));
	const cardLink = $derived(isJapaneseCard ? `/jp-card/${cardCode}/` : `/card/${cardCode}/`);

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

	const cardName = $derived(pokemon
		? pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)
		: (card.name ? card.name.charAt(0).toUpperCase() + card.name.slice(1) : 'Unknown'));
</script>

<div class="card-pokecards-collector group relative flex flex-col items-center w-fit cursor-pointer text-white transition-transform duration-500 ease-out hover:scale-[1.025] hover:z-10" style="z-index: 1;">
	<!-- Stretched link: covers the whole card so nested links stay valid HTML. -->
	<a
		aria-label={`Go to the card page of ${cardName}`}
		class="absolute inset-0 z-2"
		draggable="false"
		href={cardLink}
		rel="dofollow"
	></a>
	<div class:list={rarity.toLowerCase()}></div>
	{#if !NO_IMAGES}
		<div
			class={`aura absolute blur-[1.5rem] rounded-[15rem] -z-10 bg-(--type-color) will-change-transform
			transition-transform duration-700 ease-out group-hover:scale-110 ${types.toLowerCase().split(',')}`}
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
			class="rounded-lg absolute top-0 left-0"
			style="width: {width}px; height: {height}px; max-width: 100%;"
			imageUrl={card.image}
			{lowRes}
			lazy={!eager}
			priority={eager}
			width={width}
			height={height}
		/>

		{#if set && set.name && set.name !== 'Unknown Set'}
			<a
				href={`/cards-list?set=${encodeURIComponent(set.name)}`}
				class="absolute bottom-2 left-2 z-10 p-1 bg-black/50 border border-white/70 rounded-full hover:bg-white/20 transition-colors w-8 h-8 flex items-center justify-center"
				aria-label={`View all cards from set ${set.name}`}
				tabindex="-1"
			>
				{#if 'logo' in set && set.logo}
					<img src={set.logo} alt={set.name} class="w-6 h-6 object-contain" width="24" height="24" loading="lazy" decoding="async" />
				{:else}
					<CardStackIcon size={20} />
				{/if}
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
			{#if card.cardMarketUrl && card.cardMarketUrl.trim() !== '' && prices?.simple}
				<a
					href={card.cardMarketUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="relative z-10 text-center text-sm lg:text-base hover:text-gold-300 transition-colors duration-200"
					aria-label="View on Cardmarket"
				>
					<div class="flex items-center justify-center whitespace-nowrap">
						<span>{prices?.simple ? `${prices.simple} €` : 'Priceless'}</span>
						<span class="mx-1">-</span>
						<span class="text-gold-400 font-bold underline flex items-center">
							Cardmarket
							<ExternalLink size={Math.min(12, Math.floor(width/25))} class="ml-1"/>
						</span>
					</div>
				</a>
			{:else}
				<h3 class="text-center text-sm lg:text-base">{prices?.simple ? `${prices.simple} €` : 'Priceless'}</h3>
			{/if}
		</div>
	</div>
</div>
