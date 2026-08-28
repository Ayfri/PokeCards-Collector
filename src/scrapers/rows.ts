import {UNKNOWN_POKEMON, type MappedCard, type MappedPrice, type MappedSet} from './tcgdex/mappers';

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

export function cardRow(card: MappedCard): Record<string, unknown> {
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
		supertype: card.supertype || null,
		tcgdex_id: card.tcgdexId,
		types: card.types || null,
		variants: card.variants,
	};
}

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
