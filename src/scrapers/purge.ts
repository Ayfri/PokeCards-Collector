import type {SupabaseClient} from '@supabase/supabase-js';
import {deleteIn, envClient, ownedCardCodes, TABLES} from './supabase_sync';
import {Http2Pool} from './tcgdex/http2-pool';
import {EXCLUDED_SERIES, excludedSetIds} from './tcgdex/excluded';
import type {Language} from './tcgdex/mappers';

/**
 * Drops every catalogue row belonging to an excluded serie (see `EXCLUDED_SERIES`).
 * `collections` and `wishlists` are never touched: the report lists the rows left pointing at nothing,
 * which render again if the serie comes back.
 */

const CHUNK = 200;

export interface PurgeLangReport {
	cards: number;
	lang: Language;
	orphanedOwned: string[];
	prices: number;
	sets: string[];
}

export interface PurgeReport {
	dryRun: boolean;
	langs: PurgeLangReport[];
}

async function countIn(supabase: SupabaseClient, table: string, column: string, values: readonly string[]): Promise<number> {
	let total = 0;
	for (let index = 0; index < values.length; index += CHUNK) {
		const {count, error} = await supabase.from(table).select(column, {count: 'exact', head: true}).in(column, values.slice(index, index + CHUNK));
		if (error) throw new Error(`Error counting ${table}: ${error.message}`);
		total += count ?? 0;
	}
	return total;
}

/**
 * Set ids to drop: what TCGdex lists under the excluded series, plus whatever the `sets` table already
 * carries under those serie names. The second half matters when TCGdex drops a serie the DB still holds.
 */
async function targetSetIds(supabase: SupabaseClient, pool: Http2Pool, lang: Language, serieNames: readonly string[]): Promise<string[]> {
	const ids = await excludedSetIds(pool, lang);
	const {data, error} = await supabase.from(TABLES[lang].sets).select('set_id').in('series', serieNames);
	if (error) throw new Error(`${TABLES[lang].sets}: ${error.message}`);
	for (const row of data) ids.add(row.set_id as string);
	return [...ids];
}

export async function purgeExcludedSeries(dryRun = false): Promise<PurgeReport> {
	const supabase = envClient();
	const pool = new Http2Pool();
	try {
		const serieNames = (await Promise.all(EXCLUDED_SERIES.map(id => pool.json<{name: string}>(`/v2/en/series/${id}`)))).flatMap(serie => serie?.name ?? []);
		const owned = await ownedCardCodes(supabase);
		const langs: PurgeLangReport[] = [];

		for (const lang of Object.keys(TABLES) as Language[]) {
			const tables = TABLES[lang];
			const sets = await targetSetIds(supabase, pool, lang, serieNames);

			const codes: string[] = [];
			for (let index = 0; index < sets.length; index += CHUNK) {
				const {data, error} = await supabase.from(tables.cards).select('card_code').in('set_id', sets.slice(index, index + CHUNK));
				if (error) throw new Error(`${tables.cards}: ${error.message}`);
				for (const row of data) codes.push(row.card_code as string);
			}

			const report: PurgeLangReport = {cards: codes.length, lang, orphanedOwned: codes.filter(code => owned.has(code)), prices: 0, sets};
			if (codes.length) report.prices = dryRun ? await countIn(supabase, tables.prices, 'card_code', codes) : await deleteIn(supabase, tables.prices, 'card_code', codes);
			if (!dryRun && codes.length) report.cards = await deleteIn(supabase, tables.cards, 'card_code', codes);
			if (!dryRun && sets.length) await deleteIn(supabase, tables.sets, 'set_id', sets);
			langs.push(report);
		}

		return {dryRun, langs};
	} finally {
		pool.close();
	}
}
