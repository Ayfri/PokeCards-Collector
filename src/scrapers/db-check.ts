import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {TABLES} from './supabase_sync';
import {EXCLUDED_SERIES} from './tcgdex/excluded';
import type {Language} from './tcgdex/mappers';
import {UNKNOWN_POKEMON} from './tcgdex/mappers';

/**
 * Read-only sanity pass over the live Supabase catalogue. It never writes: every check reports counts
 * and a short sample, so a bad upload is visible before anyone browses into it.
 */

const PAGE = 5000;
/** A single card worth more than this is a scraping accident, not a price: the most expensive graded singles trade below it. */
const ABSURD_PRICE = 100_000;
const SAMPLE = 5;

export type Severity = 'error' | 'warn' | 'info';

export interface Check {
	count: number;
	name: string;
	sample: string[];
	severity: Severity;
}

export interface CheckReport {
	checks: Check[];
	errors: number;
	warnings: number;
}

interface CardRow {
	card_code: string;
	image: string | null;
	name: string | null;
	pokemon_id: number | null;
	rarity: string | null;
	set_id: string | null;
	tcgdex_id: string | null;
}

interface PriceRow {
	card_code: string;
	[column: string]: string | number | null;
}

interface SetRow {
	release_date: string | null;
	series: string | null;
	set_id: string;
	total_cards: number | null;
}

function client(): SupabaseClient {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SECRET_KEY ?? process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !key) throw new Error('Missing PUBLIC_SUPABASE_URL or a Supabase key');
	return createClient(url, key, {auth: {persistSession: false}});
}

/** Pages a whole table on an ordered key; the catalogue tables sit far above Supabase's single-select row cap. */
async function readAll<T>(supabase: SupabaseClient, table: string, columns: string, orderBy: string): Promise<T[]> {
	const rows: T[] = [];
	for (let from = 0; ; from += PAGE) {
		const {data, error} = await supabase.from(table).select(columns).order(orderBy).range(from, from + PAGE - 1);
		if (error) throw new Error(`${table}: ${error.message}`);
		rows.push(...(data as T[]));
		if (data.length < PAGE) return rows;
	}
}

const duplicates = <T>(rows: readonly T[], key: (row: T) => string): string[] => {
	const seen = new Set<string>();
	const twice = new Set<string>();
	for (const row of rows) {
		const value = key(row);
		if (seen.has(value)) twice.add(value); else seen.add(value);
	}
	return [...twice];
};

const priceColumns = (row: PriceRow) => Object.entries(row).filter(([column]) => column !== 'card_code');

export async function checkDatabase(): Promise<CheckReport> {
	const supabase = client();
	const checks: Check[] = [];
	const add = (name: string, severity: Severity, values: readonly string[], count = values.length) => {
		checks.push({count, name, sample: values.slice(0, SAMPLE), severity});
	};

	const excluded = new Set<string>(EXCLUDED_SERIES);
	const excludedNames = new Set(['Pokémon TCG Pocket']);

	for (const lang of Object.keys(TABLES) as Language[]) {
		const tables = TABLES[lang];
		const [cards, prices, sets] = await Promise.all([
			readAll<CardRow>(supabase, tables.cards, 'card_code,image,name,pokemon_id,rarity,set_id,tcgdex_id', 'card_code'),
			readAll<PriceRow>(supabase, tables.prices, '*', 'card_code'),
			readAll<SetRow>(supabase, tables.sets, 'release_date,series,set_id,total_cards', 'set_id'),
		]);

		const tag = (name: string) => `${lang}: ${name}`;
		const setIds = new Set(sets.map(set => set.set_id));
		const cardCodes = new Set(cards.map(card => card.card_code));
		const pricedCodes = new Set(prices.map(price => price.card_code));
		const heldPerSet = new Map<string, number>();
		for (const card of cards) if (card.set_id) heldPerSet.set(card.set_id, (heldPerSet.get(card.set_id) ?? 0) + 1);

		add(tag('rows'), 'info', [`${cards.length} cards, ${prices.length} prices, ${sets.length} sets`], cards.length);
		add(tag('duplicate card_code'), 'error', duplicates(cards, card => card.card_code));
		add(tag('duplicate set_id'), 'error', duplicates(sets, set => set.set_id));
		add(tag('prices with no card'), 'error', prices.filter(price => !cardCodes.has(price.card_code)).map(price => price.card_code));
		add(tag('cards in an unknown set'), 'error', cards.filter(card => !card.set_id || !setIds.has(card.set_id)).map(card => card.card_code));
		add(tag('cards from an excluded serie'), 'error', cards.filter(card => card.set_id && excluded.has(card.set_id)).map(card => card.card_code));
		add(tag('sets from an excluded serie'), 'error', sets.filter(set => set.series && excludedNames.has(set.series)).map(set => set.set_id));

		add(tag('cards with no tcgdex_id'), 'warn', cards.filter(card => !card.tcgdex_id).map(card => card.card_code));
		add(tag('cards with no image'), 'warn', cards.filter(card => !card.image).map(card => card.card_code));
		add(tag('cards with no name'), 'error', cards.filter(card => !card.name).map(card => card.card_code));
		add(tag('cards with no rarity'), 'warn', cards.filter(card => !card.rarity).map(card => card.card_code));
		add(tag(`card_code holding the ${UNKNOWN_POKEMON} sentinel`), 'warn', cards.filter(card => card.card_code.includes(`_${UNKNOWN_POKEMON}_`)).map(card => card.card_code));
		add(tag('pokemon_id out of the dex range'), 'error', cards.filter(card => card.pokemon_id !== null && (card.pokemon_id < 1 || card.pokemon_id > 1100)).map(card => `${card.card_code} (${card.pokemon_id})`));

		add(tag('negative prices'), 'error', prices.filter(price => priceColumns(price).some(([, value]) => typeof value === 'number' && value < 0)).map(price => price.card_code));
		add(tag(`prices above ${ABSURD_PRICE} €`), 'error', prices.filter(price => priceColumns(price).some(([, value]) => typeof value === 'number' && value > ABSURD_PRICE)).map(price => price.card_code));
		add(tag('price rows with every column null'), 'warn', prices.filter(price => priceColumns(price).every(([, value]) => value === null)).map(price => price.card_code));
		add(tag('unpriced cards'), 'info', cards.filter(card => !pricedCodes.has(card.card_code)).map(card => card.card_code));

		add(tag('sets with no release date'), 'warn', sets.filter(set => !set.release_date).map(set => set.set_id));
		add(tag('sets holding more cards than total_cards'), 'warn', sets.filter(set => set.total_cards !== null && (heldPerSet.get(set.set_id) ?? 0) > set.total_cards).map(set => set.set_id));
	}

	const owned = new Map<string, number>();
	for (const table of ['collections', 'wishlists']) {
		const rows = await readAll<{card_code: string}>(supabase, table, 'card_code', 'card_code');
		for (const row of rows) owned.set(row.card_code, (owned.get(row.card_code) ?? 0) + 1);
	}
	const known = new Set<string>();
	for (const lang of Object.keys(TABLES) as Language[]) {
		for (const row of await readAll<{card_code: string}>(supabase, TABLES[lang].cards, 'card_code', 'card_code')) known.add(row.card_code);
	}
	// Kept on purpose: an owned code no table carries renders again once TCGdex fills the set in.
	add('owned codes resolving to no card', 'warn', [...owned.keys()].filter(code => !known.has(code)));

	return {
		checks,
		errors: checks.filter(check => check.severity === 'error' && check.count > 0).length,
		warnings: checks.filter(check => check.severity === 'warn' && check.count > 0).length,
	};
}
