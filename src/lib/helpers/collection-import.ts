import { parseCardCode } from '$helpers/card-utils';
import setNames from '$lib/data/set-names.json' with { type: 'json' };
import type { Card, Set } from '$lib/types';

/** One line of an imported file, already reduced to the three things a card can be found by. */
export interface ImportRow {
	/** Only used to report an unmatched line back to the user, never to match on: card names are localised. */
	name: string;
	/** The printed number, numerator only: `004/165` and `TG12/TG30` arrive here as `004` and `TG12`. */
	number: string;
	quantity: number;
	/** Whatever the file calls the set, when it names one at all. A per-set export like Pokécardex's names none. */
	set: string;
}

/** Which column of the file feeds which field. `-1` means the file has no such column. */
export interface ColumnMapping {
	/** A `card_code` column, which is what this site's own export writes, and matches with no set lookup at all. */
	code: number;
	name: number;
	number: number;
	/** Every counted column: Pokécardex splits one card over `Nb Normal`, `Nb Ed1`, `Nb Reverse` and `Nb Spéciale`. */
	quantity: number[];
	set: number;
}

export const MAX_IMPORT_ROWS = 20000;

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/**
 * A set name as its sorted, depluralized words, so word order and plurals stop mattering: Pokecardex writes
 * `Énergies Écarlate et Violet` where TCGdex writes `Écarlate et Violet Énergie`. Prefixed, so it cannot collide
 * with a plain normalized name.
 */
const tokenKey = (value: string) => {
	const tokens = value.split(/[^\p{L}\p{N}]+/u).map(word => normalize(word).replace(/s$/, '')).filter(Boolean).sort();
	return tokens.length > 1 ? `t:${tokens.join('-')}` : '';
};

const HEADER_ALIASES = {
	code: ['cardcode', 'code', 'uniquecode'],
	name: ['nom', 'name', 'carte', 'card', 'cardname', 'nomcarte', 'nomdelacarte'],
	number: ['numero', 'num', 'no', 'n', 'number', 'cardnumber', 'numerocarte', 'numcarte', 'localid', 'numerodecarte'],
	set: ['extension', 'set', 'serie', 'series', 'setname', 'bloc', 'edition', 'nomextension', 'setid', 'collection'],
} satisfies Record<string, string[]>;

/** `Nb Normal`, `Nb Ed1`, `Nb Reverse`, `Nb Spéciale`, `Quantité`, `Qty`: anything that counts copies rather than describing the card. */
const isQuantityHeader = (header: string) =>
	header.startsWith('nb') || header.startsWith('quantite') || header.startsWith('quantity') || ['qty', 'nombre', 'count', 'exemplaires', 'possedees', 'possedes'].includes(header);

/**
 * Reads the header line, so a file does not have to be in any particular shape to import. Nothing here is
 * authoritative - the dialog shows what was detected and lets the user repoint a column before anything is written.
 */
export function detectColumns(header: string[]): ColumnMapping {
	const headers = header.map(normalize);
	const find = (aliases: readonly string[]) => headers.findIndex(cell => aliases.includes(cell));

	return {
		code: find(HEADER_ALIASES.code),
		name: find(HEADER_ALIASES.name),
		number: find(HEADER_ALIASES.number),
		quantity: headers.map((cell, index) => (isQuantityHeader(cell) ? index : -1)).filter(index => index >= 0),
		set: find(HEADER_ALIASES.set),
	};
}

/** `004/165` -> `004`, `TG12/TG30` -> `tg12`, `SWSH039` -> `swsh039`. The denominator is the set size, never part of the identity. */
export const normalizeNumber = (value: string) => normalize(value.split('/')[0] ?? '');

/**
 * Turns the data lines into import rows. A file with no counted column is one copy per line; a file with several
 * sums them, since Pokécardex counts the normal, first-edition, reverse and special printings of a card apart.
 */
export function toImportRows(rows: string[][], columns: ColumnMapping): ImportRow[] {
	const cell = (row: string[], index: number) => (index >= 0 ? row[index] ?? '' : '');

	return rows.map(row => {
		const counted = columns.quantity.map(index => Number.parseInt(cell(row, index), 10)).filter(count => Number.isFinite(count) && count > 0);
		return {
			name: cell(row, columns.name),
			number: cell(row, columns.code) || cell(row, columns.number),
			quantity: columns.quantity.length === 0 ? 1 : counted.reduce((total, count) => total + count, 0),
			set: cell(row, columns.set),
		};
	}).filter(row => row.number.length > 0 && row.quantity > 0);
}

/**
 * Every string a set can be named by in an imported file, mapped onto the key its cards are indexed under: the
 * TCGdex id, the legacy code baked into the card codes, the printed name, and the Cardmarket/PTCGO abbreviation.
 */
export function buildSetKeys(sets: Set[], cards: Card[]): Map<string, string> {
	const keys = new Map<string, string>();
	const byTcgdexId = new Map<string, string>();
	const add = (alias: string, key: string) => {
		for (const form of [normalize(alias), tokenKey(alias)]) {
			if (form && !keys.has(form)) keys.set(form, key);
		}
	};

	for (const card of cards) {
		const legacy = parseCardCode(card.cardCode).setCode;
		if (!legacy) continue;
		add(legacy, legacy);
		if (card.setId) {
			add(card.setId, legacy);
			byTcgdexId.set(normalize(card.setId), legacy);
		}
		if (card.setName) add(card.setName, legacy);
		if (card.ptcgoCode) add(card.ptcgoCode, legacy);
	}

	// Sets carrying no card still resolve, so an unmatched line blames the missing card rather than the set.
	for (const set of sets) {
		if (set.setId) add(set.setId, normalize(set.setId));
		if (set.name && set.setId) add(set.name, normalize(set.setId));
	}

	// A French, German, Spanish, Italian or Portuguese export names its sets in that language: a Pokecardex CSV
	// says `Foudre Noire` where the catalogue says `Black Bolt`. The keys are already normalized by the generator.
	for (const langNames of Object.values(setNames)) {
		for (const [name, tcgdexId] of Object.entries(langNames)) {
			const key = byTcgdexId.get(normalize(tcgdexId));
			if (key) add(name, key);
		}
	}

	return keys;
}

/** `004` is stored as `4`, so both forms are indexed and both are looked up. */
const numberForms = (value: string) => {
	const stripped = value.replace(/^0+(?=.)/, '');
	return stripped === value ? [value] : [value, stripped];
};

/**
 * `setKey|number` -> `card_code`. A card is also filed under its parent set when its number carries a letter prefix:
 * TCGdex splits the Trainer Gallery of a set into its own `swsh10tg`, while an export lists `TG05` under the parent.
 */
export function buildCardIndex(cards: Card[]): Map<string, string> {
	const index = new Map<string, string>();
	const parents = new Map<string, string>();

	// The longest other set id this one extends, which is the set an export would have named instead.
	const setIds = [...new Set(cards.map(card => card.setId).filter((id): id is string => !!id))].sort();
	for (const setId of setIds) {
		const parent = setIds.filter(other => other !== setId && setId.startsWith(other)).sort((a, b) => b.length - a.length)[0];
		if (parent) parents.set(setId, parent);
	}
	const setKeyOf = new Map(cards.filter(card => card.setId).map(card => [card.setId!, parseCardCode(card.cardCode).setCode ?? '']));

	for (const card of cards) {
		const { cardNumber, setCode } = parseCardCode(card.cardCode);
		if (!setCode) continue;

		// Keyed on the code itself too, so a code column is validated against the catalogue instead of trusted.
		index.set(`|${card.cardCode.toLowerCase()}`, card.cardCode);

		const parentKey = card.setId ? setKeyOf.get(parents.get(card.setId) ?? '') : undefined;

		for (const raw of [cardNumber, card.localId ? normalizeNumber(card.localId) : '']) {
			if (!raw) continue;
			for (const number of numberForms(raw)) {
				const key = `${setCode}|${number}`;
				if (!index.has(key)) index.set(key, card.cardCode);
				// Only a lettered number goes up to the parent: a bare `01` would shadow the parent's own card 1.
				if (parentKey && /[a-z]/.test(number) && !index.has(`${parentKey}|${number}`)) index.set(`${parentKey}|${number}`, card.cardCode);
			}
		}
	}

	return index;
}

/**
 * The forms a set name can be written in. Pokecardex prefixes a set with its block (`HS : Triomphe` for `Triomphe`)
 * and suffixes a trainer kit with its mascot, neither of which TCGdex carries in the name.
 */
function setNameForms(value: string): string[] {
	const forms = [value];
	const afterColon = value.split(':').pop()!;
	if (afterColon !== value) forms.push(afterColon);
	const beforeParen = value.split('(')[0];
	if (beforeParen !== value) forms.push(beforeParen);
	return forms;
}

export interface ImportMatch {
	cardCode: string;
	quantity: number;
}

export interface ImportResolution {
	matched: ImportMatch[];
	unmatched: ImportRow[];
}

/**
 * Resolves rows against the catalogue. `setOverride` is the set the dialog pins when the file names none, which is
 * the normal case for a Pokécardex export: it exports one series at a time and only writes the number and the name.
 */
export function resolveRows(rows: ImportRow[], index: Map<string, string>, setKeys: Map<string, string>, setOverride?: string): ImportResolution {
	const matched = new Map<string, number>();
	const unmatched: ImportRow[] = [];
	const pinned = setOverride ? setKeys.get(normalize(setOverride)) : undefined;

	for (const row of rows) {
		// A full card code needs no set at all, which is what makes this site's own export round-trip.
		const direct = row.number.includes('_') ? index.get(`|${row.number.toLowerCase()}`) : undefined;
		const setKey = row.set ? setNameForms(row.set).flatMap(form => [setKeys.get(normalize(form)), setKeys.get(tokenKey(form))]).find(Boolean) : pinned;
		const cardCode = direct ?? (setKey ? numberForms(normalizeNumber(row.number)).map(number => index.get(`${setKey}|${number}`)).find(Boolean) : undefined);

		if (!cardCode) {
			unmatched.push(row);
			continue;
		}
		matched.set(cardCode, (matched.get(cardCode) ?? 0) + row.quantity);
	}

	return {
		matched: [...matched].map(([cardCode, quantity]) => ({ cardCode, quantity })),
		unmatched,
	};
}
