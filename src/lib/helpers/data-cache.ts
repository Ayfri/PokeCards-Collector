import { env, waitUntil } from 'cloudflare:workers';
import { type CatalogueManifest, type CatalogueObjectName, MANIFEST_KEY, type PublishedObject, type RawObject } from '#helpers/catalogue-snapshot.ts';

/**
 * Memoization for the catalogue objects the scraper side publishes to R2 (`CATALOGUE`). A `manifest.json` names the current object of each
 * table by an immutable, content-addressed key, so an object never changes under its key and a table is read again only when its key moves.
 *
 * Three layers, cheapest first:
 * - a module-scope map keyed on the object name, alive as long as the isolate and holding the *mapped* app-shape value, with no TTL: the key is the version;
 * - an in-flight map, so a burst of renders on a cold isolate issues one read instead of one each;
 * - Cloudflare's Cache API, shared by every isolate in the colo, holding the object's *gzip bytes* under its key for a day. Decompression and the
 *   mapping run after the cache, so a colo hit costs no more memory than the compressed object until it is parsed.
 *
 * The manifest is the only mutable object: an isolate asks for it at most every `MANIFEST_CHECK_MS`, through the colo cache.
 *
 * The isolate has 128 MB, and a catalogue held twice (old and new) while it re-parses overflowed it. A refresh of a `large` object (cards, prices, their
 * details and versions) drops the old value before parsing the new one and waits for the large refresh before it, so only one re-parses at a time; a
 * refresh that finds another key of the same object in flight waits for it too. A cold load and a small object run at once. Memos derived from an
 * object are keyed on it with `memoizedOn`, so none of them keeps a replaced object alive.
 *
 * No read retries, in any layer: one attempt per layer, then the failure reaches the page. Retries from every colo turned a slow database into an
 * outage, and a failed manifest refresh keeps serving the previous snapshot instead.
 */

export const CACHE_ORIGIN = 'https://catalogue.internal';

/** A refresh waits at most this long for the one before it, so a stuck read cannot block every later refresh. */
const CHAIN_WAIT_MS = 20_000;

/** An isolate trusts its manifest this long, and the colo cache holds it the same time, so a publish reaches every isolate within about twice this delay. */
const MANIFEST_CHECK_MS = 5 * 60_000;
const MANIFEST_READ_MS = 3000;

/** An object read that takes longer than this is hung, not slow: it would otherwise hold every caller of that object through `inFlight`. */
const OBJECT_READ_MS = 20_000;

/** An object key never changes its content, so the colo can keep it for as long as it likes. */
const OBJECT_MAX_AGE = 86_400;

interface MemoEntry {
	key: string;
	value: unknown;
}

const memo = new Map<CatalogueObjectName, MemoEntry>();
const inFlight = new Map<CatalogueObjectName, { key: string; task: Promise<unknown> }>();
/** The key each name was last asked for: a read of an older one that finishes late must not replace the newer memo. */
const requested = new Map<CatalogueObjectName, string>();
let refreshChain: Promise<unknown> = Promise.resolve();

/** `expires` moves on a failed refresh and on an object miss, but `value` stays: it is the fallback of the next failed refresh. */
let manifest: { expires: number; value: CatalogueManifest } | null = null;
let manifestInFlight: Promise<CatalogueManifest> | null = null;

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

/**
 * `caches.default` is a Workers extension the DOM `CacheStorage` type does not declare. Under `vite dev` the adapter defines `caches` from
 * wrangler's platform proxy, a cache where every `match` misses and every `put` is dropped, so dev reads R2 each time and the memo is the only layer.
 */
export function edgeCache(): Cache {
	return (caches as CacheStorage & { default: Cache }).default;
}

/** Rejects after `ms`. The losing read keeps running, since neither R2 nor the Cache API can abort one. */
function deadline<T>(task: Promise<T>, ms: number, what: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return Promise.race([task, new Promise<never>((_, reject) => timer = setTimeout(() => reject(new Error(`${what} took more than ${ms} ms`)), ms))]).finally(() => clearTimeout(timer));
}

/**
 * A colo cache entry that fails to read would fail every request of the colo until it expires: it is deleted and the read falls through to R2.
 * Each layer is tried once.
 */
function dropBroken(cache: Cache, request: Request, cause: unknown): void {
	console.warn(`Dropping the unreadable colo cache entry ${request.url}:`, cause);
	keepAlive(cache.delete(request));
}

async function readManifest(): Promise<CatalogueManifest> {
	try {
		const cache = edgeCache();
		const request = new Request(`${CACHE_ORIGIN}/${MANIFEST_KEY}`);
		const stored = await cache.match(request).catch(() => undefined);
		if (stored) {
			try {
				return setManifest(await stored.json<CatalogueManifest>());
			} catch (cause) {
				dropBroken(cache, request, cause);
			}
		}

		const text = await deadline((async () => (await env.CATALOGUE.get(MANIFEST_KEY))?.text())(), MANIFEST_READ_MS, `Reading ${MANIFEST_KEY}`);
		if (text === undefined) throw new Error('No catalogue manifest in R2: run `bun run scrapers publish`');

		keepAlive(cache.put(request, new Response(text, { headers: { 'cache-control': `public, max-age=${MANIFEST_CHECK_MS / 1000}`, 'content-type': 'application/json' } })));
		return setManifest(JSON.parse(text) as CatalogueManifest);
	} catch (cause) {
		if (!manifest) throw cause;

		console.warn(`Failed to read ${MANIFEST_KEY}, keeping the previous snapshot:`, cause);
		manifest.expires = Date.now() + MANIFEST_CHECK_MS;
		return manifest.value;
	}
}

/**
 * Keeps the newer of the held manifest and `value` by `publishedAt` (ISO strings sort in time order). The colo cache can hand back an older
 * manifest than the isolate already holds, when two isolates' `cache.put` land in inverted order.
 */
function setManifest(value: CatalogueManifest): CatalogueManifest {
	const newest = manifest && manifest.value.publishedAt > value.publishedAt ? manifest.value : value;
	manifest = { expires: Date.now() + MANIFEST_CHECK_MS, value: newest };
	return newest;
}

/** The objects the catalogue is made of right now. One read per isolate every `MANIFEST_CHECK_MS`, shared by every caller. */
export async function catalogueManifest(): Promise<CatalogueManifest> {
	if (manifest && manifest.expires > Date.now()) return manifest.value;

	if (!manifestInFlight) {
		manifestInFlight = readManifest().finally(() => manifestInFlight = null);
		keepAlive(manifestInFlight);
	}
	return manifestInFlight;
}

/** The manifest entry of `name`: the one lookup `catalogueObject` and the row counts share. */
export async function manifestObject(name: CatalogueObjectName): Promise<PublishedObject> {
	const published = (await catalogueManifest()).objects[name];
	if (!published) throw new Error(`The catalogue manifest has no ${name} object`);
	return published;
}

const inflate = <T>(blob: Blob): Promise<T> => new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).json<T>();

/** The gzip bytes come from the colo cache, else from R2 and then into the colo cache; the JSON is parsed from them either way. */
async function readObject<T>(key: string): Promise<T> {
	const cache = edgeCache();
	const request = new Request(`${CACHE_ORIGIN}/${key}`);
	const stored = await cache.match(request).catch(() => undefined);

	if (stored) {
		try {
			return await inflate<T>(await stored.blob());
		} catch (cause) {
			dropBroken(cache, request, cause);
		}
	}

	const blob = await deadline((async () => (await env.CATALOGUE.get(key))?.blob())(), OBJECT_READ_MS, `Reading ${key}`);
	if (!blob) {
		/** A publish moved on and the grace period of this key ended: the next request asks for the manifest again instead of waiting for its expiry. */
		if (manifest) manifest.expires = 0;
		throw new Error(`${key} is not in the catalogue bucket`);
	}

	keepAlive(cache.put(request, new Response(blob, { headers: { 'cache-control': `public, max-age=${OBJECT_MAX_AGE}`, 'content-type': 'application/gzip' } })));
	return inflate<T>(blob);
}

/**
 * Reads the object `name` through the three layers, fetching it only when the memo and the colo cache miss. A memoized value of another key counts
 * as a miss. `large` marks the objects whose refreshes are chained one after the other (see the header). `map` turns the parsed JSON into the app shape.
 */
export async function catalogueObject<N extends CatalogueObjectName, T>(name: N, map: (raw: RawObject<N>) => T, large = false): Promise<T> {
	const { key } = await manifestObject(name);
	requested.set(name, key);

	const hit = memo.get(name);
	if (hit?.key === key) return hit.value as T;

	const pending = inFlight.get(name);
	if (pending?.key === key) return pending.task as Promise<T>;

	/** Drops the old value before the new one is parsed, so the isolate never holds both, with their `memoizedOn` entries and bodies. */
	if (hit) memo.delete(name);

	const run = async (): Promise<T> => {
		const value = map(await readObject<RawObject<N>>(key));
		if (requested.get(name) === key) memo.set(name, { key, value });
		return value;
	};

	const previous = pending?.task ?? (hit && large ? refreshChain : null);
	/** The wait ends when `previous` settles or after `CHAIN_WAIT_MS`: a failed or stuck one never blocks this refresh. */
	const waited = previous ? deadline(previous.catch(() => undefined), CHAIN_WAIT_MS, 'Waiting for the previous refresh').catch(() => undefined) : null;
	const task: Promise<T> = (waited ? waited.then(run) : run()).finally(() => {
		if (inFlight.get(name)?.task === task) inFlight.delete(name);
	});

	if (large && (hit || pending)) refreshChain = task.catch(() => undefined);
	inFlight.set(name, { key, task });
	keepAlive(task);
	return task;
}
