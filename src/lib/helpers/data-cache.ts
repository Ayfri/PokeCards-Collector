/**
 * Memoization for the whole-table Supabase reads.
 *
 * The scraper Worker rewrites `cards` / `prices` / `sets` once a week, so every SSR render re-reading them is
 * pure waste: the edge logs showed ~285k REST calls a day, ~105k of them paging `cards` at ~530 ms a batch.
 *
 * Three layers, cheapest first:
 * - a module-scope map, alive for as long as the isolate is, holding the *mapped* app-shape value;
 * - an in-flight map, so a burst of concurrent renders on a cold isolate issues one read instead of one each;
 * - Cloudflare's Cache API, shared by every isolate in the colo, holding the *raw rows* (JSON round-trips, so
 *   `Date` and `undefined` must not be in there - that is why the mapping runs after the cache, not before).
 *
 * `caches` only exists in the Worker runtime, so `vite dev` transparently falls through to the memo alone.
 */

const CACHE_ORIGIN = 'https://supabase-data.internal';

/** Cards, prices and sets only move on the Monday 04:00 UTC scrape, so an hour is already short enough to never show stale data for long. */
export const TABLE_TTL = 60 * 60;

/** The Pokédex and the type list are effectively frozen. */
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

async function resolve<Row, T>(key: string, ttl: number, fetchRows: () => Promise<Row>, mapRows: (rows: Row) => T): Promise<T> {
	const cache = edgeCache();
	const request = new Request(`${CACHE_ORIGIN}/${key}`);
	const stored = await cache?.match(request);
	const rows = stored ? (await stored.json() as Row) : await fetchRows();

	// A colo hit can already be most of the way through its TTL, so the memo inherits what is left of it rather than restarting the clock.
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
