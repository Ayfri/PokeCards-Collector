import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {CATALOGUES} from '#helpers/catalogues.ts';
import {cardRow, priceRow, setRow} from './rows';
import {fileUnderListingSets, imageFallbacks, mapAll, withProbedAssets, type TcgdexClient} from './tcgdex/client';
import {catalogueSets, excludedSetIds} from './tcgdex/excluded';
import {mapCard, mapPrice, mapSet, resolveCardCode, sharedProductCodes, type Language} from './tcgdex/mappers';
import type {TcgdexCard, TcgdexSet} from './tcgdex/types';

/** Workers-safe half of the scraper: no `node:fs` and no staged JSON, it maps TCGdex straight into Supabase. */

export function createSyncClient(url: string, secretKey: string): SupabaseClient {
	if (!url || !secretKey) throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
	return createClient(url, secretKey, {auth: {persistSession: false}});
}

/** The CLI's client, configured from `.env`. */
export const envClient = () => createSyncClient(process.env.PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SECRET_KEY ?? '');

/** Reads a whole table in pages, because Supabase caps a select at 1000 rows. `orderBy` must be unique, or pages overlap and skip rows. */
export async function readAll<T>(supabase: SupabaseClient, table: string, columns: string, orderBy: string): Promise<T[]> {
	const rows: T[] = [];
	for (let from = 0; ; from += 1000) {
		const {data, error} = await supabase.from(table).select(columns).order(orderBy).range(from, from + 999);
		if (error) throw new Error(`Error reading ${table}: ${error.message}`);
		rows.push(...(data as T[]));
		if (data.length < 1000) return rows;
	}
}

/** Card codes users own. The binder lives in localStorage, so only the collections and wishlists tables hold owned cards. */
export async function ownedCardCodes(supabase: SupabaseClient): Promise<Set<string>> {
	const tables = await Promise.all(['collections', 'wishlists'].map(table => readAll<{id: string; card_code: string}>(supabase, table, 'id,card_code', 'id')));
	return new Set(tables.flat().map(row => row.card_code));
}

/** Upserts in batches, because Supabase rejects a single statement with tens of thousands of rows. */
export async function upsertRows(supabase: SupabaseClient, table: string, rows: Record<string, unknown>[], onConflict: string, batchSize = 500): Promise<number> {
	for (let index = 0; index < rows.length; index += batchSize) {
		const {error} = await supabase.from(table).upsert(rows.slice(index, index + batchSize), {onConflict});
		if (error) throw new Error(`Error upserting ${table} at ${index}: ${error.message}`);
	}
	return rows.length;
}

/** Deletes the rows whose `column` is in `values` and returns how many went. Chunks keep the PostgREST query string short. */
export async function deleteIn(supabase: SupabaseClient, table: string, column: string, values: readonly string[], chunkSize = 200): Promise<number> {
	let deleted = 0;
	for (let index = 0; index < values.length; index += chunkSize) {
		const {count, error} = await supabase.from(table).delete({count: 'exact'}).in(column, values.slice(index, index + chunkSize));
		if (error) throw new Error(`Error deleting from ${table} at ${index}: ${error.message}`);
		deleted += count ?? 0;
	}
	return deleted;
}

/**
 * Keeps the first row for each `key`, because an upsert fails when one statement carries the same key twice, and warns about every row it drops:
 * a silent drop once lost four real cards whose codes collided. Card rows carry `tcgdex_id`, which names the two cards in the warning.
 */
export function deduplicate(rows: Record<string, unknown>[], key: string): Record<string, unknown>[] {
	const byKey = new Map<unknown, Record<string, unknown>>();
	for (const row of rows) {
		const kept = byKey.get(row[key]);
		if (kept) console.warn(`Duplicate ${key} ${String(row[key])}: kept ${String(kept.tcgdex_id ?? 'first row')}, dropped ${String(row.tcgdex_id ?? 'later row')}`);
		else byKey.set(row[key], row);
	}
	return [...byKey.values()];
}

/**
 * Upserts every set of a language that holds a card, minus the excluded series, and drops the stored sets that hold none:
 * TCGdex lists sets it has no card for yet (the 15 Japanese CS sets, all named トリプレットビート).
 * Returns every listed set id, empty ones included, so the card pass also clears the cards a set lost.
 */
export async function syncSets(supabase: SupabaseClient, client: TcgdexClient, lang: Language): Promise<string[]> {
	const table = CATALOGUES[lang].tables.sets;
	const [listed, excluded] = await Promise.all([client.json<TcgdexSet[]>(`/v2/${lang}/sets`), excludedSetIds(client, lang)]);
	const list = catalogueSets(listed ?? [], excluded);
	const details = (await mapAll(list, async set => {
		const detail = await client.json<TcgdexSet>(`/v2/${lang}/sets/${encodeURIComponent(set.id)}`);
		return detail && withProbedAssets(detail, lang);
	})).filter((set): set is TcgdexSet => set !== null);
	await upsertRows(supabase, table, details.filter(set => set.cards?.length).map(set => setRow(mapSet(set))), 'set_id', 100);

	/** Only a set TCGdex answered for and found empty is dropped. A set that failed to load keeps its row. */
	await deleteIn(supabase, table, 'set_id', details.filter(set => !set.cards?.length).map(set => set.id));
	return details.map(set => set.id);
}

export interface SyncCardsResult {
	cards: number;
	prices: number;
	sets: number;
}

interface StoredCard {
	code: string;
	setId: string;
}

/** `tcgdex_id` -> stored `card_code` and set for the given sets. One query per set keeps each under Supabase's 1000-row select cap. */
async function storedCards(supabase: SupabaseClient, table: string, setIds: readonly string[]): Promise<Map<string, StoredCard>> {
	const cards = new Map<string, StoredCard>();
	await Promise.all(setIds.map(async setId => {
		const {data, error} = await supabase.from(table).select('card_code,tcgdex_id').eq('set_id', setId);
		if (error) throw new Error(`Error reading ${table} codes of ${setId}: ${error.message}`);
		for (const row of data) if (row.tcgdex_id) cards.set(row.tcgdex_id, {code: row.card_code, setId});
	}));
	return cards;
}

/**
 * Fetches every card of the given sets and upserts cards, then prices (the price table has a foreign key on `card_code`).
 * Deletes run first: a card TCGdex no longer lists, and the old row of a card whose code an override changes, since two
 * codes can swap within a set. Prices follow through `on delete cascade`. Collections are never touched.
 */
export async function syncSetCards(supabase: SupabaseClient, client: TcgdexClient, lang: Language, setIds: readonly string[]): Promise<SyncCardsResult> {
	const tables = CATALOGUES[lang].tables;
	const [details, stored] = await Promise.all([
		mapAll(setIds, id => client.json<TcgdexSet>(`/v2/${lang}/sets/${encodeURIComponent(id)}`)),
		storedCards(supabase, tables.cards, setIds),
	]);
	const fallback = await imageFallbacks(client, lang, details);
	const ids = details.flatMap(set => set?.cards?.map(card => card.id) ?? []);
	const fetched = await mapAll(ids, id => client.json<TcgdexCard>(`/v2/${lang}/cards/${encodeURIComponent(id)}`));
	if (lang === 'fr') fileUnderListingSets(fetched, details);

	/** Only sets that answered can delete cards, so a set that failed to load removes nothing. */
	const listed = new Set(ids);
	const answered = new Set(details.flatMap(set => set ? [set.id] : []));
	const stale = [...stored].filter(([tcgdexId, card]) => !listed.has(tcgdexId) && answered.has(card.setId)).map(([, card]) => card.code);

	const cards: Record<string, unknown>[] = [];
	const prices: Record<string, unknown>[] = [];
	const unpriced: string[] = [];
	for (const card of fetched) {
		if (!card) continue;
		card.image ??= fallback.get(card.id);
		const mapped = mapCard(lang, card);
		const previous = stored.get(card.id)?.code;
		mapped.cardCode = resolveCardCode(lang, card.id, previous, mapped.cardCode);
		if (previous && previous !== mapped.cardCode) stale.push(previous);
		/** No `art_image` / `art_source`: the CLI owns them (see `artRow`), and an upsert without them keeps the stored values. */
		cards.push(cardRow(mapped, lang));
		const price = mapPrice(card.pricing);
		if (price) prices.push(priceRow(mapped.cardCode, price));
		else unpriced.push(mapped.cardCode);
	}

	await deleteIn(supabase, tables.cards, 'card_code', stale);
	await upsertRows(supabase, tables.cards, deduplicate(cards, 'card_code'), 'card_code');
	await upsertRows(supabase, tables.prices, deduplicate(prices, 'card_code'), 'card_code');
	await deleteIn(supabase, tables.prices, 'card_code', unpriced);
	return {cards: cards.length, prices: prices.length, sets: setIds.length};
}

/**
 * Clears the price and Cardmarket link of every card that shares its product with a differently named card
 * (see `sharedProductCodes`). The groups span several sets, so this runs once over the whole table after the card pass.
 */
export async function dropSharedProducts(supabase: SupabaseClient, lang: Language): Promise<number> {
	const tables = CATALOGUES[lang].tables;
	const rows = await readAll<{card_code: string; card_market_url: string | null; name: string}>(supabase, tables.cards, 'card_code,card_market_url,name', 'card_code');
	const codes = [...sharedProductCodes(rows.map(row => ({cardCode: row.card_code, cardMarketUrl: row.card_market_url ?? '', name: row.name})))];
	await deleteIn(supabase, tables.prices, 'card_code', codes);
	for (let index = 0; index < codes.length; index += 200) {
		const {error} = await supabase.from(tables.cards).update({card_market_url: null}).in('card_code', codes.slice(index, index + 200));
		if (error) throw new Error(`Error clearing ${tables.cards} products at ${index}: ${error.message}`);
	}
	return codes.length;
}
