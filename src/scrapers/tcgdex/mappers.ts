import {generateUniqueCardCode} from '$lib/helpers/card-utils';
import type {Language} from '$lib/helpers/catalogues';
import {toEnglish} from './french';
import type {TcgdexCard, TcgdexPricing, TcgdexSet} from './types';
import setAliases from './set-aliases.json' with {type: 'json'};
import cardCodeOverrides from './card-code-overrides.json' with {type: 'json'};
import pokedex from '../../assets/pokemons-full.json' with {type: 'json'};

export type {Language} from '$lib/helpers/catalogues';

export interface MappedCard {
	artist: string;
	cardCode: string;
	cardMarketUpdatedAt: string;
	cardMarketUrl: string;
	hp: number | null;
	image: string;
	legalStandard: boolean;
	localId: string;
	name: string;
	pokemonNumber?: number;
	rarity: string;
	regulationMark: string;
	setId: string;
	setName: string;
	stage: string;
	supertype: string;
	tcgdexId: string;
	types: string;
	variants: TcgdexCard['variants'] | null;
}

export interface MappedSet {
	logo: string;
	name: string;
	printedTotal: number;
	ptcgoCode: string;
	releaseDate: string;
	series: string;
	setId: string;
	symbol: string;
	totalCards: number;
}

export interface MappedPrice {
	simple?: number | null;
	low?: number | null;
	trend?: number | null;
	avg1?: number | null;
	avg7?: number | null;
	avg30?: number | null;
	reverseSimple?: number | null;
	reverseLow?: number | null;
	reverseTrend?: number | null;
	reverseAvg1?: number | null;
	reverseAvg7?: number | null;
	reverseAvg30?: number | null;
}

/** Pokémon cards with an unknown species carry 99999 in their code. The `pokemons` table has no such row, so `pokemon_id` stores null. */
export const UNKNOWN_POKEMON = 99999;

/** `set-aliases.json` maps the set part of a card code to the TCGdex set id when they differ (`sv3` for `sv03`). This is the reverse map. */
const codeSetOf: Partial<Record<Language, Map<string, string>>> = Object.fromEntries(
	Object.entries(setAliases).map(([lang, aliases]) => [lang, new Map(Object.entries(aliases).map(([code, setId]) => [setId, code]))]),
);

/** TCGdex gives a few delta species a fractional dex id (Rayquaza delta is `384.1`), which is still that species, so it is truncated. */
function dexId(card: TcgdexCard): number | undefined {
	const dex = card.dexId?.[0];
	return dex === undefined ? undefined : Math.trunc(dex);
}

const SPECIES = new Map(pokedex.map(pokemon => [pokemon.name.replaceAll('-', ' '), pokemon.id]));

/** Species named in an English card name, in reading order: "Cynthia's Garchomp ex" gives [445], "Greninja & Zoroark GX" gives [658, 571]. */
export function speciesInName(name: string): number[] {
	const words = name.toLowerCase().replaceAll('♀', ' f').replaceAll('♂', ' m').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’.:]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
	const found: number[] = [];
	for (let index = 0; index < words.length; index++) {
		const pair = SPECIES.get(`${words[index]} ${words[index + 1]}`);
		if (pair) {
			found.push(pair);
			index++;
			continue;
		}
		const single = SPECIES.get(words[index]);
		if (single) found.push(single);
	}
	return found;
}

const overrideCode = (lang: Language, tcgdexId: string): string | undefined => (cardCodeOverrides as Partial<Record<Language, Record<string, string>>>)[lang]?.[tcgdexId];

/** A card's code never changes on its own. TCGdex adding a dex id would change the built code, so the stored code wins and only an override moves a card. */
export const resolveCardCode = (lang: Language, tcgdexId: string, stored: string | undefined, built: string): string => overrideCode(lang, tcgdexId) ?? stored ?? built;

/**
 * TCGdex's dex id is trusted unless the English name names other species (it files the Tapu promos one species off
 * and swsh8-1 Caterpie as Celebi). With no dex id, the one in the card's override code is used.
 */
function pokemonNumber(lang: Language, card: TcgdexCard): number | undefined {
	if (card.category !== 'Pokemon') return undefined;
	const dex = card.dexId?.map(Math.trunc) ?? [];
	const named = lang === 'en' ? speciesInName(card.name) : [];
	if (named.length && !named.some(id => dex.includes(id))) return named[0];
	if (dex.length) return dex[0];
	/** A French card has the same TCGdex id as the English one, so the English override gives the species. */
	const fromCode = Number(overrideCode(lang === 'fr' ? 'en' : lang, card.id)?.split('_')[1]);
	return fromCode > 0 ? fromCode : UNKNOWN_POKEMON;
}

/** Needs a card with English enumerations (see `mapCard`). */
export function buildCardCode(lang: Language, card: TcgdexCard): string {
	const override = overrideCode(lang, card.id);
	if (override) return override;

	const setId = card.set?.id ?? '';
	/** The `fr` prefix stops a French code from colliding with an English or Japanese set part. */
	if (lang === 'fr') return generateUniqueCardCode(pokemonNumber(lang, card) ?? 0, `fr${setId}`, card.localId, card.category ?? 'Pokemon');
	const species = dexId(card) ?? (card.category === 'Pokemon' ? UNKNOWN_POKEMON : 0);
	return generateUniqueCardCode(species, codeSetOf[lang]?.get(setId) ?? setId, card.localId, card.category ?? 'Pokemon');
}

/** The DB and the filter UI use the accented `Pokémon`, while TCGdex says `Pokemon`. */
export function toSupertype(category: string | undefined): string {
	return category === 'Pokemon' ? 'Pokémon' : (category ?? 'Pokémon');
}

export function mapCard(lang: Language, source: TcgdexCard): MappedCard {
	const card = lang === 'fr' ? toEnglish(source) : source;
	const cardmarket = card.pricing?.cardmarket;
	return {
		artist: card.illustrator ?? 'Unknown',
		cardCode: buildCardCode(lang, card),
		cardMarketUpdatedAt: cardmarket?.updated ?? '',
		cardMarketUrl: cardMarketUrl(cardmarket?.idProduct),
		hp: card.hp ?? null,
		image: card.image ?? '',
		legalStandard: card.legal?.standard ?? false,
		/** TCGdex stores the number of the "?" Unown URL-encoded, as %3F. */
		localId: /%[0-9A-F]{2}/i.test(card.localId) ? decodeURIComponent(card.localId) : card.localId,
		name: card.name,
		pokemonNumber: pokemonNumber(lang, card),
		/** TCGdex spells some tiers "Illustration rare" next to "Ultra Rare", so every word is capitalized to get one spelling. */
		rarity: (card.rarity ?? 'Common').replace(/\b[a-z]/g, letter => letter.toUpperCase()),
		regulationMark: card.regulationMark ?? '',
		setId: card.set?.id ?? '',
		setName: card.set?.name ?? '',
		stage: card.stage ?? '',
		supertype: toSupertype(card.category),
		tcgdexId: card.id,
		types: card.types?.join(', ') ?? '',
		variants: card.variants ?? null,
	};
}

/** Cardmarket link to a single product, built from `idProduct`, the only identifier TCGdex exposes. */
export function cardMarketUrl(idProduct: number | undefined): string {
	return idProduct ? `https://www.cardmarket.com/en/Pokemon/Products/Singles?idProduct=${idProduct}` : '';
}

/** Needs a set from `withProbedAssets`, whose logo and symbol are already full URLs of files that exist. */
export function mapSet(set: TcgdexSet): MappedSet {
	return {
		logo: set.logo ?? '',
		name: set.name,
		printedTotal: set.cardCount?.official ?? 0,
		ptcgoCode: set.abbreviation?.official ?? '',
		releaseDate: set.releaseDate ?? '',
		series: set.serie?.name ?? '',
		setId: set.id,
		symbol: set.symbol ?? '',
		totalCards: set.cardCount?.total ?? 0,
	};
}

/** `PriceData` maps 1:1 onto the Cardmarket block. The fields with a `-holo` suffix are the reverse-holo prices. */
export function mapPrice(pricing: TcgdexPricing | null | undefined): MappedPrice | null {
	const cardmarket = pricing?.cardmarket;
	if (!cardmarket) return null;
	const price: MappedPrice = {
		simple: cardmarket.avg,
		low: cardmarket.low,
		trend: cardmarket.trend,
		avg1: cardmarket.avg1,
		avg7: cardmarket.avg7,
		avg30: cardmarket.avg30,
		reverseSimple: cardmarket['avg-holo'],
		reverseLow: cardmarket['low-holo'],
		reverseTrend: cardmarket['trend-holo'],
		reverseAvg1: cardmarket['avg1-holo'],
		reverseAvg7: cardmarket['avg7-holo'],
		reverseAvg30: cardmarket['avg30-holo'],
	};
	/** 37 Cardmarket blocks have no figure at all and would be stored as a row of nulls, so they count as no price. */
	return Object.values(price).some(value => value != null) ? price : null;
}

interface ProductCard {
	cardCode: string;
	cardMarketUrl: string;
	name: string;
}

/**
 * Card codes whose Cardmarket product TCGdex also gives to a differently named card: ex2-94 Aerodactyl ex and ex4-94
 * Suicune ex share one, so one of them shows the other's price and neither can be trusted. Groups with the same name
 * are kept: they are prints of one card that Cardmarket may well sell as a single product.
 */
export function sharedProductCodes(cards: Iterable<ProductCard>): Set<string> {
	const byProduct = new Map<string, ProductCard[]>();
	for (const card of cards) if (card.cardMarketUrl) (byProduct.get(card.cardMarketUrl) ?? byProduct.set(card.cardMarketUrl, []).get(card.cardMarketUrl)!).push(card);
	const codes = new Set<string>();
	for (const group of byProduct.values()) if (new Set(group.map(card => card.name)).size > 1) for (const card of group) codes.add(card.cardCode);
	return codes;
}
