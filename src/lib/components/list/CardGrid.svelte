<script lang="ts">
	import "~/styles/colors.css";
	import {displayAll, filterName, filterNumero, filterRarity, filterSet, filterSupertype, filterType, filterArtist, isVisible, mostExpensiveOnly, sortBy, sortOrder} from '$helpers/filters';
	import {getRarityLevel} from '$helpers/rarity';
	import CardComponent from '@components/list/Card.svelte';
	import Filters from '@components/list/Filters.svelte';
	import VirtualGrid from '@components/list/VirtualGrid.svelte';
	import PageTitle from '@components/PageTitle.svelte';
	import ScrollProgress from '@components/list/ScrollProgress.svelte';
	import type {FullCard, Set, Pokemon} from '$lib/types';

	export let cards: FullCard[];
	export let sets: Set[];
	export let pokemons: Pokemon[];
	export let rarities: string[];
	export let types: string[];
	export let artists: string[] = [];

	let clientWidth: number = 0;

	let displayedCards = cards;
	$: {
		if ($mostExpensiveOnly) {
			// Group cards by appropriate ID based on supertype
			const cardGroups = new Map<string, FullCard>();

			cards.forEach(card => {
				let groupKey = '';

				// Use different keys based on supertype
				if (card.supertype === 'Pokémon' && card.pokemonNumber) {
					// For Pokémon cards, group by Pokémon ID
					groupKey = `pokemon_${card.pokemonNumber}`;
				} else if (card.supertype === 'Trainer') {
					// For Trainer cards, group by name to keep different trainers separate
					groupKey = `trainer_${card.name.toLowerCase()}`;
				} else if (card.supertype === 'Energy') {
					// For Energy cards, group by name to keep different energies separate
					groupKey = `energy_${card.name.toLowerCase()}`;
				} else {
					// Fallback for any other types
					groupKey = `other_${card.name.toLowerCase()}`;
				}

				const existingCard = cardGroups.get(groupKey);

				// Only keep the most expensive card in each group
				if (!existingCard || (card.price ?? 0) > (existingCard.price ?? 0)) {
					cardGroups.set(groupKey, card);
				}
			});

			displayedCards = Array.from(cardGroups.values());
		} else {
			displayedCards = $displayAll ? cards : cards.filter((card, index, self) =>
				card.supertype === 'Pokémon' &&
				card.pokemonNumber &&
				self.findIndex(c => c.pokemonNumber === card.pokemonNumber) === index
			);
		}
	}

	$: if ($sortOrder || $sortBy) {
		displayedCards = displayedCards.sort((a, b) => {
			const aNumero = a.pokemonNumber ?? 0;
			const bNumero = b.pokemonNumber ?? 0;
			// Extraire le cardCode des images
			const aCardCode = parseInt(a.image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1') || '0');
			const bCardCode = parseInt(b.image.split('/').at(-1)?.split('_')[0].replace(/[a-z]*(\d+)[a-z]*/gi, '$1') || '0');

			if ($sortBy === 'sort-price') {
				return $sortOrder === 'asc' ? (a.price ?? -1) - (b.price ?? 0) : (b.price ?? 0) - (a.price ?? -1);
			} else if ($sortBy === 'sort-name') {
				const aPokemon = pokemons.find(p => p.id === a.pokemonNumber) ?? {name: ''};
				const bPokemon = pokemons.find(p => p.id === b.pokemonNumber) ?? {name: ''};
				return $sortOrder === 'asc' ? aPokemon.name.localeCompare(bPokemon.name) : bPokemon.name.localeCompare(aPokemon.name);
			} else if ($sortBy === 'sort-id') {
				return $sortOrder === 'asc' ? aCardCode - bCardCode : bCardCode - aCardCode;
			} else if ($sortBy === 'sort-rarity') {
				const aLevel = getRarityLevel(a.rarity);
				const bLevel = getRarityLevel(b.rarity);
				return $sortOrder === 'asc' ? aLevel - bLevel : bLevel - aLevel;
			} else if ($sortBy === 'sort-release-date') {
				const aSet = sets.find(s => s.name === a.setName);
				const bSet = sets.find(s => s.name === b.setName);
				const aReleaseDate = aSet?.releaseDate.getTime() ?? 0;
				const bReleaseDate = bSet?.releaseDate.getTime() ?? 0;
				return $sortOrder === 'asc' ? aReleaseDate - bReleaseDate : bReleaseDate - aReleaseDate;
			} else if ($sortBy === 'sort-artist') {
				const aArtist = a.artist || '';
				const bArtist = b.artist || '';
				return $sortOrder === 'asc' ? aArtist.localeCompare(bArtist) : bArtist.localeCompare(aArtist);
			}

			return $sortOrder === 'asc' ? aNumero - bNumero : bNumero - aNumero;
		});
	}

	let filteredCards = displayedCards;
	$: if ($filterName || $filterNumero || $filterRarity || $filterSet || $filterType || $filterSupertype || $filterArtist || $displayAll || $sortBy || $sortOrder || $mostExpensiveOnly) {
		filteredCards = displayedCards.filter(card => isVisible(card, pokemons.find(p => p.id === card.pokemonNumber)!!, sets.find(s => s.name === card.setName)!!));
	}
</script>

<svelte:window bind:innerWidth={clientWidth}/>

<div class="w-full mx-auto max-lg:px-2">
	<div class="flex max-lg:flex-col justify-between mx-28 max-lg:m-0 pb-4 lg:pb-5 items-center relative">
		<PageTitle title="Card List"/>
		<div class="flex flex-col max-lg:flex-row items-end gap-3 leading-normal max-lg:-mt-1.5">
			<Filters cards={filteredCards} {rarities} {sets} {types} {artists} {pokemons} />
		</div>
		<ScrollProgress />
	</div>
</div>

<VirtualGrid
	gapX={100 + clientWidth * 0.035}
	gapY={50}
	itemHeight={clientWidth > 350 ? 480 : 402}
	itemWidth={clientWidth > 350 ? 300 : 245}
	items={filteredCards}
	let:item
	marginTop={clientWidth ? 15 + clientWidth * 0.025 : 50}
>
	<CardComponent card={item} {pokemons} {sets}/>

	<div slot="empty">
		<p class="text-white text-center mt-32 text-2xl">No cards found</p>
	</div>
</VirtualGrid>
