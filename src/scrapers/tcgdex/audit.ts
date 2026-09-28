import * as fs from 'node:fs';
import {generateUniqueCardCode} from '$helpers/card-utils';
import {RARITY_MAPPING} from '$helpers/rarity';
import {envClient, ownedCardCodes, readAll, TABLES} from '../supabase_sync';
import {mapAll} from './client';
import {excludedSetIds, withoutExcluded} from './excluded';
import {Http2Pool} from './http2-pool';
import {speciesInName, UNKNOWN_POKEMON, type Language} from './mappers';
import type {TcgdexCard, TcgdexSet} from './types';

/**
 * Regenerates `set-aliases.json` and `card-code-overrides.json` by matching every `card_code` stored in Supabase to
 * its TCGdex card, then reports the owned codes left pointing at no card. The sync applies the overrides, moving any
 * card whose stored code differs.
 */

const LANGS: readonly Language[] = ['en', 'ja'];
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const norm = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
/** A number zero padding aside: "001" is "1", "H01" stays "h01". */
const exact = (value: string) => {
	const key = norm(value);
	return /^\d+$/.test(key) ? String(Number(key)) : key;
};
/** Only the digits, so "1" also meets "H01". */
const digits = (value: string) => String(Number(value.replace(/\D/g, '')));

/** Set codes TCGdex keys differently and that no set name bridges. */
const MANUAL_SET_ALIASES: Record<string, string> = {cel25c: 'cel25cc', fut20: 'fut2020', swsh12pt5gg: 'swsh12.5gg'};

interface StoredRow {
	card_code: string;
	name: string;
	set_name: string | null;
}

const supertypeOf = (card: TcgdexCard) => generateUniqueCardCode(0, '', '', card.category).split('_')[0];

async function allCards(pool: Http2Pool, lang: Language, sets: TcgdexSet[]): Promise<TcgdexCard[]> {
	const details = await mapAll(sets, set => pool.json<TcgdexSet>(`/v2/${lang}/sets/${encodeURIComponent(set.id)}`));
	const ids = details.flatMap(set => set?.cards?.map(card => card.id) ?? []);
	const cards = await mapAll(ids, id => pool.json<TcgdexCard>(`/v2/${lang}/cards/${encodeURIComponent(id)}`), `${lang} cards`);
	return cards.filter((card): card is TcgdexCard => card !== null);
}

export async function auditTcgdex(write = true) {
	const supabase = envClient();
	const pool = new Http2Pool();
	const aliases: Record<string, Record<string, string>> = {};
	const overrides: Record<string, Record<string, string>> = {};
	const owned = await ownedCardCodes(supabase);
	const resolved = new Set<string>();

	for (const lang of LANGS) {
		const sets = withoutExcluded((await pool.json<TcgdexSet[]>(`/v2/${lang}/sets`))!, await excludedSetIds(pool, lang));
		const rows = await readAll<StoredRow>(supabase, TABLES[lang].cards, 'card_code,name,set_name', 'card_code');
		const names = new Map(rows.map(row => [row.card_code, row.name]));

		const setNames = new Map<string, string>();
		for (const row of rows) {
			const setCode = row.card_code.split('_')[2];
			if (!setNames.get(setCode)) setNames.set(setCode, row.set_name ?? '');
		}

		const byId = new Map(sets.map(set => [norm(set.id), set]));
		const byName = new Map<string, TcgdexSet>();
		for (const set of sets) if (!byName.has(norm(set.name))) byName.set(norm(set.name), set);

		const langAliases: Record<string, string> = {};
		const unmatchedSets: string[] = [];
		for (const [setCode, setName] of setNames) {
			const manual = MANUAL_SET_ALIASES[setCode];
			const hit = byId.get(norm(setCode)) ?? byName.get(norm(setName)) ?? (manual ? byId.get(norm(manual)) : undefined);
			if (hit) langAliases[setCode] = hit.id; else unmatchedSets.push(setCode);
		}

		const codeSetOf = new Map(Object.entries(langAliases).map(([code, setId]) => [setId, code]));
		const bySet = new Map<string, TcgdexCard[]>();
		for (const card of await allCards(pool, lang, sets)) {
			const setCode = norm(codeSetOf.get(card.set?.id ?? '') ?? card.set?.id ?? '');
			(bySet.get(setCode) ?? bySet.set(setCode, []).get(setCode)!).push(card);
		}

		const sameSpecies = (dex: number, card: TcgdexCard) => card.dexId?.some(id => Math.trunc(id) === dex) || (lang === 'en' && speciesInName(card.name).includes(dex));
		/** Nothing rules the pair out: same supertype, and the dex ids agree unless one side does not know it. */
		const agrees = (parts: string[], card: TcgdexCard) => {
			const dex = Number(parts[1]);
			return parts[0] === supertypeOf(card) && (dex === 0 || dex === UNKNOWN_POKEMON || !card.dexId?.length || sameSpecies(dex, card));
		};

		/**
		 * A code's number has no letters ("H1" and "1" are both "1"), so the number alone cannot tell Skyridge's Alakazam H1
		 * from Aerodactyl 1. Passes go from strongest to weakest, and every code tries a pass before any code moves to
		 * the next, so a weak match never takes a card a strong one wants. The species pass needs a single candidate,
		 * and the last one keeps a code on the card its row names, for codes whose dex id is off (Klinklang under 599).
		 */
		const passes: ((parts: string[], card: TcgdexCard, name: string) => boolean)[] = [
			(parts, card) => exact(card.localId) === exact(parts[3]) && agrees(parts, card),
			(parts, card) => digits(card.localId) === digits(parts[3]) && agrees(parts, card),
			(parts, card, name) => norm(card.name) === norm(name) && agrees(parts, card),
			(parts, card) => parts[0] === supertypeOf(card) && sameSpecies(Number(parts[1]), card),
			(parts, card, name) => norm(card.name) === norm(name) && digits(card.localId) === digits(parts[3]),
		];

		const langOverrides: Record<string, string> = {};
		const claimed = new Set<string>();
		let pending = rows.map(row => row.card_code);
		for (const [index, pass] of passes.entries()) {
			const next: string[] = [];
			for (const code of pending) {
				const parts = code.split('_');
				const candidates = (bySet.get(parts[2]) ?? []).filter(card => !claimed.has(card.id) && pass(parts, card, names.get(code) ?? ''));
				const hit = index === 3 && candidates.length > 1 ? undefined : candidates[0];
				if (!hit) {
					next.push(code);
					continue;
				}
				claimed.add(hit.id);
				resolved.add(code);
				const dex = hit.dexId?.[0] ?? (hit.category === 'Pokemon' ? UNKNOWN_POKEMON : 0);
				if (generateUniqueCardCode(Math.trunc(dex), parts[2], hit.localId, hit.category) !== code) langOverrides[hit.id] = code;
			}
			pending = next;
		}

		console.log(`${lang}: ${rows.length} stored codes, ${sets.length} TCGdex sets | ${Object.keys(langOverrides).length} overrides, ${pending.length} codes match no card`);
		if (unmatchedSets.length) console.log(`  set codes with no TCGdex set: ${unmatchedSets.join(', ')}`);
		if (pending.length) console.log(`  unmatched: ${pending.join(', ')}`);

		aliases[lang] = Object.fromEntries(Object.entries(langAliases).sort(([a], [b]) => a.localeCompare(b)));
		overrides[lang] = Object.fromEntries(Object.entries(langOverrides).sort(([a], [b]) => a.localeCompare(b)));
	}

	const rarities = new Set<string>();
	for (const lang of LANGS) for (const rarity of (await pool.json<string[]>(`/v2/${lang}/rarities`))!) rarities.add(rarity);
	const missing = [...rarities].filter(rarity => !(rarity.toLowerCase() in RARITY_MAPPING));
	console.log(missing.length ? `rarities missing from RARITY_MAPPING: ${missing.join(', ')}` : 'rarities: every TCGdex value has a tier');

	// Kept, never deleted: an owned code renders again the day TCGdex fills its set in.
	const orphans = [...owned].filter(code => !resolved.has(code));
	console.log(`collections + wishlists: ${owned.size} distinct card codes, ${orphans.length} point at no card${orphans.length ? `: ${orphans.join(', ')}` : ''}`);

	if (write) {
		fs.writeFileSync(`${HERE}../../lib/data/set-aliases.json`, `${JSON.stringify(aliases, null, '\t')}\n`);
		fs.writeFileSync(`${HERE}card-code-overrides.json`, `${JSON.stringify(overrides, null, '\t')}\n`);
	}
	pool.close();
}
