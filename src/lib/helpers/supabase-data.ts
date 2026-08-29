import type { FullCard, Pokemon, PriceData, Set } from "$lib/types";
import { supabase } from '$lib/supabase';
import { cachedTable, STATIC_TTL, TABLE_TTL } from '$helpers/data-cache';

/** Columns every card read shares; keep it in sync with the `cards` / `jp_cards` schema. */
const CARD_COLUMNS = `
	card_code,
	artist,
	card_market_updated_at,
	card_market_url,
	hp,
	image,
	legal_standard,
	local_id,
	name,
	pokemon_id,
	rarity,
	regulation_mark,
	set_id,
	set_name,
	stage,
	supertype,
	tcgdex_id,
	types,
	variants
`;

/**
 * The columns a card list reads. `getCards` returns every card in the table, so the seven columns nothing
 * renders (`hp`, `legal_standard`, `local_id`, `regulation_mark`, `stage`, `tcgdex_id`, `variants`) are dead
 * weight in a payload the browser has to parse before the grid can paint.
 */
const CARD_LIST_COLUMNS = `
	card_code,
	artist,
	card_market_updated_at,
	card_market_url,
	image,
	name,
	pokemon_id,
	rarity,
	set_id,
	set_name,
	supertype,
	types
`;

interface CardRow {
	card_code: string;
	artist: string | null;
	card_market_updated_at?: string | null;
	card_market_url: string | null;
	hp?: number | null;
	image: string | null;
	legal_standard?: boolean | null;
	local_id?: string | null;
	name: string;
	pokemon_id: number | null;
	rarity: string | null;
	regulation_mark?: string | null;
	set_id: string | null;
	set_name: string | null;
	stage?: string | null;
	supertype: string | null;
	tcgdex_id?: string | null;
	types: string | null;
	variants?: FullCard['variants'];
}

interface PriceRow {
	card_code: string;
	simple: number | null;
	low: number | null;
	trend: number | null;
	avg1: number | null;
	avg7: number | null;
	avg30: number | null;
	reverse_simple: number | null;
	reverse_low: number | null;
	reverse_trend: number | null;
	reverse_avg1: number | null;
	reverse_avg7: number | null;
	reverse_avg30: number | null;
}

interface SetRow {
	name: string;
	logo: string | null;
	printed_total: number | null;
	ptcgo_code: string | null;
	release_date: string | null;
	series: string | null;
	set_id: string | null;
	symbol: string | null;
	total_cards: number | null;
}

function toCard(card: CardRow): FullCard {
	const listCard: FullCard = {
		artist: card.artist || '',
		cardCode: card.card_code,
		cardMarketUpdatedAt: card.card_market_updated_at || '',
		cardMarketUrl: card.card_market_url || '',
		image: card.image || '',
		name: card.name,
		pokemonNumber: card.pokemon_id ?? undefined,
		rarity: card.rarity || '',
		setId: card.set_id || '',
		setName: card.set_name || '',
		supertype: card.supertype || '',
		types: card.types || '',
	};

	// A list read selects `CARD_LIST_COLUMNS`, so the detail-only keys stay off the object instead of shipping 23546 empty values.
	if (!('hp' in card)) return listCard;

	return {
		...listCard,
		hp: card.hp ?? undefined,
		legalStandard: card.legal_standard ?? false,
		localId: card.local_id || '',
		regulationMark: card.regulation_mark || '',
		stage: card.stage || '',
		tcgdexId: card.tcgdex_id || '',
		variants: card.variants ?? null,
	};
}

function toPrice(price: PriceRow): PriceData {
	return {
		simple: price.simple ?? undefined,
		low: price.low ?? undefined,
		trend: price.trend ?? undefined,
		avg1: price.avg1 ?? undefined,
		avg7: price.avg7 ?? undefined,
		avg30: price.avg30 ?? undefined,
		reverseSimple: price.reverse_simple ?? undefined,
		reverseLow: price.reverse_low ?? undefined,
		reverseTrend: price.reverse_trend ?? undefined,
		reverseAvg1: price.reverse_avg1 ?? undefined,
		reverseAvg7: price.reverse_avg7 ?? undefined,
		reverseAvg30: price.reverse_avg30 ?? undefined,
	};
}

function toSet(set: SetRow): Set {
	return {
		name: set.name,
		logo: set.logo || '',
		printedTotal: set.printed_total || 0,
		ptcgoCode: set.ptcgo_code || '',
		releaseDate: set.release_date ? new Date(set.release_date) : new Date('1995-01-01'),
		series: set.series || '',
		setId: set.set_id || '',
		symbol: set.symbol || '',
		totalCards: set.total_cards || 0,
	};
}

/**
 * Fetches a whole table. The card tables exceed Supabase's per-select row cap, so the rows are counted
 * first and every 5000-row page is then requested in parallel.
 *
 * `keyColumn` must hold a unique value: the pages are separate queries, and Postgres only returns them in a
 * repeatable order when the sort is total. Paging `cards` on `name` alone dropped ~1700 rows and duplicated
 * others, because only 4618 of its 23546 rows have a name no other row shares.
 */
async function getAllData<T>(
	tableName: string,
	keyColumn: string,
	selectQuery: string = '*',
	orderBy?: { column: string; ascending: boolean }
): Promise<T[]> {
	const batchSize = 5000;
	let allData: T[] = [];

	const { count, error: countError } = await supabase
		.from(tableName)
		.select('*', { count: 'exact', head: true });

	if (countError) {
		console.error(`Error counting ${tableName}:`, countError);
		throw new Error(`Failed to count ${tableName}: ${countError.message}`);
	}

	const totalCount = count || 0;
	const numberOfBatches = Math.ceil(totalCount / batchSize);

	const batchPromises = Array.from({ length: numberOfBatches }, (_, index) => {
		const from = index * batchSize;

		let query = supabase.from(tableName).select(selectQuery);

		if (orderBy) {
			query = query.order(orderBy.column, { ascending: orderBy.ascending });
		}

		return query.order(keyColumn, { ascending: true }).range(from, from + batchSize - 1);
	});

	const results = await Promise.all(batchPromises);

	for (const { data, error } of results) {
		if (error) {
			console.error(`Error fetching ${tableName}:`, error);
			throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
		}

		if (data && data.length > 0) {
			allData.push(...(data as T[]));
		}
	}

	if (allData.length !== totalCount) {
		console.warn(`${tableName}: paged ${allData.length} rows for a count of ${totalCount}`);
	}

	return allData;
}

export async function getPokemons(): Promise<Pokemon[]> {
	return cachedTable('pokemons', STATIC_TTL, () => getAllData<Pokemon>('pokemons', 'id', '*', { column: 'id', ascending: true }), rows => rows);
}

function cardListRows(table: 'cards' | 'jp_cards'): Promise<CardRow[]> {
	return getAllData<CardRow>(table, 'card_code', CARD_LIST_COLUMNS, { column: 'name', ascending: true });
}

export async function getCards(): Promise<FullCard[]> {
	return cachedTable('cards', TABLE_TTL, () => cardListRows('cards'), rows => rows.map(toCard));
}

/** Sitemap-only read: the codes come off the cached card list instead of paging the table again. */
export async function getCardCodes(): Promise<string[]> {
	const cards = await getCards();
	return cards.map(card => card.cardCode);
}

/** Picks a card without reading the table: one count, then the single row at that offset. */
export async function getRandomCardCode(): Promise<string | null> {
	const { count, error: countError } = await supabase.from('cards').select('*', { count: 'exact', head: true });

	if (countError) {
		console.error('Error counting cards:', countError);
		throw new Error(`Failed to count cards: ${countError.message}`);
	}

	if (!count) return null;

	const offset = Math.floor(Math.random() * count);
	const { data, error } = await supabase
		.from('cards')
		.select('card_code')
		.order('card_code', { ascending: true })
		.range(offset, offset);

	if (error) {
		console.error('Error fetching random card:', error);
		throw new Error(`Failed to fetch random card: ${error.message}`);
	}

	return data?.[0]?.card_code ?? null;
}

export async function getJapaneseCards(): Promise<FullCard[]> {
	return cachedTable('jp_cards', TABLE_TTL, () => cardListRows('jp_cards'), rows => rows.map(toCard));
}

/** `select(count)` with `head: true`: the homepage only prints this number, it has no use for the 12781 rows behind it. */
export async function countJapaneseCards(): Promise<number> {
	return cachedTable('jp_cards:count', TABLE_TTL, async () => {
		const { count, error } = await supabase.from('jp_cards').select('*', { count: 'exact', head: true });
		if (error) throw new Error(`Failed to count jp_cards: ${error.message}`);
		return count ?? 0;
	}, count => count);
}

export async function getPrices(): Promise<Record<string, PriceData>> {
	return cachedTable('prices', TABLE_TTL, () => getAllData<PriceRow>('prices', 'card_code'), pricesByCardCode);
}

/** Japanese cards carry cardmarket pricing too, in their own table. */
export async function getJapanesePrices(): Promise<Record<string, PriceData>> {
	return cachedTable('jp_prices', TABLE_TTL, () => getAllData<PriceRow>('jp_prices', 'card_code'), pricesByCardCode);
}

function pricesByCardCode(rows: PriceRow[]): Record<string, PriceData> {
	const pricesObject: Record<string, PriceData> = {};
	for (const price of rows) {
		pricesObject[price.card_code] = toPrice(price);
	}
	return pricesObject;
}

export async function getSets(): Promise<Set[]> {
	return cachedTable('sets', TABLE_TTL, () => getAllData<SetRow>('sets', 'set_id', '*', { column: 'name', ascending: true }), rows => rows.map(toSet));
}

export async function getJapaneseSets(): Promise<Set[]> {
	return cachedTable('jp_sets', TABLE_TTL, () => getAllData<SetRow>('jp_sets', 'set_id', '*', { column: 'name', ascending: true }), rows => rows.map(toSet));
}

export async function getTypes(): Promise<string[]> {
	return cachedTable('types', STATIC_TTL, () => getAllData<{ name: string }>('types', 'name', 'name', { column: 'name', ascending: true }), rows => rows.map(type => type.name));
}

/** Returns `null` when no card carries this code: a collection row can outlive the card it points at. */
export async function getCardByCode(cardCode: string): Promise<FullCard | null> {
	for (const table of ['cards', 'jp_cards']) {
		const { data, error } = await supabase
			.from(table)
			.select(CARD_COLUMNS)
			.eq('card_code', cardCode)
			.maybeSingle();

		if (error) {
			console.error(`Error fetching card by code from ${table}:`, error);
			throw new Error(`Failed to fetch card: ${error.message}`);
		}

		if (data) return toCard(data as unknown as CardRow);
	}

	return null;
}

export async function getCardPrice(cardCode: string): Promise<PriceData | null> {
	for (const table of ['prices', 'jp_prices']) {
		const { data, error } = await supabase
			.from(table)
			.select('*')
			.eq('card_code', cardCode)
			.maybeSingle();

		if (error) {
			console.error(`Error fetching card price from ${table}:`, error);
			throw new Error(`Failed to fetch card price: ${error.message}`);
		}

		if (data) return toPrice(data as PriceRow);
	}

	return null;
}
