import type { FullCard, GridPokemon, Set } from '#lib/types.js';
import { cardGroupKey } from '#helpers/card-utils.ts';
import { compareRarities, getRarityLevel } from '#helpers/rarity.ts';
import type { ActiveFilters } from '#stores/filters.svelte.ts';
import { CARD_SIZES, DEFAULT_CARD_SIZE } from '#stores/grid.svelte.ts';

/** Set lookups are the grid's hot path, so the map is rebuilt only when the set list changes. */
let cachedSets: Set[] | null = null;
let setsByKey = new Map<string, Set>();

/** Set ids repeat across languages, so the key holds the language too. A card or set with no language is English. */
const setKey = ({ language = 'en', setId }: Pick<FullCard, 'language' | 'setId'>) => `${language}:${setId}`;

export function getCardSet(card: Pick<FullCard, 'language' | 'setId'>, sets: Set[]): Set | null {
	if (cachedSets !== sets) {
		setsByKey = new Map(sets.map(set => [setKey(set), set]));
		cachedSets = sets;
	}
	return setsByKey.get(setKey(card)) ?? null;
}

/** Groups Pokémon by dex number and other supertypes by name (see `cardGroupKey`), keeping only the priciest card of each group. */
export function keepMostExpensivePerGroup(cards: FullCard[]): FullCard[] {
	const groups = new Map<string, FullCard>();

	for (const card of cards) {
		const groupKey = cardGroupKey(card);

		const existing = groups.get(groupKey);
		if (!existing || (card.price ?? 0) > (existing.price ?? 0)) {
			groups.set(groupKey, card);
		}
	}

	return [...groups.values()];
}

interface SortValues {
	artist: string;
	cardNumber: string;
	cardNumberInt: number;
	isPokemon: boolean;
	name: string;
	pokemonNumber: number;
	price: number;
	rarityLevel: number;
	releaseDate: number;
	supertype: string;
}

const SUPERTYPE_ORDER: Record<string, number> = { Energy: 3, 'Pokémon': 1, Trainer: 2 };


/** Sort keys are computed once per card up front, so the comparator only does lookups. */
export function sortCards(
	cards: FullCard[],
	sortBy: string,
	sortOrder: string,
	pokemons: GridPokemon[],
	sets: Set[],
): FullCard[] {
	const pokemonMap = new Map(pokemons.map(pokemon => [pokemon.id, pokemon]));
	const sortValues = new Map<string, SortValues>();

	for (const card of cards) {
		const pokemon = pokemonMap.get(card.pokemonNumber ?? 0);
		const cardNumber = card.localId;
		const cardNumberInt = parseInt(cardNumber);

		sortValues.set(card.cardCode, {
			artist: card.artist || '',
			cardNumber,
			cardNumberInt: isNaN(cardNumberInt) ? 0 : cardNumberInt,
			isPokemon: card.supertype === 'Pokémon' && card.pokemonNumber != null,
			name: pokemon?.name ?? card.name,
			pokemonNumber: card.pokemonNumber ?? 0,
			price: card.price ?? 0,
			rarityLevel: getRarityLevel(card.rarity),
			releaseDate: getCardSet(card, sets)?.releaseDate?.getTime() ?? 0,
			supertype: card.supertype,
		});
	}

	const multiplier = sortOrder === 'asc' ? 1 : -1;

	return [...cards].sort((a, b) => {
		const aValues = sortValues.get(a.cardCode)!;
		const bValues = sortValues.get(b.cardCode)!;

		switch (sortBy) {
			case 'sort-artist': return aValues.artist.localeCompare(bValues.artist) * multiplier;
			case 'sort-id': return a.cardCode.localeCompare(b.cardCode) * multiplier;
			case 'sort-name': return aValues.name.localeCompare(bValues.name) * multiplier;
			case 'sort-price': return (aValues.price - bValues.price) * multiplier;
			case 'sort-rarity': return (aValues.rarityLevel - bValues.rarityLevel) * multiplier;
			case 'sort-release-date': return (aValues.releaseDate - bValues.releaseDate) * multiplier;
		}

		/** The default sort is by Pokédex number, with the non-Pokémon cards grouped by supertype at the end. */
		if (aValues.isPokemon !== bValues.isPokemon) return aValues.isPokemon ? -1 : 1;

		if (!aValues.isPokemon) {
			const aOrder = SUPERTYPE_ORDER[aValues.supertype] || 99;
			const bOrder = SUPERTYPE_ORDER[bValues.supertype] || 99;
			if (aOrder !== bOrder) return aOrder - bOrder;
			return a.name.localeCompare(b.name);
		}

		if (aValues.pokemonNumber !== bValues.pokemonNumber) return (aValues.pokemonNumber - bValues.pokemonNumber) * multiplier;
		if (aValues.releaseDate !== bValues.releaseDate) return (aValues.releaseDate - bValues.releaseDate) * multiplier;
		if (aValues.cardNumberInt && bValues.cardNumberInt) return (aValues.cardNumberInt - bValues.cardNumberInt) * multiplier;
		return aValues.cardNumber.localeCompare(bValues.cardNumber) * multiplier;
	});
}

/** An inactive filter skips its test. Filtering runs before the sort, so the sort and everything after it handle the smaller list. */
export function filterCards(cards: FullCard[], filters: ActiveFilters): FullCard[] {
	return cards.filter(card =>
		(!filters.numero || card.pokemonNumber?.toString() === filters.numero)
		&& (!filters.name || card.name.toLowerCase().includes(filters.name))
		&& (filters.type === 'all' || card.types.toLowerCase().includes(filters.type))
		&& (filters.rarity === 'all' || card.rarity.toLowerCase() === filters.rarity)
		&& (filters.supertype === 'all' || card.supertype.toLowerCase() === filters.supertype)
		&& (filters.artist === 'all' || card.artist.toLowerCase() === filters.artist)
		&& (filters.set === 'all' || card.setName.toLowerCase() === filters.set));
}

/** Stable reorder: Pokémon, then Trainer, then Energy, then any other supertype, keeping the incoming order within a supertype. A partition in one pass, ~10x faster than a sort on 21k cards. */
export function sortBySupertype(cards: FullCard[]): FullCard[] {
	const groups: FullCard[][] = [[], [], [], []];
	for (const card of cards) groups[(SUPERTYPE_ORDER[card.supertype] ?? 4) - 1].push(card);
	return groups.flat();
}

/** Distinct rarities of a card list, most common first. They come from the list because a Postgres query would scan all of `cards` for ~30 values. */
export function distinctRarities(cards: FullCard[]): string[] {
	return [...new Set(cards.map(card => card.rarity).filter(Boolean))].sort(compareRarities);
}

/** Distinct artists of a card list, sorted case-insensitively like the filter dropdown expects. */
export function distinctArtists(cards: FullCard[]): string[] {
	return [...new Set(cards.map(card => card.artist).filter(Boolean))]
		.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

/** Pokémon cards keep the 2.5/3.5 ratio; below 768px the width is split in two so a phone always shows two per row. */
export function getCardDimensions(size: number, clientWidth: number) {
	const gapX = 15;
	const gapY = 20;
	const availableWidth = clientWidth * 0.96;

	if (clientWidth < 768) {
		const width = Math.max(100, Math.floor((availableWidth - gapX) / 2));
		return { cardsPerRow: 2, gapX, gapY, height: Math.floor(width / (2.5 / 3.5)), width };
	}

	const width = CARD_SIZES[size]?.width ?? CARD_SIZES[DEFAULT_CARD_SIZE].width;
	return {
		cardsPerRow: Math.max(1, Math.floor(availableWidth / (width + gapX))),
		gapX,
		gapY,
		height: Math.floor(width / (2.5 / 3.5)),
		width,
	};
}
