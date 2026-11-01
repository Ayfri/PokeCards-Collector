<script lang="ts">
	import PageTitle from '#components/PageTitle.svelte';
	import type {FullCard, Pokemon, PriceData, Set} from '#lib/types.js';
	import CardPrice from '#components/card/CardPrice.svelte';
	import RaritySymbol from '#components/card/RaritySymbol.svelte';
	import TypeSymbol from '#components/card/TypeSymbol.svelte';
	import { formatCardNumber } from '#helpers/card-utils.ts';
	import { page } from '$app/state';
	import { catalogueOfPath } from '#helpers/catalogues.ts';
	import { collection } from '#stores/collection.svelte.ts';
	import { wishlist } from '#stores/wishlist.svelte.ts';
	import { addCardToCollection, removeCardFromCollection } from '#lib/services/collections.ts';
	import { addCardToWishlist, removeCardFromWishlist } from '#lib/services/wishlists.ts';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Gem from '@lucide/svelte/icons/gem';
	import Hash from '@lucide/svelte/icons/hash';
	import Heart from '@lucide/svelte/icons/heart';
	import Library from '@lucide/svelte/icons/library';
	import Minus from '@lucide/svelte/icons/minus';
	import Paintbrush from '@lucide/svelte/icons/paintbrush';
	import Plus from '@lucide/svelte/icons/plus';
	import SetLogo from '#components/SetLogo.svelte';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { fly } from 'svelte/transition';

	interface Props {
		set: Set;
		card: FullCard;
		cardPrices?: PriceData | undefined;
		pokemon?: Pokemon | undefined;
	}

	let {
		set,
		card,
		cardPrices = undefined,
		pokemon = undefined
	}: Props = $props();

	const cardNumber = $derived(card.localId);

	const catalogue = $derived(catalogueOfPath(page.url.pathname));

	const displayName = $derived(pokemon && catalogue.speciesTitles ? (pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)) : card?.name);
	const displayDescription = $derived(pokemon ? pokemon.description : `Details for ${card?.name}`);

	function formatDate(date: Date) {
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}

	const user = $derived(page.data.user);
	const profile = $derived(page.data.profile);

	const MAX_CARD_QUANTITY = 99;

	const collectionCount = $derived(collection.count(card.cardCode));
	const cardIsWishlisted = $derived(wishlist.has(card.cardCode));

	async function toggleWishlist(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!user || !profile || !card) return;
		if (cardIsWishlisted) {
			await removeCardFromWishlist(profile.username, card.cardCode);
		} else {
			await addCardToWishlist(profile.username, card.cardCode);
		}
	}
	async function handleAddCard(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!user || !profile || !card) return;
		if (collectionCount >= MAX_CARD_QUANTITY) return;
		await addCardToCollection(profile.username, card.cardCode);
	}
	async function handleRemoveCard(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!user || !profile || !card) return;
		if (collectionCount === 0) return;
		await removeCardFromCollection(profile.username, card.cardCode);
	}
</script>

<div class="pokemon-info-container flex flex-col items-center gap-4 mt-6 lg:mt-12 max-lg:gap-0">
	{#if card && user && profile}
		<div class="flex items-center justify-center gap-2 mb-3">
			<div class="flex items-center gap-1 rounded-full bg-gray-700/60 p-1 border border-gray-600 shadow-md">
				{#if collectionCount > 0}
					<button
						aria-label="Remove one copy from collection"
						class="p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						onclick={handleRemoveCard}
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
					onclick={handleAddCard}
					disabled={collectionCount >= MAX_CARD_QUANTITY}
					title={collectionCount >= MAX_CARD_QUANTITY ? `Limit (${MAX_CARD_QUANTITY}) reached` : 'Add to collection'}
					in:fly={{ y: -5, duration: 200, delay: collectionCount > 0 ? 200: 100 }}
				>
					<Plus size={16} class={collectionCount > 0 ? "text-green-400" : "text-white"} />
				</button>
			</div>

			<div class="w-px h-6 bg-gray-600 mx-1"></div>

			<div class="flex items-center justify-center rounded-full bg-gray-700/60 p-1 border border-gray-600 shadow-md">
				<button
					aria-label={cardIsWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
					class="p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={toggleWishlist}
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
		<div class="flex flex-col">
			<div class="bg-gray-800 border-2 border-gold-400 rounded-xl p-4 h-full flex flex-col">
				<h3 class="text-xl text-gold-400 font-bold mb-3 text-center">Card Details</h3>

				<div class="space-y-2 grow">
					{#if card?.types || card?.supertype}
						<div class="flex justify-between items-center p-2 bg-gray-900/60 rounded-lg">
							<dt class="flex items-center gap-1.5 font-semibold text-gold-300" title="Energy type, or the card category for Trainer and Energy cards"><Sparkles size={14} /> Type:</dt>
							<dd class="flex flex-wrap justify-end gap-1.5">
								{#if card?.types}
									{#each card.types.toLowerCase().split(',') as type (type)}
										<a
											class={['inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-medium capitalize bg-(--type-color) transition hover:brightness-110 hover:ring-2 hover:ring-gold-400', type, type === 'colorless' ? 'text-gray-900' : 'text-white']}
											href="{catalogue.gridRoute}?pokemontype={encodeURIComponent(type.trim())}"
											title="View all {type.trim()} cards"
										>
											<TypeSymbol glyph="black" pale {type} />
											{type}
										</a>
									{/each}
								{:else if card?.supertype}
									<a
										class={`inline-block px-2 py-0.5 rounded-full text-sm font-medium capitalize ${card.supertype.toLowerCase()} text-white transition hover:text-gold-400`}
										href="{catalogue.gridRoute}?type={card.supertype.toLowerCase().replace('é', 'e')}"
										title="View all {card.supertype} cards"
									>
										{card.supertype}
									</a>
								{/if}
							</dd>
						</div>
					{/if}

					{#if card.artist !== 'Unknown'}
						<div class="flex justify-between items-center p-2 bg-gray-900/60 rounded-lg">
							<dt class="flex items-center gap-1.5 font-semibold text-gold-300" title="Illustrator of this card"><Paintbrush size={14} /> Artist:</dt>
							<dd class="text-white text-right">
								<a 
									href="{catalogue.gridRoute}?artist={encodeURIComponent(card.artist.toLowerCase())}"
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
							<dt class="flex items-center gap-1.5 font-semibold text-gold-300" title="Position of this card inside its set"><Hash size={14} /> Number:</dt>
							<dd class="text-white text-right">{formatCardNumber(cardNumber, set.printedTotal)}</dd>
						</div>
					{/if}

					<div class="flex justify-between items-center p-2 bg-gray-900/60 rounded-lg">
						<dt class="flex items-center gap-1.5 font-semibold text-gold-300" title="How scarce this print is"><Gem size={14} /> Rarity:</dt>
						<dd class="text-white text-right">
								<a
									class="inline-flex items-center justify-end gap-2 underline transition-colors hover:text-gold-400"
									href="{catalogue.gridRoute}?rarity={encodeURIComponent(card.rarity.toLowerCase())}"
									title="View all {card.rarity} cards"
								>
									<RaritySymbol class="text-base" rarity={card.rarity} />{card.rarity}
								</a>
							</dd>
					</div>

					<div class="flex justify-between items-center p-2 bg-gray-900/60 rounded-lg">
						<dt class="flex items-center gap-1.5 font-semibold text-gold-300" title="Set this card was printed in"><Library size={14} /> Set:</dt>
						<dd class="flex items-center gap-2 justify-end">
							<a 
								href="{catalogue.gridRoute}?set={encodeURIComponent(set.name)}"
								class="text-white hover:text-gold-400 transition-colors underline group"
								title="View all cards in this set"
							>
								{set.name}
								<span class="text-xs opacity-80 italic ml-1 text-gray-400 group-hover:text-gold-300 transition-colors">(view all)</span>
							</a>
							<a href="{catalogue.gridRoute}?set={encodeURIComponent(set.name)}" title="View all cards in this set">
								<SetLogo class="inline-block max-w-[60px] max-h-[25px] object-contain hover:opacity-80 transition-opacity" {set} />
							</a>
						</dd>
					</div>

					<div class="flex justify-between items-center p-2 bg-gray-900/60 rounded-lg">
						<dt class="flex items-center gap-1.5 font-semibold text-gold-300" title="Release date of the set"><CalendarDays size={14} /> Release Date:</dt>
						<dd class="text-white text-right">{formatDate(set.releaseDate)}</dd>
					</div>
				</div>

				<div class="mt-4 bg-gray-900 border-2 border-gold-400 rounded-lg p-3">
					<div class="text-sm text-white whitespace-pre-line">{displayDescription}</div>
				</div>
			</div>
		</div>

		<div class="flex flex-col items-center">
			{#if cardPrices}
				<CardPrice {card} {cardPrices} />
			{:else}
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
