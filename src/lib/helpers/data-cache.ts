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
 * `caches` only exists in the Worker runtime, so `vite dev` skips that layer and uses the memo alone.
 */

const CACHE_ORIGIN = 'https://supabase-data.internal';

/** Cards, prices and sets only change on the daily 04:00 UTC scrape, so an hour keeps stale data short-lived. */
export const TABLE_TTL = 60 * 60;

/** The Pokédex and the type list almost never change. */
export const STATIC_TTL = 24 * 60 * 60;

interface MemoEntry {
	expires: number;
	value: unknown;
}

const memo = new Map<string, MemoEntry>();
const inFlight = new Map<string, Promise<unknown>>();

/** `caches.default` is a Workers extension the DOM `CacheStorage` type does not declare, and the global is absent under `vite dev`. */
function edgeCache(): Cache | null {
	if (typeof caches === 'undefined') return null;
	return (caches as CacheStorage & { default: Cache }).default;
}

/** Thrown by a fetch whose rows are usable but known to be incomplete (a table caught mid-rewrite). They are served once and never stored. */
export class PartialRows<Row> extends Error {
	constructor(readonly rows: Row) {
		super('Partial table read');
	}
}

async function resolve<Row, T>(key: string, ttl: number, fetchRows: () => Promise<Row>, mapRows: (rows: Row) => T): Promise<T> {
	const cache = edgeCache();
	const request = new Request(`${CACHE_ORIGIN}/${key}`);
	const stored = await cache?.match(request);

	let rows: Row;
	try {
		rows = stored ? (await stored.json() as Row) : await fetchRows();
	} catch (error) {
		if (error instanceof PartialRows) return mapRows(error.rows as Row);
		throw error;
	}

	/** A colo hit may be late in its TTL, so the memo keeps only the time left instead of restarting the clock (60 s minimum). */
	const remaining = stored ? Math.max(ttl - Number(stored.headers.get('age') ?? 0), 60) : ttl;

	if (!stored) {
		await cache?.put(request, new Response(JSON.stringify(rows), {
			headers: {
				'cache-control': `public, max-age=${ttl}`,
				'content-type': 'application/json',
			},
		}));
	}

	const value = mapRows(rows);
	memo.set(key, { expires: Date.now() + remaining * 1000, value });
	return value;
}

/** Reads `key` through the three layers, fetching the rows only when both caches miss. */
export function cachedTable<Row, T>(key: string, ttl: number, fetchRows: () => Promise<Row>, mapRows: (rows: Row) => T): Promise<T> {
	const hit = memo.get(key);
	if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value as T);

	const pending = inFlight.get(key) as Promise<T> | undefined;
	if (pending) return pending;

	const task = resolve(key, ttl, fetchRows, mapRows).finally(() => inFlight.delete(key));
	inFlight.set(key, task);
	return task;
}
