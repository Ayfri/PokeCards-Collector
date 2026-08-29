import { error, json } from '@sveltejs/kit';
import { buildCardIndex, buildSetKeys, MAX_IMPORT_ROWS, resolveRows, type ImportRow } from '$helpers/collection-import';
import { getCards, getSets } from '$helpers/supabase-data';
import type { Card, Set } from '$lib/types';
import type { RequestHandler } from './$types';

/** One row per copy, so a 99-copy card is 99 rows: the same shape `addCardToCollection` writes one at a time. */
const MAX_CARD_QUANTITY = 99;
/** Supabase rejects an oversized statement long before it rejects the payload, so the copies go up in slices. */
const INSERT_BATCH = 500;

interface ImportRequest {
	dryRun?: boolean;
	kind?: 'collection' | 'wishlist';
	rows?: ImportRow[];
	/** The set every row belongs to, for a file that names none. Any alias resolves: TCGdex id, legacy code or printed name. */
	setOverride?: string;
}

/** Rebuilt only when the weekly scrape hands back a different card array, which is once an hour at worst. */
let cached: { cards: Card[]; index: Map<string, string>; setKeys: Map<string, string> } | null = null;

function lookups(cards: Card[], sets: Set[]) {
	if (cached?.cards !== cards) cached = { cards, index: buildCardIndex(cards), setKeys: buildSetKeys(sets, cards) };
	return cached;
}

export const POST: RequestHandler = async ({ locals, request }) => {
	const username = locals.profile?.username;
	if (!username) error(401, 'You must be logged in to import cards.');

	const body = await request.json() as ImportRequest;
	const kind = body.kind === 'wishlist' ? 'wishlist' : 'collection';
	const rows = body.rows ?? [];
	if (rows.length === 0) error(400, 'The file holds no importable row.');
	if (rows.length > MAX_IMPORT_ROWS) error(413, `The file holds ${rows.length} rows, over the ${MAX_IMPORT_ROWS} limit.`);

	const [cards, sets] = await Promise.all([getCards(), getSets()]);
	const { index, setKeys } = lookups(cards, sets);
	const { matched, unmatched } = resolveRows(rows, index, setKeys, body.setOverride);

	// The rows already owned decide what is left to write, and cap a card that the file would push past 99 copies.
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
		// A wishlist holds a card once; a collection holds one row per copy, up to the same 99 the card page enforces.
		const room = kind === 'wishlist' ? (owned.has(cardCode) ? 0 : 1) : Math.max(MAX_CARD_QUANTITY - (owned.get(cardCode) ?? 0), 0);
		const toAdd = Math.min(quantity, room);
		skipped += quantity - toAdd;
		for (let copy = 0; copy < toAdd; copy++) inserts.push({ card_code: cardCode, username });
	}

	const summary = {
		added: inserts.length,
		matchedCards: matched.length,
		skipped,
		unmatched: unmatched.slice(0, 200),
		unmatchedCount: unmatched.length,
	};

	if (body.dryRun) return json(summary);

	for (let start = 0; start < inserts.length; start += INSERT_BATCH) {
		const { error: insertError } = await locals.supabase.from(kind === 'wishlist' ? 'wishlists' : 'collections').insert(inserts.slice(start, start + INSERT_BATCH));
		// A failed slice leaves the ones before it in place, so the count reported is the count actually written.
		if (insertError) return json({ ...summary, added: start, failure: insertError.message }, { status: 207 });
	}

	return json(summary);
};
