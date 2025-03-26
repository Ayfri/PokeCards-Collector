<script lang="ts">
	import "~/styles/colors.css";
	import {displayAll, filterName, filterNumero, filterRarity, filterSet, filterType, isVisible, sortBy, sortOrder} from '$helpers/filters.js';
	import CardComponent from '@components/list/Card.svelte';
	import Filters from '@components/list/Filters.svelte';
	import VirtualGrid from '@components/list/VirtualGrid.svelte';
	import PageTitle from '@components/PageTitle.svelte';
	import type {Card, Set} from '~/types.js';
	import {getRarityLevel} from '$helpers/rarity.js';

	export let cards: Card[];
	export let sets: Set[];
	export let rarities: string[];
	export let types: string[];

	let clientWidth: number = 0;

	let displayedCards = cards;
	$: displayedCards =
		$displayAll ? cards : cards.filter((card, index, self) => card.pokemon && self.findIndex(c => c.pokemon.id === card.pokemon.id) === index);

	$: if ($sortOrder || $sortBy) {
		displayedCards = displayedCards.sort((a, b) => {
			const aNumero = parseInt(a.numero);
			const bNumero = parseInt(b.numero);
			if ($sortBy === 'sort-price') {
				return $sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
			} else if ($sortBy === 'sort-name') {
				return $sortOrder === 'asc' ? a.pokemon.name.localeCompare(b.pokemon.name) : b.pokemon.name.localeCompare(a.pokemon.name);
			} else if ($sortBy === 'sort-rarity') {
				const aLevel = getRarityLevel(a.rarity);
				const bLevel = getRarityLevel(b.rarity);
				return $sortOrder === 'asc' ? aLevel - bLevel : bLevel - aLevel;
			}

			return $sortOrder === 'asc' ? aNumero - bNumero : bNumero - aNumero;
		});
	}

	let filteredCards = displayedCards;
	$: if ($filterName || $filterNumero || $filterRarity || $filterSet || $filterType || $displayAll) {
		filteredCards = displayedCards.filter(isVisible);
	}
</script>

<svelte:window bind:innerWidth={clientWidth}/>

<div class="w-full mx-auto max-lg:px-2">
	<div class="flex max-lg:flex-col justify-between mx-28 max-lg:m-0 pb-2 lg:pb-3 items-center border-b-white border-b-[6px] max-lg:border-b-4">
		<PageTitle title="Card List"/>
		<div class="flex flex-col max-lg:flex-row items-end gap-3 leading-normal max-lg:-mt-1.5">
			<Filters cards={displayedCards} {rarities} {sets} {types}/>
		</div>
	</div>
</div>

<VirtualGrid
	gapX={100 + clientWidth * 0.035}
	gapY={50}
	itemHeight={clientWidth > 350 ? 480 : 402}
	itemWidth={clientWidth > 350 ? 300 : 245}
	items={filteredCards}
	let:item
	marginTop={15 + clientWidth * 0.025}
>
	<CardComponent card={item}/>

	<div slot="empty">
		<p class="text-white text-center mt-32 text-2xl">No cards found</p>
	</div>
</VirtualGrid>
