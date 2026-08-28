import * as fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {CARDS, JP_CARDS, JP_PRICES, JP_SETS, PRICES, SETS} from '../files';
import type {MappedCard, MappedPrice, MappedSet} from './mappers';

export interface FileReport {
	cards: number;
	collisions: number;
	distinct: number;
	imageless: number;
	lang: string;
	priced: number;
	sets: number;
	unpriced: string[];
}

export interface VerifyReport {
	files: FileReport[];
	missing: string[];
	owned: number;
}

const LANGS = [
	{lang: 'en', cards: CARDS, prices: PRICES, sets: SETS},
	{lang: 'ja', cards: JP_CARDS, prices: JP_PRICES, sets: JP_SETS},
] as const;

const read = <T>(path: string): T => JSON.parse(fs.readFileSync(path, 'utf8')) as T;

/** Card codes users actually own. The binder lives in localStorage, so Postgres only knows these two tables. */
async function ownedCardCodes(): Promise<Set<string>> {
	const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY!);
	const codes = new Set<string>();
	for (const table of ['collections', 'wishlists']) {
		const {data, error} = await supabase.from(table).select('card_code');
		if (error) throw new Error(`${table}: ${error.message}`);
		for (const row of data) codes.add(row.card_code as string);
	}
	return codes;
}

/**
 * Checks the scraped JSON before it is uploaded: no two cards may share a `card_code` (it is the
 * primary key everywhere), and every code a user owns should still resolve to a card.
 * Owned codes that do not resolve are reported, never deleted - they render again once TCGdex has the set.
 */
export async function verifyFiles(checkOwned = true): Promise<VerifyReport> {
	const files: FileReport[] = [];
	const produced = new Set<string>();

	for (const {lang, cards: cardsPath, prices: pricesPath, sets: setsPath} of LANGS) {
		const cards = read<MappedCard[]>(cardsPath);
		const prices = read<Record<string, MappedPrice>>(pricesPath);
		const sets = read<MappedSet[]>(setsPath);
		const distinct = new Set(cards.map(card => card.cardCode));
		for (const code of distinct) produced.add(code);

		files.push({
			cards: cards.length,
			collisions: cards.length - distinct.size,
			distinct: distinct.size,
			imageless: cards.filter(card => !card.image).length,
			lang,
			priced: Object.keys(prices).length,
			sets: sets.length,
			unpriced: cards.filter(card => !prices[card.cardCode]).slice(0, 5).map(card => card.cardCode),
		});
	}

	const owned = checkOwned ? await ownedCardCodes() : new Set<string>();
	return {files, missing: [...owned].filter(code => !produced.has(code)), owned: owned.size};
}
