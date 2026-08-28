import type { FullCard, Pokemon, PriceData, Set } from "$lib/types";
import { supabase } from '$lib/supabase';

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

interface CardRow {
	card_code: string;
	artist: string | null;
	card_market_updated_at: string | null;
	card_market_url: string | null;
	hp: number | null;
	image: string | null;
	legal_standard: boolean | null;
	local_id: string | null;
	name: string;
	pokemon_id: number | null;
	rarity: string | null;
	regulation_mark: string | null;
	set_id: string | null;
	set_name: string | null;
	stage: string | null;
	supertype: string | null;
	tcgdex_id: string | null;
	types: string | null;
	variants: FullCard['variants'];
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
	return {
		artist: card.artist || '',
		cardCode: card.card_code,
		cardMarketUpdatedAt: card.card_market_updated_at || '',
		cardMarketUrl: card.card_market_url || '',
		hp: card.hp ?? undefined,
		image: card.image || '',
		legalStandard: card.legal_standard ?? false,
		localId: card.local_id || '',
		name: card.name,
		pokemonNumber: card.pokemon_id ?? undefined,
		rarity: card.rarity || '',
		regulationMark: card.regulation_mark || '',
		setId: card.set_id || '',
		setName: card.set_name || '',
		stage: card.stage || '',
		supertype: card.supertype || '',
		tcgdexId: card.tcgdex_id || '',
		types: card.types || '',
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
	return await getAllData<Pokemon>('pokemons', 'id', '*', { column: 'id', ascending: true });
}

export async function getCards(): Promise<FullCard[]> {
	const data = await getAllData<CardRow>('cards', 'card_code', CARD_COLUMNS, { column: 'name', ascending: true });
	return data.map(toCard);
}

export async function getJapaneseCards(): Promise<FullCard[]> {
	const data = await getAllData<CardRow>('jp_cards', 'card_code', CARD_COLUMNS, { column: 'name', ascending: true });
	return data.map(toCard);
}

export async function getPrices(): Promise<Record<string, PriceData>> {
	return pricesByCardCode(await getAllData<PriceRow>('prices', 'card_code'));
}

/** Japanese cards carry cardmarket pricing too, in their own table. */
export async function getJapanesePrices(): Promise<Record<string, PriceData>> {
	return pricesByCardCode(await getAllData<PriceRow>('jp_prices', 'card_code'));
}

function pricesByCardCode(rows: PriceRow[]): Record<string, PriceData> {
	const pricesObject: Record<string, PriceData> = {};
	for (const price of rows) {
		pricesObject[price.card_code] = toPrice(price);
	}
	return pricesObject;
}

export async function getSets(): Promise<Set[]> {
	const data = await getAllData<SetRow>('sets', 'set_id', '*', { column: 'name', ascending: true });
	return data.map(toSet);
}

export async function getJapaneseSets(): Promise<Set[]> {
	const data = await getAllData<SetRow>('jp_sets', 'set_id', '*', { column: 'name', ascending: true });
	return data.map(toSet);
}

export async function getTypes(): Promise<string[]> {
	const data = await getAllData<{ name: string }>('types', 'name', 'name', { column: 'name', ascending: true });
	return data.map(type => type.name);
}

export async function getRarities(): Promise<string[]> {
	const { data, error } = await supabase
		.from('cards')
		.select('rarity')
		.not('rarity', 'is', null)
		.limit(50_000);

	if (error) {
		console.error('Error fetching rarities:', error);
		throw new Error(`Failed to fetch rarities: ${error.message}`);
	}

	// A full page back means there are probably more rows than the cap; page through the table instead.
	if (data && data.length === 50_000) {
		const allData = await getAllData<{ rarity: string }>('cards', 'card_code', 'rarity');
		const rarities = [...new Set(allData.map(card => card.rarity).filter(Boolean))];
		return rarities.sort();
	}

	const rarities = [...new Set((data || []).map(card => card.rarity))];
	return rarities.sort();
}

export async function getArtists(): Promise<string[]> {
	const { data, error } = await supabase
		.from('cards')
		.select('artist')
		.not('artist', 'is', null)
		.limit(50_000);

	if (error) {
		console.error('Error fetching artists:', error);
		throw new Error(`Failed to fetch artists: ${error.message}`);
	}

	if (data && data.length === 50_000) {
		const allData = await getAllData<{ artist: string }>('cards', 'card_code', 'artist');
		const artists = [...new Set(allData.map(card => card.artist).filter(Boolean))];
		return artists.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
	}

	const artists = [...new Set((data || []).map(card => card.artist))];
	return artists.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

export async function getCardsWithFilters(filters: {
	setName?: string;
	pokemon?: string;
	rarity?: string;
	type?: string;
	artist?: string;
	supertype?: string;
}): Promise<FullCard[]> {
	let query = supabase.from('cards').select(CARD_COLUMNS);

	if (filters.setName) {
		query = query.eq('set_name', filters.setName);
	}
	if (filters.rarity) {
		query = query.eq('rarity', filters.rarity);
	}
	if (filters.artist) {
		query = query.eq('artist', filters.artist);
	}
	if (filters.supertype) {
		query = query.eq('supertype', filters.supertype);
	}
	if (filters.type) {
		query = query.ilike('types', `%${filters.type}%`);
	}
	if (filters.pokemon) {
		query = query.ilike('name', `%${filters.pokemon}%`);
	}

	query = query.order('name', { ascending: true });

	const { data, error } = await query;

	if (error) {
		console.error('Error fetching filtered cards:', error);
		throw new Error(`Failed to fetch filtered cards: ${error.message}`);
	}

	return ((data ?? []) as unknown as CardRow[]).map(toCard);
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
