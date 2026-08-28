import {generateUniqueCardCode} from '$lib/helpers/card-utils';
import type {TcgdexCard, TcgdexPricing, TcgdexSet} from './types';
import setAliases from '$lib/data/set-aliases.json' with {type: 'json'};
import cardCodeOverrides from './card-code-overrides.json' with {type: 'json'};

export type Language = keyof typeof setAliases;

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
	simple?: number;
	low?: number;
	trend?: number;
	avg1?: number;
	avg7?: number;
	avg30?: number;
	reverseSimple?: number;
	reverseLow?: number;
	reverseTrend?: number;
	reverseAvg1?: number;
	reverseAvg7?: number;
	reverseAvg30?: number;
}

/** Pokemon cards whose species TCGdex does not know keep the legacy 99999 sentinel; non-Pokemon cards use 0. */
const UNKNOWN_POKEMON = 99999;

const reverseAliases: Record<Language, Map<string, string>> = {
	en: buildReverse('en'),
	ja: buildReverse('ja'),
};

function buildReverse(lang: Language): Map<string, string> {
	const map = new Map<string, string>();
	for (const [legacy, tcgdexId] of Object.entries(setAliases[lang])) map.set(tcgdexId, legacy);
	return map;
}

/** The set code baked into `card_code`: the legacy pokemontcg.io / tcgcollector code when the set existed before, else the TCGdex id. */
export function legacySetCode(lang: Language, tcgdexSetId: string): string {
	return reverseAliases[lang].get(tcgdexSetId) ?? tcgdexSetId;
}

export function buildCardCode(lang: Language, card: TcgdexCard): string {
	const override = (cardCodeOverrides[lang] as Record<string, string>)[card.id];
	if (override) return override;

	const isPokemon = card.category === 'Pokemon';
	const pokemonNumber = card.dexId?.[0] ?? (isPokemon ? UNKNOWN_POKEMON : 0);
	return generateUniqueCardCode(pokemonNumber, legacySetCode(lang, card.set?.id ?? ''), card.localId, card.category ?? 'Pokemon');
}

/** The DB and the filter UI expect the accented `Pokémon`, TCGdex says `Pokemon`. */
export function toSupertype(category: string | undefined): string {
	return category === 'Pokemon' ? 'Pokémon' : (category ?? 'Pokémon');
}

export function mapCard(lang: Language, card: TcgdexCard): MappedCard {
	const isPokemon = card.category === 'Pokemon';
	const cardmarket = card.pricing?.cardmarket;
	return {
		artist: card.illustrator ?? 'Unknown',
		cardCode: buildCardCode(lang, card),
		cardMarketUpdatedAt: cardmarket?.updated ?? '',
		cardMarketUrl: cardMarketUrl(cardmarket?.idProduct),
		hp: card.hp ?? null,
		image: card.image ?? '',
		legalStandard: card.legal?.standard ?? false,
		localId: card.localId,
		name: card.name,
		pokemonNumber: card.dexId?.[0] ?? (isPokemon ? UNKNOWN_POKEMON : undefined),
		rarity: card.rarity ?? 'Common',
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

/** Cardmarket single-product deep link, built from the only identifier TCGdex exposes. */
export function cardMarketUrl(idProduct: number | undefined): string {
	return idProduct ? `https://www.cardmarket.com/en/Pokemon/Products/Singles?idProduct=${idProduct}` : '';
}

export function mapSet(set: TcgdexSet): MappedSet {
	return {
		logo: set.logo ? `${set.logo}.png` : '',
		name: set.name,
		printedTotal: set.cardCount?.official ?? 0,
		ptcgoCode: set.abbreviation?.official ?? '',
		releaseDate: set.releaseDate ?? '',
		series: set.serie?.name ?? '',
		setId: set.id,
		symbol: set.symbol ? `${set.symbol}.png` : '',
		totalCards: set.cardCount?.total ?? 0,
	};
}

/** `PriceData` maps 1:1 onto the cardmarket block; the `-holo` suffixed fields are the reverse-holo prices. */
export function mapPrice(pricing: TcgdexPricing | null | undefined): MappedPrice | null {
	const cardmarket = pricing?.cardmarket;
	if (!cardmarket) return null;
	return {
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
}
