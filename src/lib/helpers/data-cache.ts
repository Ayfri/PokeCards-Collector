import { waitUntil } from 'cloudflare:workers';

/**
 * Memoization for the whole-table Supabase reads.
 *
 * The scraper Worker rewrites `cards` / `prices` / `sets` once a day, so re-reading them on every SSR render is
 * pure waste: the edge logs show ~285k REST calls a day without a cache, ~105k of them paging `cards` at ~530 ms a batch.
 *
 * Three layers, cheapest first:
 * - a module-scope map, alive as long as the isolate, holding the *mapped* app-shape value;
 * - an in-flight map, so a burst of renders on a cold isolate issues one read instead of one each;
 * - Cloudflare's Cache API, shared by every isolate in the colo, holding the *raw rows*. They go through JSON, which
 *   loses `Date` and `undefined`, so the mapping runs after the cache, not before.
 *
 * A table read with a catalogue `version` (see `catalogue_versions`) is keyed on it: the memo and the colo cache hold it until the
 * version moves or `VERSIONED_TTL` passes, so the daily sync re-reads it once and nothing else does. Without a version
 * (a missing row, or the Pokédex and type list) the plain TTL applies.
 *
 * The isolate has 128 MB, and a catalogue held twice (old and new) while it re-parses overflowed it. A refresh of a `large` table (cards, prices)
 * drops the old value before parsing the new one and waits for the large refresh before it, so only one re-parses at a time; a refresh that finds
 * another version of the same table in flight waits for it too. A cold load and a small table run at once. Memos derived from a table are
 * keyed on it with `memoizedOn`, so none of them keeps a replaced table alive.
 *
 * `caches` only exists in the Worker runtime, so `vite dev` skips that layer and uses the memo alone.
 */

const CACHE_ORIGIN = 'https://supabase-data.internal';

/** Cards, prices and sets only change on the daily 04:00 UTC scrape, so an hour keeps stale data short-lived when no version is known. */
export const TABLE_TTL = 60 * 60;

/** The Pokédex and the type list almost never change. */
export const STATIC_TTL = 24 * 60 * 60;

/** A versioned table is re-read when its version moves, and at the latest a day after the daily sync plus an hour of slack. */
const VERSIONED_TTL = 25 * 60 * 60;

/** A refresh waits at most this long for the one before it, so a stuck read cannot block every later refresh. */
const CHAIN_WAIT_MS = 20_000;

interface MemoEntry {
	expires: number;
	value: unknown;
	version: string | null;
}

const memo = new Map<string, MemoEntry>();
const inFlight = new Map<string, { task: Promise<unknown>; version: string | null }>();
/** The version each key was last asked for: a read of an older one that finishes late must not replace the newer memo. */
const requested = new Map<string, string | null>();
let refreshChain: Promise<unknown> = Promise.resolve();

/**
 * Registers a promise shared between requests with the runtime. Workers cancel a request's pending work once its response is gone, and a
 * shared promise left unsettled by that would block every later caller. Outside a request (`vite dev`, prerender) there is nothing to cancel.
 */
export function keepAlive(task: Promise<unknown>): void {
	try {
		waitUntil(task.catch(() => undefined));
	} catch {
		/** `waitUntil` throws when there is no request context. */
	}
}

/** `caches.default` is a Workers extension the DOM `CacheStorage` type does not declare, and the global is absent under `vite dev`. */
export function edgeCache(): Cache | null {
	if (typeof caches === 'undefined') return null;
	return (caches as CacheStorage & { default: Cache }).default;
}

/** Thrown by a fetch whose rows are usable but known to be incomplete (a table caught mid-rewrite). They are served once and never stored. */
export class PartialRows<Row> extends Error {
	constructor(readonly rows: Row) {
		super('Partial table read');
	}
}

async function resolve<Row, T>(key: string, ttl: number, version: string | null, fetchRows: () => Promise<Row>, mapRows: (rows: Row) => T): Promise<T> {
	const cache = edgeCache();
	const request = new Request(`${CACHE_ORIGIN}/${key}${version ? `?v=${encodeURIComponent(version)}` : ''}`);
	const stored = await cache?.match(request);

	let rows: Row;
	try {
		rows = stored ? (await stored.json() as Row) : await fetchRows();
	} catch (error) {
		if (error instanceof PartialRows) return mapRows(error.rows as Row);
		throw error;
	}

	/**
	 * A colo hit may be late in its TTL, so the memo keeps only the time left instead of restarting the clock (60 s minimum).
	 * An unversioned fetch jitters its expiry by +-10%, so the tables of one isolate do not all re-read on the same request.
	 */
	const remaining = stored ? Math.max(ttl - Number(stored.headers.get('age') ?? 0), 60) : version ? ttl : ttl * (0.9 + Math.random() * 0.2);

	if (!stored) {
		await cache?.put(request, new Response(JSON.stringify(rows), {
			headers: {
				'cache-control': `public, max-age=${ttl}`,
				'content-type': 'application/json',
			},
		}));
	}

	const value = mapRows(rows);
	if (requested.get(key) === version) memo.set(key, { expires: Date.now() + remaining * 1000, value, version });
	return value;
}

/** Resolves when `previous` settles or after `CHAIN_WAIT_MS`, whichever comes first. */
function settledOrTimedOut(previous: Promise<unknown>): Promise<unknown> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return Promise.race([previous.catch(() => undefined), new Promise(done => timer = setTimeout(done, CHAIN_WAIT_MS))]).finally(() => clearTimeout(timer));
}

/**
 * Reads `key` through the three layers, fetching the rows only when both caches miss. A memoized value of another `version` counts as a miss.
 * `large` marks the tables whose refreshes are chained one after the other (see the header).
 */
export function cachedTable<Row, T>(key: string, ttl: number, fetchRows: () => Promise<Row>, mapRows: (rows: Row) => T, version: string | null = null, large = false): Promise<T> {
	requested.set(key, version);

	const hit = memo.get(key);
	if (hit && hit.version === version && hit.expires > Date.now()) return Promise.resolve(hit.value as T);

	const pending = inFlight.get(key);
	if (pending?.version === version) return pending.task as Promise<T>;

	/** Drops the old value before the new one is parsed, so the isolate never holds both, with their `memoizedOn` entries and bodies. */
	if (hit) memo.delete(key);

	const run = () => resolve(key, version ? VERSIONED_TTL : ttl, version, fetchRows, mapRows);
	const previous = pending?.task ?? (hit && large ? refreshChain : null);
	const task: Promise<T> = (previous ? settledOrTimedOut(previous).then(run) : run()).finally(() => {
		if (inFlight.get(key)?.task === task) inFlight.delete(key);
	});

	if (large && (hit || pending)) refreshChain = task.catch(() => undefined);
	inFlight.set(key, { task, version });
	keepAlive(task);
	return task;
}
