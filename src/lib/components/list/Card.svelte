<script lang="ts">
	import {formatEuros} from '#helpers/format.ts';
	import {NO_IMAGES} from '#helpers/card-images.ts';
	import { page } from '$app/state';
	import type {Card, GridPokemon, Set} from '#lib/types.js';
	import { cardPath, formatCardNumber } from '#helpers/card-utils.ts';
	import CardImage from '#components/card/CardImage.svelte';
	import CollectionControls from '#components/card/CollectionControls.svelte';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { getCardSet } from '#helpers/card-grid.ts';
	import { catalogueOfPath, CATALOGUES } from '#helpers/catalogues.ts';
	import SetBadge from '#components/SetBadge.svelte';

	interface Props {
		card: Card;
		customHeight?: number | null;
		customWidth?: number | null;
		/** Loads the first row without waiting for the lazy-loading pass, so the LCP card is requested immediately; the rows below load lazily and at normal priority. */
		eager?: boolean;
		lowRes?: boolean;
		/** Built once by the grid, because a linear `find` over ~1000 Pokémon in every card would show up on each scroll frame. */
		pokemonMap: Map<number, GridPokemon>;
		sets: Set[];
	}

	let {
		card,
		customHeight = null,
		customWidth = null,
		eager = false,
		lowRes = false,
		pokemonMap,
		sets
	}: Props = $props();

	const types = $derived(card.types ?? '');

	const width = $derived(customWidth || 300);
	const height = $derived(customHeight || 420);

	/** Floored at 14px: a plain width/16 left the S preset (180px cards) with 11px icons, too small to hit. */
	const controlIconSize = $derived(Math.round(Math.max(14, Math.min(18, width / 16))));
	/** Insets the overlay controls proportionally, so they do not sit in the very corner of a small card. */
	const controlInset = $derived(Math.round(Math.max(10, width * 0.045)));

	const cardNumber = $derived(card.localId);
	const price = $derived(card.price);
	const pokemon = $derived(card.pokemonNumber ? pokemonMap.get(card.pokemonNumber) : null);
	const set = $derived(getCardSet(card, sets));

	const catalogue = $derived(card.language ? CATALOGUES[card.language] : catalogueOfPath(page.url.pathname));
	const cardLink = $derived(cardPath(catalogue.language, card));

	const cardName = $derived(pokemon && catalogue.speciesTitles
		? pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)
		: (card.name ? card.name.charAt(0).toUpperCase() + card.name.slice(1) : 'Unknown'));
</script>

<div class="group relative flex flex-col items-center w-fit cursor-pointer text-white transition-transform duration-300 ease-out hover:scale-[1.025] z-1 hover:z-10" data-card-path={cardLink}>
	<!-- Stretched link: covers the whole card so nested links stay valid HTML. It does not wrap the image, so `data-card-path` tells the page transition which card this tile draws. -->
	<a
		aria-label={`Go to the card page of ${cardName}`}
		class="absolute inset-0 z-2"
		draggable="false"
		href={cardLink}
		rel="dofollow"
		title={`Go to the card page of ${cardName}`}
	></a>
	{#if !NO_IMAGES}
		<div
			class={`aura absolute blur-[1.5rem] rounded-[15rem] -z-10 bg-(--type-color) will-change-transform
			transition-transform duration-300 ease-out group-hover:scale-110 ${types.toLowerCase().split(',')}`}
			style="width: {width * 0.8}px; height: {height * 0.85}px;"
		></div>
	{/if}
	<div class="relative" style="width: {width}px; height: {height}px; max-width: 100%;">
		<CollectionControls cardCode={card.cardCode} iconSize={controlIconSize} style="bottom: {controlInset}px; right: {controlInset}px;" />
		<CardImage
			alt="{cardName} - {card.setName}"
			{card}
			class="rounded-lg absolute top-0 left-0"
			height={height}
			imageUrl={card.image}
			lazy={!eager}
			{lowRes}
			priority={eager}
			set={set ?? undefined}
			style="width: {width}px; height: {height}px; max-width: 100%;"
			title={cardName}
			{types}
			width={width}
		/>

		{#if set}
			<SetBadge language={card.language} {set} style="bottom: {controlInset}px; left: {controlInset}px;" />
		{/if}
	</div>
	<div class="h-[70px] bg-black/30 backdrop-blur-xs rounded-lg p-2 mt-1 flex flex-col justify-center" style="width: {width}px; max-width: 100%;">
		<h2 class="text-center font-bold text-md lg:text-lg text-pretty leading-none flex flex-wrap gap-x-2 items-center justify-center">
			{cardName}
			{#if set?.ptcgoCode}
				<span class="uppercase text-sm opacity-85">{set.ptcgoCode}</span>
			{/if}
			<span class="text-sm opacity-85"> #{formatCardNumber(cardNumber, set?.printedTotal)}</span>
		</h2>
		<div class="flex items-center justify-center gap-2 mt-1">
			{#if card.cardMarketUrl && price}
				<a
					aria-label="View on Cardmarket"
					class="relative z-10 text-center text-sm lg:text-base hover:text-gold-300 transition-colors duration-200"
					href={card.cardMarketUrl}
					rel="noopener noreferrer"
					target="_blank"
				>
					<div class="flex items-center justify-center whitespace-nowrap">
						<span>{price ? formatEuros(price) : 'Priceless'}</span>
						<span class="mx-1">-</span>
						<span class="text-gold-400 font-bold underline flex items-center">
							Cardmarket
							<ExternalLink class="ml-1" size={Math.min(12, Math.floor(width/25))}/>
						</span>
					</div>
				</a>
			{:else}
				<h3 class="text-center text-sm lg:text-base">{price ? formatEuros(price) : 'Priceless'}</h3>
			{/if}
		</div>
	</div>
</div>
