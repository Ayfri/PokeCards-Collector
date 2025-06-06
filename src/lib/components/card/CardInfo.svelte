<script lang="ts">
	import PageTitle from '@components/PageTitle.svelte';
	import type {FullCard, Pokemon, PriceData, Set} from '$lib/types';
	import CardPrice from '@components/card/CardPrice.svelte';
	import { parseCardCode } from '$helpers/card-utils';
	import { page } from '$app/stores';
	import { collectionStore } from '$lib/stores/collection';
	import { wishlistStore } from '$lib/stores/wishlist';
	import { addCardToCollection, removeCardFromCollection } from '$lib/services/collections';
	import { addCardToWishlist, removeCardFromWishlist } from '$lib/services/wishlists';
	import Heart from 'lucide-svelte/icons/heart';
	import Plus from 'lucide-svelte/icons/plus';
	import Minus from 'lucide-svelte/icons/minus';
	import { fly } from 'svelte/transition';

	export let set: Set;
	export let card: FullCard;
	export let cardPrices: PriceData | undefined = undefined;
	export let pokemon: Pokemon | undefined = undefined;

	const cardNumber = parseCardCode(card.cardCode).cardNumber;

	// Compute the display name: Pokemon name if available, otherwise card name
	$: displayName = pokemon ? (pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)) : card?.name;
	// Compute description: Pokemon description if available, otherwise card rules/basic info
	$: displayDescription = pokemon ? pokemon.description : `Details for ${card?.name}`;

	function formatDate(date: Date) {
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}

	// --- User/Profile State ---
	$: user = $page.data.user;
	$: profile = $page.data.profile;

	// --- Collection/Wishlist State ---
	const MAX_CARD_QUANTITY = 99;

	// Reactive declarations for template
	$: collectionCount = card ? ($collectionStore.get(card.cardCode) || 0) : 0;
	$: cardIsWishlisted = card ? $wishlistStore.has(card.cardCode) : false;

	// --- Actions ---
	async function toggleWishlist(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!user || !profile || !card) return;
		if (cardIsWishlisted) { // Use reactive variable
			await removeCardFromWishlist(profile.username, card.cardCode);
		} else {
			await addCardToWishlist(profile.username, card.cardCode);
		}
	}
	async function handleAddCard(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!user || !profile || !card) return;
		// const count = collectionCount; // Use reactive variable directly in template guard
		if (collectionCount >= MAX_CARD_QUANTITY) return;
		await addCardToCollection(profile.username, card.cardCode);
	}
	async function handleRemoveCard(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!user || !profile || !card) return;
		// const count = collectionCount; // Use reactive variable directly in template guard
		if (collectionCount === 0) return;
		await removeCardFromCollection(profile.username, card.cardCode);
	}

	// --- Force reactivity for stores ---
	$: _collection = $collectionStore;
	$: _wishlist = $wishlistStore;
</script>

<div class="pokemon-info-container flex flex-col items-center gap-4 mt-6 lg:mt-12 max-lg:gap-0">
	{#if card && user && profile}
		<div class="flex items-center justify-center gap-2 mb-3">
			<!-- Collection Buttons -->
			<div class="flex items-center gap-1 rounded-full bg-gray-700/60 p-1 border border-gray-600 shadow-md">
				{#if collectionCount > 0}
					<button
						aria-label="Remove one copy from collection"
						class="p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						on:click={handleRemoveCard}
						disabled={collectionCount === 0}
						title="Remove one copy from collection"
						in:fly={{ y: -5, duration: 200, delay: 100 }}
					>
						<Minus size={16} class="text-white" />
					</button>
					<span
						class="text-md font-semibold text-green-400 px-1 min-w-[2ch] text-center select-none"
						title={`You have ${collectionCount} cop${collectionCount > 1 ? 'ies' : 'y'}`}
						in:fly={{ y: -5, duration: 200, delay: 150 }}
					>
						{collectionCount}
					</span>
				{/if}
				<button
					aria-label="Add one copy to collection"
					class="p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					on:click={handleAddCard}
					disabled={collectionCount >= MAX_CARD_QUANTITY}
					title={collectionCount >= MAX_CARD_QUANTITY ? `Limit (${MAX_CARD_QUANTITY}) reached` : 'Add to collection'}
					in:fly={{ y: -5, duration: 200, delay: collectionCount > 0 ? 200: 100 }}
				>
					<Plus size={16} class={collectionCount > 0 ? "text-green-400" : "text-white"} />
				</button>
			</div>

			<!-- Separator -->
			<div class="w-px h-6 bg-gray-600 mx-1"></div>

			<!-- Wishlist Button -->
			<div class="flex items-center justify-center rounded-full bg-gray-700/60 p-1 border border-gray-600 shadow-md">
				<button
					aria-label={cardIsWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
					class="p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					on:click={toggleWishlist}
					title={cardIsWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
					in:fly={{ y: -5, duration: 200, delay: 250 }}
				>
					<Heart size={16} class={cardIsWishlisted ? 'text-red-500 fill-red-500' : 'text-white'} />
				</button>
			</div>
		</div>
	{/if}

	<PageTitle title={displayName}/>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 w-full mt-4 lg:mt-0 max-w-[1000px]">
		<!-- Left Column: Card Details -->
		<div class="flex flex-col">
			<div class="bg-gray-800 border-2 border-gold-400 rounded-xl p-4 h-full flex flex-col">
				<h3 class="text-xl text-gold-400 font-bold mb-3 text-center">Card Details</h3>

				<div class="space-y-2 flex-grow">
					<!-- Add types as the first item -->
					{#if card?.types || card?.supertype}
						<div class="flex justify-between items-center p-2 bg-gray-900/60 rounded-lg">
							<dt class="font-semibold text-gold-300">Type:</dt>
							<dd class="flex flex-wrap justify-end gap-1.5">
								{#if card?.types}
									{#each card.types.toLowerCase().split(',') as type}
										<span class={`inline-block px-2 py-0.5 rounded-full text-sm font-medium capitalize ${type} bg-[var(--type-color)] text-white`}>
											{type}
										</span>
									{/each}
								{:else if card?.supertype}
									<span class={`inline-block px-2 py-0.5 rounded-full text-sm font-medium capitalize ${card.supertype.toLowerCase()} text-white`}>
										{card.supertype}
									</span>
								{/if}
							</dd>
						</div>
					{/if}

					{#if card.artist !== 'Unknown'}
						<div class="flex justify-between items-center p-2 bg-gray-900/60 rounded-lg">
							<dt class="font-semibold text-gold-300">Artist:</dt>
							<dd class="text-white text-right">
								<a 
									href="/cards-list?artist={encodeURIComponent(card.artist.toLowerCase())}" 
									class="hover:text-gold-400 transition-colors underline group"
									title="View all cards by this artist"
								>
									{card.artist}
									<span class="text-xs opacity-80 italic ml-1 text-gray-400 group-hover:text-gold-300 transition-colors">(view all)</span>
								</a>
							</dd>
						</div>
					{/if}

					{#if cardNumber && set.printedTotal}
						<div class="flex justify-between items-center p-2 bg-gray-900/60 rounded-lg">
							<dt class="font-semibold text-gold-300">Number:</dt>
							<dd class="text-white text-right">{cardNumber} / {set.printedTotal}</dd>
						</div>
					{/if}

					<div class="flex justify-between items-center p-2 bg-gray-900/60 rounded-lg">
						<dt class="font-semibold text-gold-300">Rarity:</dt>
						<dd class="text-white text-right">{card.rarity}</dd>
					</div>

					<div class="flex justify-between items-center p-2 bg-gray-900/60 rounded-lg">
						<dt class="font-semibold text-gold-300">Set:</dt>
						<dd class="flex items-center gap-2 justify-end">
							<a 
								href="/cards-list?set={encodeURIComponent(set.name)}" 
								class="text-white hover:text-gold-400 transition-colors underline group"
								title="View all cards in this set"
							>
								{set.name}
								<span class="text-xs opacity-80 italic ml-1 text-gray-400 group-hover:text-gold-300 transition-colors">(view all)</span>
							</a>
							{#if set.logo}
								<a href="/cards-list?set={encodeURIComponent(set.name)}" title="View all cards in this set">
									<img
										src={set.logo}
										alt={`${set.name} logo`}
										class="inline-block max-w-[60px] max-h-[25px] object-contain hover:opacity-80 transition-opacity"
										loading="lazy"
									/>
								</a>
							{/if}
						</dd>
					</div>

					<div class="flex justify-between items-center p-2 bg-gray-900/60 rounded-lg">
						<dt class="font-semibold text-gold-300">Release Date:</dt>
						<dd class="text-white text-right">{formatDate(set.releaseDate)}</dd>
					</div>
				</div>

				<div class="mt-4 bg-gray-900 border-2 border-gold-400 rounded-lg p-3">
					<div class="text-sm text-white whitespace-pre-line">{displayDescription}</div>
				</div>
			</div>
		</div>

		<!-- Right Column: Prices -->
		<div class="flex flex-col items-center">
			{#if cardPrices}
				<CardPrice {card} {cardPrices} />
			{:else}
				<!-- Fallback display if cardmarket data is not available -->
				<div class="bg-gray-800 border-2 border-gold-400 rounded-xl p-4 w-full">
					<h3 class="text-xl text-gold-400 font-bold mb-3 text-center">Card Price</h3>
					<div class="bg-gray-900 border-2 border-gold-400 rounded-lg p-3 mb-4 text-center">
						<span class="text-2xl font-bold">
							Priceless
						</span>
						<span class="text-sm text-gray-400 block">Main Price</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
