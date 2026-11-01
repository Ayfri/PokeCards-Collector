import {UNKNOWN_POKEMON, type Language, type MappedCard, type MappedPrice, type MappedSet} from './tcgdex/mappers';

/** Row shapes shared by the CLI uploader and the scheduled Worker, so both write identical columns. */

export function setRow(set: MappedSet): Record<string, unknown> {
	return {
		logo: set.logo || null,
		name: set.name,
		printed_total: set.printedTotal || null,
		ptcgo_code: set.ptcgoCode || null,
		release_date: set.releaseDate || null,
		series: set.series || null,
		set_id: set.setId,
		symbol: set.symbol || null,
		total_cards: set.totalCards || null,
	};
}

/** The twin columns exist on `jp_cards` only: `cards` and `fr_cards` have no such column, so writing them there would fail the upsert. */
export function cardRow(card: MappedCard, lang: Language): Record<string, unknown> {
	return {
		artist: card.artist || null,
		card_code: card.cardCode,
		card_market_updated_at: card.cardMarketUpdatedAt || null,
		card_market_url: card.cardMarketUrl || null,
		hp: card.hp,
		image: card.image || null,
		legal_standard: card.legalStandard,
		local_id: card.localId || null,
		name: card.name,
		pokemon_id: Number.isInteger(card.pokemonNumber) && card.pokemonNumber !== UNKNOWN_POKEMON ? card.pokemonNumber : null,
		rarity: card.rarity || null,
		regulation_mark: card.regulationMark || null,
		set_id: card.setId || null,
		set_name: card.setName || null,
		stage: card.stage || null,
		subtype: card.subtype || null,
		supertype: card.supertype || null,
		tcgdex_id: card.tcgdexId,
		...(lang === 'ja' && {twin_method: card.twinMethod || null, twin_tcgdex_id: card.twinTcgdexId || null}),
		types: card.types || null,
		variants: card.variants,
	};
}

/**
 * The fallback artwork columns, written by the CLI uploader only and left out of `cardRow`: the Worker's rows omit them, so the upsert keeps what
 * the CLI stored. The CLI owns them because the reprint search needs the whole catalogue of a language, which a Worker batch of 4 sets never holds.
 */
export const artRow = (card: MappedCard): Record<string, unknown> => ({art_image: card.artImage || null, art_source: card.artSource || null});

export function priceRow(cardCode: string, price: MappedPrice): Record<string, unknown> {
	return {
		avg1: price.avg1 ?? null,
		avg7: price.avg7 ?? null,
		avg30: price.avg30 ?? null,
		card_code: cardCode,
		low: price.low ?? null,
		reverse_avg1: price.reverseAvg1 ?? null,
		reverse_avg7: price.reverseAvg7 ?? null,
		reverse_avg30: price.reverseAvg30 ?? null,
		reverse_low: price.reverseLow ?? null,
		reverse_simple: price.reverseSimple ?? null,
		reverse_trend: price.reverseTrend ?? null,
		simple: price.simple ?? null,
		trend: price.trend ?? null,
	};
}
