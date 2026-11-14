import type { FullCard, GridPokemon, Set } from '#lib/types.js';
import { cardGroupKey, memoizedOn, pokemonsById } from '#helpers/card-utils.ts';
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
	card: FullCard;
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

const sortValuesMemo = new WeakMap<object, unknown>();

/**
 * Sort keys are computed once per card, then the sort orders entries that carry their card and keys, so the comparator reads plain fields.
 * The keys are kept per card while the Pokémon and set lists live, so a sort change over the same cards computes nothing.
 */
export function sortCards(
	cards: FullCard[],
	sortBy: string,
	sortOrder: string,
	pokemons: GridPokemon[],
	sets: Set[],
): FullCard[] {
	const pokemonMap = pokemonsById(pokemons);
	const known = memoizedOn(sortValuesMemo, [pokemons, sets], () => new WeakMap<FullCard, SortValues>());

	const entries = cards.map(card => {
		let values = known.get(card);
		if (!values) {
			const cardNumberInt = parseInt(card.localId);
			known.set(card, values = {
				artist: card.artist || '',
				card,
				cardNumber: card.localId,
				cardNumberInt: isNaN(cardNumberInt) ? 0 : cardNumberInt,
				isPokemon: card.supertype === 'Pokémon' && card.pokemonNumber != null,
				name: pokemonMap.get(card.pokemonNumber ?? 0)?.name ?? card.name,
				pokemonNumber: card.pokemonNumber ?? 0,
				price: card.price ?? 0,
				rarityLevel: getRarityLevel(card.rarity),
				releaseDate: getCardSet(card, sets)?.releaseDate?.getTime() ?? 0,
				supertype: card.supertype,
			});
		}
		return values;
	});

	const multiplier = sortOrder === 'asc' ? 1 : -1;

	return entries.sort((a, b) => {
		switch (sortBy) {
			case 'sort-artist': return a.artist.localeCompare(b.artist) * multiplier;
			case 'sort-id': return a.card.cardCode.localeCompare(b.card.cardCode) * multiplier;
			case 'sort-name': return a.name.localeCompare(b.name) * multiplier;
			case 'sort-price': return (a.price - b.price) * multiplier;
			case 'sort-rarity': return (a.rarityLevel - b.rarityLevel) * multiplier;
			case 'sort-release-date': return (a.releaseDate - b.releaseDate) * multiplier;
		}

		/** The default sort is by Pokédex number, with the non-Pokémon cards grouped by supertype at the end. */
		if (a.isPokemon !== b.isPokemon) return a.isPokemon ? -1 : 1;

		if (!a.isPokemon) {
			const aOrder = SUPERTYPE_ORDER[a.supertype] || 99;
			const bOrder = SUPERTYPE_ORDER[b.supertype] || 99;
			if (aOrder !== bOrder) return aOrder - bOrder;
			return a.card.name.localeCompare(b.card.name);
		}

		if (a.pokemonNumber !== b.pokemonNumber) return (a.pokemonNumber - b.pokemonNumber) * multiplier;
		if (a.releaseDate !== b.releaseDate) return (a.releaseDate - b.releaseDate) * multiplier;
		if (a.cardNumberInt && b.cardNumberInt) return (a.cardNumberInt - b.cardNumberInt) * multiplier;
		return a.cardNumber.localeCompare(b.cardNumber) * multiplier;
	}).map(entry => entry.card);
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
