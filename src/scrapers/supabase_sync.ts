import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {cardRow, priceRow, setRow} from './rows';
import {mapAll, type TcgdexClient} from './tcgdex/client';
import {mapCard, mapPrice, mapSet, type Language} from './tcgdex/mappers';
import type {TcgdexCard, TcgdexSet} from './tcgdex/types';

/** Workers-safe half of the scraper: no `node:fs`, no staged JSON, TCGdex straight into Supabase. */

interface Tables {
	cards: string;
	prices: string;
	sets: string;
}

export const TABLES: Record<Language, Tables> = {
	en: {cards: 'cards', prices: 'prices', sets: 'sets'},
	ja: {cards: 'jp_cards', prices: 'jp_prices', sets: 'jp_sets'},
};

export function createSyncClient(url: string, secretKey: string): SupabaseClient {
	if (!url || !secretKey) throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
	return createClient(url, secretKey, {auth: {persistSession: false}});
}

/** Upserts in batches; Supabase rejects a single statement carrying tens of thousands of rows. */
export async function upsertRows(supabase: SupabaseClient, table: string, rows: Record<string, unknown>[], onConflict: string, batchSize = 500): Promise<number> {
	for (let index = 0; index < rows.length; index += batchSize) {
		const {error} = await supabase.from(table).upsert(rows.slice(index, index + batchSize), {onConflict});
		if (error) throw new Error(`Error upserting ${table} at ${index}: ${error.message}`);
	}
	return rows.length;
}

/** Deduplicates on the primary key, keeping the last occurrence. */
function deduplicate(rows: Record<string, unknown>[], key: string): Record<string, unknown>[] {
	const byKey = new Map<unknown, Record<string, unknown>>();
	for (const row of rows) byKey.set(row[key], row);
	return [...byKey.values()];
}

/** Upserts every set of a language and returns the TCGdex set ids the card pass has to walk. */
export async function syncSets(supabase: SupabaseClient, client: TcgdexClient, lang: Language): Promise<string[]> {
	const list = (await client.json<TcgdexSet[]>(`/v2/${lang}/sets`)) ?? [];
	const details = (await mapAll(list, set => client.json<TcgdexSet>(`/v2/${lang}/sets/${encodeURIComponent(set.id)}`))).filter((set): set is TcgdexSet => set !== null);
	await upsertRows(supabase, TABLES[lang].sets, details.map(set => setRow(mapSet(set))), 'set_id', 100);
	return details.map(set => set.id);
}

export interface SyncCardsResult {
	cards: number;
	prices: number;
	sets: number;
}

/**
 * Fetches every card of the given sets and upserts cards then prices, in that order:
 * the price table carries a foreign key on `card_code`.
 */
export async function syncSetCards(supabase: SupabaseClient, client: TcgdexClient, lang: Language, setIds: readonly string[]): Promise<SyncCardsResult> {
	const details = await mapAll(setIds, id => client.json<TcgdexSet>(`/v2/${lang}/sets/${encodeURIComponent(id)}`));
	const ids = details.flatMap(set => set?.cards?.map(card => card.id) ?? []);
	const fetched = await mapAll(ids, id => client.json<TcgdexCard>(`/v2/${lang}/cards/${encodeURIComponent(id)}`));

	const cards: Record<string, unknown>[] = [];
	const prices: Record<string, unknown>[] = [];
	for (const card of fetched) {
		if (!card) continue;
		const mapped = mapCard(lang, card);
		cards.push(cardRow(mapped));
		const price = mapPrice(card.pricing);
		if (price) prices.push(priceRow(mapped.cardCode, price));
	}

	const tables = TABLES[lang];
	await upsertRows(supabase, tables.cards, deduplicate(cards, 'card_code'), 'card_code');
	await upsertRows(supabase, tables.prices, deduplicate(prices, 'card_code'), 'card_code');
	return {cards: cards.length, prices: prices.length, sets: setIds.length};
}
