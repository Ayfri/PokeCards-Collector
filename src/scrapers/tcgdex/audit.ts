import * as fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {mapAll} from './client';
import {excludedSetIds, withoutExcluded} from './excluded';
import {speciesInName} from './mappers';
import {Http2Pool} from './http2-pool';
import type {TcgdexCard, TcgdexSet} from './types';

/**
 * Regenerates `set-aliases.json` and `card-code-overrides.json` from the live TCGdex API and the
 * legacy `card_code` values still stored in Supabase, then reports what would stop resolving.
 * Run it before any cut-over: the EN resolution rate is the migration gate.
 */

const LANGS = ['en', 'ja'] as const;
type Lang = (typeof LANGS)[number];

const TABLES: Record<Lang, string> = {en: 'cards', ja: 'jp_cards'};
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const norm = (value: string) => (value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
/** How the *legacy* code generator normalized a number: it stripped anything outside [a-z0-9] without lowercasing, so uppercase prefixes vanished ("TG01" -> "01"). Matching only. */
const legacyNum = (value: string) => (value ?? '').replace(/[^a-z0-9]/g, '');
/** Matching key only: pokemontcg.io numbered cards `1`, TCGdex numbers them `001`. */
const numKey = (value: string) => {
	const stripped = legacyNum(value);
	return stripped !== '' && /^\d+$/.test(stripped) ? String(Number(stripped)) : stripped;
};

/** Sets TCGdex keys differently from the legacy sources and that no name match can bridge. */
const MANUAL_SET_ALIASES: Record<string, string> = {cel25c: 'cel25cc', fut20: 'fut2020', swsh12pt5gg: 'swsh12.5gg'};

interface LegacyRow {
	card_code: string;
	name: string | null;
	set_name: string | null;
}

async function legacyRows(table: string): Promise<LegacyRow[]> {
	const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY ?? process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
	const rows: LegacyRow[] = [];
	for (let from = 0; ; from += 5000) {
		const {data, error} = await supabase.from(table).select('card_code,name,set_name').range(from, from + 4999);
		if (error) throw new Error(`${table}: ${error.message}`);
		rows.push(...(data as LegacyRow[]));
		if (data.length < 5000) return rows;
	}
}

/** Card codes users actually own; these are the rows that must keep resolving. The binder lives in localStorage, not in Postgres. */
async function ownedCardCodes(): Promise<Set<string>> {
	const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY ?? process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
	const codes = new Set<string>();
	for (const table of ['collections', 'wishlists']) {
		const {data, error} = await supabase.from(table).select('card_code');
		if (error) throw new Error(`${table}: ${error.message}`);
		for (const row of data) codes.add(row.card_code as string);
	}
	return codes;
}

async function allCards(pool: Http2Pool, lang: Lang, sets: TcgdexSet[]): Promise<TcgdexCard[]> {
	const details = await mapAll(sets, set => pool.json<TcgdexSet>(`/v2/${lang}/sets/${encodeURIComponent(set.id)}`));
	const ids = details.flatMap(set => set?.cards?.map(card => card.id) ?? []);
	const cards = await mapAll(ids, id => pool.json<TcgdexCard>(`/v2/${lang}/cards/${encodeURIComponent(id)}`), `${lang} cards`);
	return cards.filter((card): card is TcgdexCard => card !== null);
}

export async function auditTcgdex(write = true) {
	const pool = new Http2Pool();
	const aliases: Record<string, Record<string, string>> = {};
	const overrides: Record<string, Record<string, string>> = {};
	const owned = await ownedCardCodes();
	const resolvedCodes = new Set<string>();
	const legacyCodes = new Set<string>();

	for (const lang of LANGS) {
		const sets = withoutExcluded((await pool.json<TcgdexSet[]>(`/v2/${lang}/sets`))!, await excludedSetIds(pool, lang));
		const rows = (await legacyRows(TABLES[lang])).filter(row => !row.card_code.startsWith('unknown_'));
		const distinct = [...new Set(rows.map(row => row.card_code))];
		const legacyNames = new Map(rows.map(row => [row.card_code, row.name ?? '']));

		// A legacy set code only exists inside card codes, so recover it (and the set name it goes with) from them.
		const legacySetNames = new Map<string, string>();
		for (const row of rows) {
			const setCode = row.card_code.split('_')[2];
			if (row.set_name && !legacySetNames.has(setCode)) legacySetNames.set(setCode, row.set_name);
			else if (!legacySetNames.has(setCode)) legacySetNames.set(setCode, '');
		}

		const byId = new Map(sets.map(set => [norm(set.id), set]));
		const byName = new Map<string, TcgdexSet>();
		for (const set of sets) if (!byName.has(norm(set.name))) byName.set(norm(set.name), set);

		// Match on the TCGdex set id first, then on the set name, then on the handful of manual entries.
		const langAliases: Record<string, string> = {};
		const unmatchedSets: string[] = [];
		for (const [setCode, setName] of legacySetNames) {
			const manual = MANUAL_SET_ALIASES[setCode];
			const hit = byId.get(norm(setCode)) ?? byName.get(norm(setName)) ?? (manual ? byId.get(norm(manual)) : undefined);
			if (hit) langAliases[setCode] = hit.id; else unmatchedSets.push(setCode);
		}

		const cards = await allCards(pool, lang, sets);
		const reverse = new Map<string, string>();
		for (const [legacyCode, tcgdexId] of Object.entries(langAliases)) reverse.set(tcgdexId, legacyCode);

		const bySet = new Map<string, TcgdexCard[]>();
		for (const card of cards) {
			const setCode = norm(reverse.get(card.set?.id ?? '') ?? card.set?.id ?? '');
			(bySet.get(setCode) ?? bySet.set(setCode, []).get(setCode)!).push(card);
		}

		/** The legacy dex id is one of the card's species, by TCGdex or by the species its English name spells out. */
		const sameSpecies = (legacyDex: number, card: TcgdexCard) => card.dexId?.some(dex => Math.trunc(dex) === legacyDex) || (lang === 'en' && speciesInName(card.name).includes(legacyDex));
		/** Nothing rules the pairing out: same supertype, and the dex ids agree unless one side does not know it. */
		const agrees = (parts: string[], card: TcgdexCard) => {
			if (parts[0] !== supertypeOf(card)) return false;
			const legacyDex = Number(parts[1]);
			return legacyDex === 0 || legacyDex === 99999 || !card.dexId?.length || sameSpecies(legacyDex, card);
		};
		/** A number as printed, zero padding aside: "001" is "1", "H01" stays "h01". */
		const exact = (value: string) => { const key = norm(value); return /^\d+$/.test(key) ? String(Number(key)) : key; };
		/** Only the digits, so a legacy "1" also meets "H01". */
		const digits = (value: string) => numKey(value.replace(/\D/g, ''));

		/**
		 * The legacy generator dropped uppercase letters, so "H1" and "1" both became "1": a number alone once handed
		 * Skyridge's Alakazam H1 code to Aerodactyl 1 and chained the whole set one card off. Each pass is weaker than
		 * the last, and every code gets its chance at a pass before any code moves to the next, so a strong match is
		 * never taken by a weak one. The last pass keeps what the stored row already says, for the legacy dex slips (Klinklang saved as 599).
		 */
		const passes: ((parts: string[], card: TcgdexCard, name: string) => boolean)[] = [
			(parts, card) => exact(card.localId) === exact(parts[3]) && agrees(parts, card),
			(parts, card) => digits(card.localId) === numKey(parts[3]) && agrees(parts, card),
			(parts, card, name) => norm(card.name) === norm(name) && agrees(parts, card),
			(parts, card) => parts[0] === supertypeOf(card) && sameSpecies(Number(parts[1]), card),
			(parts, card, name) => norm(card.name) === norm(name) && digits(card.localId) === numKey(parts[3]),
		];

		const langOverrides: Record<string, string> = {};
		const claimed = new Set<string>();
		let pending = distinct;
		for (const [index, pass] of passes.entries()) {
			const next: string[] = [];
			for (const code of pending) {
				const parts = code.split('_');
				const candidates = (bySet.get(parts[2]) ?? []).filter(card => !claimed.has(card.id) && pass(parts, card, legacyNames.get(code) ?? ''));
				// The species pass only trusts a single candidate: two unclaimed prints of one species cannot be told apart.
				const hit = index === 3 && candidates.length > 1 ? undefined : candidates[0];
				if (!hit) { next.push(code); continue; }
				claimed.add(hit.id);
				if (naturalCardCode(hit, parts[2]) !== code) langOverrides[hit.id] = code;
			}
			pending = next;
		}
		const unresolved = pending;

		const rate = ((distinct.length - unresolved.length) / distinct.length) * 100;
		console.log(`${lang}: ${cards.length} TCGdex cards, ${sets.length} sets | legacy ${distinct.length} codes in ${legacySetNames.size} sets (${unmatchedSets.length} sets TCGdex has not), resolved ${rate.toFixed(2)}%, overrides ${Object.keys(langOverrides).length}, unresolved ${unresolved.length}`);
		if (unmatchedSets.length) console.log(`  set codes with no TCGdex set: ${unmatchedSets.join(', ')}`);
		if (unresolved.length) console.log(`  unresolved sample: ${unresolved.slice(0, 15).join(', ')}`);

		const unresolvedSet = new Set(unresolved);
		for (const code of distinct) {
			legacyCodes.add(code);
			if (!unresolvedSet.has(code)) resolvedCodes.add(code);
		}
		aliases[lang] = Object.fromEntries(Object.entries(langAliases).sort(([a], [b]) => a.localeCompare(b)));
		overrides[lang] = Object.fromEntries(Object.entries(langOverrides).sort(([a], [b]) => a.localeCompare(b)));
	}

	// Rarities the sorting map does not know about yet.
	const rarities = new Set<string>();
	for (const lang of LANGS) for (const rarity of (await pool.json<string[]>(`/v2/${lang}/rarities`))!) rarities.add(rarity);
	const {RARITY_MAPPING} = await import('$helpers/rarity');
	const missing = [...rarities].filter(rarity => !(rarity.toLowerCase() in RARITY_MAPPING));
	console.log(missing.length ? `rarities missing from RARITY_MAPPING: ${missing.join(', ')}` : 'rarities: every TCGdex value has a tier');

	// Orphans are kept, never deleted: they render again the day TCGdex fills the set in.
	const orphans = [...owned].filter(code => !resolvedCodes.has(code));
	const alreadyBroken = orphans.filter(code => !legacyCodes.has(code));
	const newlyBroken = orphans.filter(code => legacyCodes.has(code));
	console.log(`collections + wishlists: ${owned.size} distinct card codes | ${alreadyBroken.length} already point at no card today, ${newlyBroken.length} become temporarily invisible`);
	if (newlyBroken.length) console.log(`  newly invisible: ${newlyBroken.join(', ')}`);

	if (write) {
		fs.writeFileSync(`${HERE}../../lib/data/set-aliases.json`, `${JSON.stringify(aliases, null, '\t')}\n`);
		fs.writeFileSync(`${HERE}card-code-overrides.json`, `${JSON.stringify(overrides, null, '\t')}\n`);
	}
	pool.close();
}

function supertypeOf(card: TcgdexCard): string {
	const supertype = norm(card.category ?? 'pokemon');
	return supertype === 'pokmon' ? 'pokemon' : supertype;
}

function naturalCardCode(card: TcgdexCard, setCode: string): string {
	const dex = card.dexId?.[0] ?? (card.category === 'Pokemon' ? 99999 : 0);
	return `${supertypeOf(card)}_${Math.trunc(dex)}_${norm(setCode)}_${norm(card.localId)}`;
}
