import { error } from '@sveltejs/kit';
import { type Language, LANGUAGES } from '#helpers/catalogues.ts';
import { buildCardIndex, buildSetKeys, type ImportLookups, type ImportRow, MAX_IMPORT_ROWS, resolveRows } from '#helpers/collection-import.ts';
import { getCards, getSets } from '#helpers/catalogue-data.ts';
import { memoizedOn } from '#helpers/card-utils.ts';
import { MAX_CARD_QUANTITY } from '#src/constants.ts';
import type { RequestHandler } from './$types';

/** Supabase rejects an oversized statement well before the payload gets too big, so the copies are inserted in slices. */
const INSERT_BATCH = 500;

interface ImportRequest {
	dryRun?: boolean;
	kind?: 'collection' | 'wishlist';
	rows?: ImportRow[];
	/** The set every row belongs to, for a file that names none. Any alias works: TCGdex id, legacy code or printed name. */
	setOverride?: string;
}

const lookupMemo = new WeakMap<object, unknown>();

/** Memoized on the card and set tables, so a refreshed table rebuilds the lookups and the old ones go with it (rule 2). */
async function lookups(language: Language): Promise<ImportLookups> {
	const [cards, sets, englishSets] = await Promise.all([getCards(language), getSets(language), getSets('en')]);
	/** The English sets are included so a French line that names its set in English still finds the French card. */
	return memoizedOn(lookupMemo, [cards, sets, englishSets], () => ({ index: buildCardIndex(cards), setKeys: buildSetKeys(language === 'fr' ? [...sets, ...englishSets] : sets, cards) }));
}

export const POST: RequestHandler = async ({ locals, request }) => {
	const username = locals.profile?.username;
	if (!username) error(401, 'You must be logged in to import cards.');

	const body = await request.json() as ImportRequest;
	const kind = body.kind === 'wishlist' ? 'wishlist' : 'collection';
	const rows = (body.rows ?? []).map(row => ({ ...row, language: LANGUAGES.includes(row.language) ? row.language : 'en' }));
	if (rows.length === 0) error(400, 'The file holds no importable row.');
	if (rows.length > MAX_IMPORT_ROWS) error(413, `The file holds ${rows.length} rows, over the ${MAX_IMPORT_ROWS} limit.`);

	const [en, fr, ja] = await Promise.all([lookups('en'), lookups('fr'), lookups('ja')]);
	const { matched, unmatched } = resolveRows(rows, { en, fr, ja }, body.setOverride);

	/** The rows already owned decide what is left to write, so a card never goes past 99 copies. */
	const { data: existing, error: readError } = await locals.supabase
		.from(kind === 'wishlist' ? 'wishlists' : 'collections')
		.select('card_code')
		.eq('username', username);

	if (readError) error(500, `Could not read your ${kind}: ${readError.message}`);

	const owned = new Map<string, number>();
	for (const row of existing ?? []) owned.set(row.card_code, (owned.get(row.card_code) ?? 0) + 1);

	const inserts: { card_code: string; username: string }[] = [];
	let skipped = 0;

	for (const { cardCode, quantity } of matched) {
		/** A wishlist holds a card once. A collection holds one row per copy, up to the same 99 the card page enforces. */
		const room = kind === 'wishlist' ? (owned.has(cardCode) ? 0 : 1) : Math.max(MAX_CARD_QUANTITY - (owned.get(cardCode) ?? 0), 0);
		const toAdd = Math.min(quantity, room);
		skipped += quantity - toAdd;
		for (let copy = 0; copy < toAdd; copy++) inserts.push({ card_code: cardCode, username });
	}

	/** Unmatched rows are grouped by set: 200 raw lines say little, while "Trick or Trade 2023, 23 cards" shows the set is missing. */
	const bySet = new Map<string, number>();
	for (const row of unmatched) bySet.set(row.set || row.number, (bySet.get(row.set || row.number) ?? 0) + 1);

	const matchedByLanguage: Record<Language, number> = { en: 0, fr: 0, ja: 0 };
	for (const { language } of matched) matchedByLanguage[language]++;

	const summary = {
		added: inserts.length,
		matchedByLanguage,
		matchedCards: matched.length,
		skipped,
		unmatchedBySet: [...bySet].sort(([, a], [, b]) => b - a).slice(0, 25).map(([set, count]) => ({ count, set })),
		unmatchedCount: unmatched.length,
	};

	if (body.dryRun) return Response.json(summary);

	for (let start = 0; start < inserts.length; start += INSERT_BATCH) {
		const { error: insertError } = await locals.supabase.from(kind === 'wishlist' ? 'wishlists' : 'collections').insert(inserts.slice(start, start + INSERT_BATCH));
		/** A failed slice leaves the earlier ones written, so `added: start` is the real count of rows saved. */
		if (insertError) return Response.json({ ...summary, added: start, failure: insertError.message }, { status: 207 });
	}

	return Response.json(summary);
};
