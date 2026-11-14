import { error, redirect } from '@sveltejs/kit';
import { waitUntil } from 'cloudflare:workers';
import { getCardIndex } from '#helpers/catalogue-data.ts';
import { isLanguage } from '#helpers/catalogues.ts';
import { edgeCache } from '#helpers/data-cache.ts';
import { OG_PAGES, OG_REVISION, type OgPage, type OgTarget } from '#helpers/og-image.ts';
import { renderOgImage } from '#helpers/og-render.ts';
import type { RequestHandler } from './$types';

const isPage = (value: string): value is OgPage => (OG_PAGES as readonly string[]).includes(value);

/** The inverse of `ogPath` in `og-image.ts`: `card/en/<code>.jpg`, `set/ja/<id>.jpg`, `profile/<user>.jpg`, `page/<name>.jpg`. */
function parseTarget(path: string): OgTarget | null {
	const [kind, first, second, ...rest] = path.replace(/\.jpg$/, '').split('/');
	if (rest.length || !first) return null;
	if ((kind === 'card' || kind === 'set') && isLanguage(first) && second) return kind === 'card' ? { code: second, kind, language: first } : { kind, language: first, setId: second };
	if (second) return null;
	if (kind === 'page') return isPage(first) ? { kind, name: first } : null;
	return kind === 'collection' || kind === 'profile' || kind === 'wishlist' ? { kind, username: first } : null;
}

/**
 * What a hit answers while its `?v=` is not the one asked for and it does not render again: Discord must not pin it to the new URL.
 * Also the delay before a refresh that failed is tried again.
 */
const MISMATCH_MAX_AGE = 300;

/** A card or set image changes rarely and keeps 30 days; the others show a price move or a profile turned private within a day. */
const lifetimeSeconds = (kind: OgTarget['kind']): number => kind === 'card' || kind === 'set' ? 2_592_000 : 86_400;

/**
 * A cached image is only rendered again for another `?v=` once it is this old, which bounds the renders a forged `?v=` can cause to one per path,
 * refresh age and colo. A card or set price that lags up to 3 days is fine; a collection or profile preview, which lives a day, is redrawn within the hour.
 */
const refreshAfterMs = (kind: OgTarget['kind']): number => kind === 'card' || kind === 'set' ? 259_200_000 : 3_600_000;

/** Whether a hit asked for with another `?v=` renders again, by the rules listed on `GET`. The catalogue is read only for a scanless hit. */
async function mustRender(target: OgTarget, hit: Response): Promise<boolean> {
	if (Date.now() < Number(hit.headers.get('x-og-retry'))) return false;
	if (Date.now() - Number(hit.headers.get('x-og-at')) >= refreshAfterMs(target.kind)) return true;
	if (target.kind !== 'card' || !hit.headers.has('x-og-scanless')) return false;

	/** A failed catalogue read serves the hit, like a failed render does. */
	return getCardIndex(target.language).then(index => Boolean(index.get(target.code)?.image), () => false);
}

const withMaxAge = (response: Response, seconds: number): Response => {
	const headers = new Headers(response.headers);
	headers.set('cache-control', `public, max-age=${seconds}`);
	return new Response(response.body, { headers });
};

/**
 * A share image: one JPEG per path and `OG_REVISION` in each colo's Cache API, which is a no-op on `workers.dev` and under `vite dev`, where every
 * request renders. The rules:
 * - A `.png` path answers a 301 to its `.jpg` twin with the same query and renders nothing: pages and image indexes outside the site hold such URLs.
 * - A complete image is stored, and cached by browsers, for 30 days (card, set) or a day (page, collection, wishlist, profile).
 * - A hit asked for with no `v` or with its own `v` is served as is: an unchanged `v` costs no render for the whole life of the entry.
 * - A hit asked for with another `v` is served with a 5 minute `cache-control`, so no preview pins the old image to the new URL, unless it renders again:
 *   - it is past its refresh age, 3 days for a card or set and an hour for the others;
 *   - or it is a card drawn without its own scan and the catalogue holds one now, whatever its age.
 * - The `v` is never checked against the data. A forged one never adds an entry and costs at most one render per path and refresh age in a colo,
 *   plus one read of that language's memoized card list on a scanless hit. The put runs in `waitUntil`, so concurrent requests can each render
 *   before the entry lands.
 * - A refresh that finds nothing (the card or set is gone) deletes the entry and answers a 404.
 * - A refresh that throws, or whose image misses a scan or the fallback font, serves the hit for 5 minutes instead of a 500 or a broken image, and
 *   stores it again with `x-og-retry`: no refresh of that path starts before that time. Its render time and expiry are kept.
 * - Without a hit, an image missing a scan or the fallback font is served for a minute and not stored.
 * - A scan the CDN answers 4xx for is final: the render is complete and stored without `x-og-scanless`.
 *
 * Headers of an entry: `x-og-v` (the `?v=` it was rendered for, empty when the request had none), `x-og-at` (render time), `x-og-until` (expiry),
 * `x-og-scanless` (a card drawn without its own scan) and `x-og-retry` (the earliest time of the next refresh after a failed one).
 */
export const GET: RequestHandler = async ({ params, url }) => {
	if (url.pathname.endsWith('.png')) redirect(301, `${url.pathname.slice(0, -4)}.jpg${url.search}`);

	const target = parseTarget(params.path);
	if (!target) error(404, 'Unknown image');

	const cache = edgeCache();
	const key = new Request(`${url.origin}${url.pathname}?r=${OG_REVISION}`);
	const version = url.searchParams.get('v') ?? '';
	const hit = await cache.match(key);
	const mismatch = Boolean(hit && version && version !== hit.headers.get('x-og-v'));
	if (hit && !(mismatch && await mustRender(target, hit))) return mismatch ? withMaxAge(hit, MISMATCH_MAX_AGE) : hit;

	const rendered = await renderOgImage(target).catch((cause: unknown) => {
		if (!hit) throw cause;
		return undefined;
	});
	if (hit) {
		if (rendered === null) {
			waitUntil(cache.delete(key));
			error(404, 'Not found');
		}
		if (!rendered?.complete) {
			const remaining = Math.floor((Number(hit.headers.get('x-og-until')) - Date.now()) / 1000);
			const stale = withMaxAge(hit.clone(), MISMATCH_MAX_AGE);
			if (remaining > 0) {
				const kept = withMaxAge(hit, remaining);
				kept.headers.set('x-og-retry', String(Date.now() + MISMATCH_MAX_AGE * 1000));
				waitUntil(cache.put(key, kept));
			}
			return stale;
		}
	}
	if (!rendered) error(404, 'Not found');

	const seconds = lifetimeSeconds(target.kind);
	const response = new Response(rendered.image, {
		headers: {
			'cache-control': `public, max-age=${rendered.complete ? seconds : 60}`,
			'content-type': 'image/jpeg',
			'x-og-at': String(Date.now()),
			...(rendered.scanless && { 'x-og-scanless': '1' }),
			'x-og-until': String(Date.now() + seconds * 1000),
			'x-og-v': version,
		},
	});
	if (rendered.complete) waitUntil(cache.put(key, response.clone()));
	return response;
};
