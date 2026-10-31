import type { FullCard, Pokemon, PriceData, Set } from "#lib/types.js";
import { supabase } from '#lib/supabase.ts';
import { cachedTable, PartialRows, STATIC_TTL, TABLE_TTL } from '#helpers/data-cache.ts';
import { CATALOGUES, type CardTable, type Language, type PriceTable, type SetTable } from '#helpers/catalogues.ts';
import type { CatalogueData } from '#helpers/owned-cards.ts';

/** Every card column, for the reads that need the details. Keep it in sync with the `cards` / `jp_cards` / `fr_cards` schema. */
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
 * The columns a card list reads. `getCards` returns every card in the table, and nothing renders six of the columns
 * (`hp`, `legal_standard`, `regulation_mark`, `stage`, `tcgdex_id`, `variants`), so they would only slow down the
 * payload the browser parses before the grid can paint.
 */
const CARD_LIST_COLUMNS = `
	card_code,
	artist,
	card_market_updated_at,
	card_market_url,
	image,
	local_id,
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
		localId: card.local_id || '',
		name: card.name,
		pokemonNumber: card.pokemon_id ?? undefined,
		rarity: card.rarity || '',
		setId: card.set_id || '',
		setName: card.set_name || '',
		supertype: card.supertype || '',
		types: card.types || '',
	};

	/** A list read selects `CARD_LIST_COLUMNS`, so the detail-only keys stay off the object instead of adding 23546 empty values. */
	if (!('hp' in card)) return listCard;

	return {
		...listCard,
		hp: card.hp ?? undefined,
		legalStandard: card.legal_standard ?? false,
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

interface QueryResult {
	error: { message: string } | null;
}

const READ_ATTEMPTS = 3;

/**
 * Runs a Supabase read until it succeeds, up to `READ_ATTEMPTS` times with a linear backoff.
 *
 * Paging a card table fires ~5 subrequests at once, and one of them occasionally dies with
 * `Error: Network connection lost.`, a Workers-side transient that works on the next try.
 * Without the retry, that single dropped batch would reach the page as a 500.
 */
async function readWithRetry<T extends QueryResult>(label: string, run: () => PromiseLike<T>): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		try {
			const result = await run();
			if (!result.error) return result;
			if (attempt === READ_ATTEMPTS) throw new Error(`Failed to ${label}: ${result.error.message}`);
			console.warn(`Retrying ${label} after error (attempt ${attempt}):`, result.error.message);
		} catch (cause) {
			if (attempt === READ_ATTEMPTS) throw cause;
			console.warn(`Retrying ${label} after throw (attempt ${attempt}):`, cause);
		}

		await new Promise(resolve => setTimeout(resolve, 100 * attempt));
	}
}

/**
 * Fetches a whole table. The card tables exceed Supabase's per-select row cap, so the rows are counted
 * first and every 5000-row page is then requested in parallel.
 *
 * `keyColumn` must hold a unique value: the pages are separate queries, and Postgres only returns them in a
 * repeatable order when the sort is total. Paging `cards` on `name` alone drops ~1700 rows and duplicates
 * others, because only 4618 of its 23546 rows have a name no other row shares.
 *
 * A paged row count that differs from the exact count means the table moved between the queries (the daily sync
 * rewrites it), so the whole read is retried. Past the last attempt the short result is thrown as `PartialRows`:
 * `cachedTable` serves it once without storing it, instead of pinning it for the TTL.
 */
async function getAllData<T>(
	tableName: CardTable | PriceTable | SetTable | 'pokemons' | 'types',
	keyColumn: string,
	selectQuery: string = '*',
	orderBy?: { column: string; ascending: boolean }
): Promise<T[]> {
	for (let attempt = 1; ; attempt++) {
		const { count, rows } = await pageTable<T>(tableName, keyColumn, selectQuery, orderBy);
		if (rows.length === count) return rows;

		console.warn(`${tableName}: paged ${rows.length} rows for a count of ${count} (attempt ${attempt})`);
		if (attempt === READ_ATTEMPTS) throw new PartialRows(rows);

		await new Promise(resolve => setTimeout(resolve, 500 * attempt));
	}
}

async function pageTable<T>(
	tableName: CardTable | PriceTable | SetTable | 'pokemons' | 'types',
	keyColumn: string,
	selectQuery: string,
	orderBy?: { column: string; ascending: boolean }
): Promise<{ count: number; rows: T[] }> {
	const batchSize = 5000;
	const allData: T[] = [];

	const { count } = await readWithRetry(`count ${tableName}`, () => supabase
		.from(tableName)
		.select('*', { count: 'exact', head: true }));

	const totalCount = count || 0;
	const numberOfBatches = Math.ceil(totalCount / batchSize);

	const batchPromises = Array.from({ length: numberOfBatches }, (_, index) => {
		const from = index * batchSize;

		return readWithRetry(`fetch ${tableName} rows ${from}-${from + batchSize - 1}`, () => {
			let query = supabase.from(tableName).select(selectQuery);

			if (orderBy) {
				query = query.order(orderBy.column, { ascending: orderBy.ascending });
			}

			return query.order(keyColumn, { ascending: true }).range(from, from + batchSize - 1);
		});
	});

	const results = await Promise.all(batchPromises);

	for (const { data } of results) {
		if (data && data.length > 0) {
			allData.push(...(data as T[]));
		}
	}

	return { count: totalCount, rows: allData };
}

export async function getPokemons(): Promise<Pokemon[]> {
	return cachedTable('pokemons', STATIC_TTL, () => getAllData<Pokemon>('pokemons', 'id', '*', { column: 'id', ascending: true }), rows => rows);
}

function cardListRows(table: CardTable): Promise<CardRow[]> {
	return getAllData<CardRow>(table, 'card_code', CARD_LIST_COLUMNS, { column: 'name', ascending: true });
}

export async function getCards(language: Language = 'en'): Promise<FullCard[]> {
	const { cards } = CATALOGUES[language].tables;
	return cachedTable(cards, TABLE_TTL, () => cardListRows(cards), rows => rows.map(toCard));
}

/** Picks a card without reading the table: one count, then the single row at that offset. */
export async function getRandomCardCode(): Promise<string | null> {
	const { count } = await readWithRetry('count cards', () => supabase.from('cards').select('*', { count: 'exact', head: true }));

	if (!count) return null;

	const offset = Math.floor(Math.random() * count);
	const { data } = await readWithRetry('fetch random card', () => supabase
		.from('cards')
		.select('card_code')
		.order('card_code', { ascending: true })
		.range(offset, offset));

	return data?.[0]?.card_code ?? null;
}

/** One card with every column, for its own page: the catalogue reads leave out `hp`, `stage`, `variants` and the like. */
export async function getCardDetails(language: Language, cardCode: string): Promise<FullCard | null> {
	const { cards } = CATALOGUES[language].tables;
	const { data } = await readWithRetry(`fetch ${cards} ${cardCode}`, () => supabase.from(cards).select(CARD_COLUMNS).eq('card_code', cardCode).maybeSingle<CardRow>());
	return data ? toCard(data) : null;
}

/** `select(count)` with `head: true`: the homepage only prints this number, it has no use for the 12781 rows behind it. */
export async function countCards(language: Language): Promise<number> {
	const { cards } = CATALOGUES[language].tables;
	return cachedTable(`${cards}:count`, TABLE_TTL, async () => {
		const { count, error } = await supabase.from(cards).select('*', { count: 'exact', head: true });
		if (error) throw new Error(`Failed to count ${cards}: ${error.message}`);
		return count ?? 0;
	}, count => count);
}

export async function getPrices(language: Language = 'en'): Promise<Record<string, PriceData>> {
	const { prices } = CATALOGUES[language].tables;
	return cachedTable(prices, TABLE_TTL, () => getAllData<PriceRow>(prices, 'card_code'), pricesByCardCode);
}

function pricesByCardCode(rows: PriceRow[]): Record<string, PriceData> {
	const pricesObject: Record<string, PriceData> = {};
	for (const price of rows) {
		pricesObject[price.card_code] = toPrice(price);
	}
	return pricesObject;
}

export async function getSets(language: Language = 'en'): Promise<Set[]> {
	const { sets } = CATALOGUES[language].tables;
	return cachedTable(sets, TABLE_TTL, () => getAllData<SetRow>(sets, 'set_id', '*', { column: 'name', ascending: true }), rows => rows.map(toSet));
}

/** The three reads of one language, memoized like each of them. */
export async function getCatalogue(language: Language): Promise<CatalogueData> {
	const [cards, prices, sets] = await Promise.all([getCards(language), getPrices(language), getSets(language)]);
	return { cards, prices, sets };
}

export async function getTypes(): Promise<string[]> {
	return cachedTable('types', STATIC_TTL, () => getAllData<{ name: string }>('types', 'name', 'name', { column: 'name', ascending: true }), rows => rows.map(type => type.name));
}

