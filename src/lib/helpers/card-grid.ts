import type { FullCard, Pokemon, PriceData, Set } from '$lib/types';
import { getRarityLevel } from '$helpers/rarity';
import { buildSetLookupMap, findSetInLookup } from '$helpers/set-utils';
import { parseCardCode } from '$helpers/card-utils';
import { isVisible, type ActiveFilters } from '$helpers/filters';

/** Set lookups are the hot path of the grid: a per-card `sets.find` rescans and renormalises all 218 sets. */
const setLookupCache = new Map<string, Set | null>();
let cachedSets: Set[] | null = null;
let setLookup = new Map<string, Set>();

export function getCardSet(cardCode: string, sets: Set[]): Set | null {
	if (cachedSets !== sets) {
		setLookupCache.clear();
		setLookup = buildSetLookupMap(sets);
		cachedSets = sets;
	}

	let cardSet = setLookupCache.get(cardCode);
	if (cardSet === undefined) {
		cardSet = findSetInLookup(cardCode, setLookup) ?? null;
		setLookupCache.set(cardCode, cardSet);
	}
	return cardSet;
}

/** Groups Pokémon by dex number and other supertypes by name, keeping only the priciest card of each group. */
export function keepMostExpensivePerGroup(cards: FullCard[], prices: Record<string, PriceData>): FullCard[] {
	const groups = new Map<string, FullCard>();

	for (const card of cards) {
		const groupKey = card.supertype === 'Pokémon' && card.pokemonNumber
			? `pokemon_${card.pokemonNumber}`
			: `${card.supertype.toLowerCase()}_${card.name.toLowerCase()}`;

		const existing = groups.get(groupKey);
		if (!existing || (prices[card.cardCode]?.simple ?? 0) > (prices[existing.cardCode]?.simple ?? 0)) {
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

const SUPERTYPE_ORDER: Record<string, number> = { 'Pokémon': 1, Trainer: 2, Energy: 3 };

/** Sorts a card list, precomputing every sort key once instead of recomputing it inside the comparator. */
export function sortCards(
	cards: FullCard[],
	sortBy: string,
	sortOrder: string,
	prices: Record<string, PriceData>,
	pokemons: Pokemon[],
	sets: Set[],
): FullCard[] {
	const pokemonMap = new Map(pokemons.map(pokemon => [pokemon.id, pokemon]));
	const sortValues = new Map<string, SortValues>();

	for (const card of cards) {
		const pokemon = pokemonMap.get(card.pokemonNumber ?? 0);
		const cardNumber = parseCardCode(card.cardCode).cardNumber || '';
		const cardNumberInt = parseInt(cardNumber);

		sortValues.set(card.cardCode, {
			artist: card.artist || '',
			cardNumber,
			cardNumberInt: isNaN(cardNumberInt) ? 0 : cardNumberInt,
			isPokemon: card.supertype === 'Pokémon' && card.pokemonNumber != null,
			name: pokemon?.name ?? card.name,
			pokemonNumber: card.pokemonNumber ?? 0,
			price: prices[card.cardCode]?.simple ?? 0,
			rarityLevel: getRarityLevel(card.rarity),
			releaseDate: getCardSet(card.cardCode, sets)?.releaseDate?.getTime() ?? 0,
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

		// Default sort is by Pokédex number, with non-Pokémon cards grouped by supertype at the end.
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

/** Keeps the cards `filters` lets through. Runs before the sort, so everything downstream works on the smaller list. */
export function filterCards(cards: FullCard[], sets: Set[], selectedSet: Set | null, filters: ActiveFilters): FullCard[] {
	return cards.filter(card => {
		const cardSet = getCardSet(card.cardCode, sets) ?? {
			logo: card.image?.replace(/\/[^\/]*$/, '/logo.png') ?? '',
			name: card.setName,
			printedTotal: 0,
			releaseDate: new Date(),
		};
		return isVisible(card, cardSet, selectedSet, filters);
	});
}

/** Stable reorder: Pokémon, then Trainer, then Energy, keeping the incoming order within a supertype. */
export function sortBySupertype(cards: FullCard[]): FullCard[] {
	return [...cards].sort((a, b) => (SUPERTYPE_ORDER[a.supertype] || 99) - (SUPERTYPE_ORDER[b.supertype] || 99));
}

/** Distinct rarities of a card list. Reading them from Postgres meant a full scan of `cards` for ~30 values. */
export function distinctRarities(cards: FullCard[]): string[] {
	return [...new Set(cards.map(card => card.rarity).filter(Boolean))].sort();
}

/** Distinct artists of a card list, sorted case-insensitively like the filter dropdown expects. */
export function distinctArtists(cards: FullCard[]): string[] {
	return [...new Set(cards.map(card => card.artist).filter(Boolean))]
		.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}
