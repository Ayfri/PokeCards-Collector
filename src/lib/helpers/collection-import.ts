import { parseCardCode } from '$helpers/card-utils';
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
	const add = (alias: string, key: string) => {
		const normalized = normalize(alias);
		if (normalized && !keys.has(normalized)) keys.set(normalized, key);
	};

	for (const card of cards) {
		const legacy = parseCardCode(card.cardCode).setCode;
		if (!legacy) continue;
		add(legacy, legacy);
		if (card.setId) add(card.setId, legacy);
		if (card.setName) add(card.setName, legacy);
		if (card.ptcgoCode) add(card.ptcgoCode, legacy);
	}

	// Sets carrying no card still resolve, so an unmatched line blames the missing card rather than the set.
	for (const set of sets) {
		if (set.setId) add(set.setId, normalize(set.setId));
		if (set.name && set.setId) add(set.name, normalize(set.setId));
	}

	return keys;
}

/** `setKey|number` -> `card_code`, both the printed number and its zero-stripped form, so `004` and `4` both land. */
export function buildCardIndex(cards: Card[]): Map<string, string> {
	const index = new Map<string, string>();

	for (const card of cards) {
		const { cardNumber, setCode } = parseCardCode(card.cardCode);
		if (!setCode) continue;

		// Keyed on the code itself too, so a code column is validated against the catalogue instead of trusted.
		index.set(`|${card.cardCode.toLowerCase()}`, card.cardCode);

		for (const raw of [cardNumber, card.localId ? normalizeNumber(card.localId) : '']) {
			if (!raw) continue;
			for (const number of [raw, raw.replace(/^0+(?=.)/, '')]) {
				const key = `${setCode}|${number}`;
				if (!index.has(key)) index.set(key, card.cardCode);
			}
		}
	}

	return index;
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
		const setKey = row.set ? setKeys.get(normalize(row.set)) : pinned;
		const cardCode = direct || (setKey ? index.get(`${setKey}|${normalizeNumber(row.number)}`) : undefined);

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
